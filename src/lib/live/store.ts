/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/providers/live_timing_provider.dart
 * (LiveTimingNotifier). This is the core real-time state machine: WS message
 * dispatch, REST bootstrap, session-change detection, steward-status
 * derivation, and the client-side DVR/playback buffer (100ms ticker, 15-min
 * rolling buffer, pause/delay/catch-up replay — see the "Playback buffer"
 * section below).
 *
 * Deliberately NOT ported in this pass:
 * - Debug telemetry seeding (kDebugMode-only in the Flutter app, not needed
 *   for a real deployment).
 */
import { create } from "zustand";
import { config } from "@/lib/config";
import { LiveWebSocketClient, type WsConnectionState } from "./websocket-client";
import * as liveApi from "@/lib/api/live-api";
import {
  type LiveSnapshot,
  type LeaderboardEntry,
  type SessionInfo,
  type RaceControlMessage,
  type TeamRadioMessage,
  type TyreStint,
  type TrackPoint,
  type PositionSample,
  type TelemetrySample,
  type LapRecord,
  type DriverSteward,
  type StewardState,
  type FastestLapEvent,
  emptyLiveSnapshot,
  leaderboardEntryFromJson,
  sessionInfoFromJson,
  weatherDataFromJson,
  trackStatusFromJson,
  raceControlFromWsJson,
  raceControlFromRestJson,
  extrapolatedClockFromJson,
  carTelemetryFromChannels,
  telemetrySampleFromChannels,
  pitStopFromJson,
  teamRadioFromWsJson,
  teamRadioFromRestJson,
  tyreStintFromJson,
  tyreStintFromRestJson,
  audioStreamsFromJson,
  clearTrackStatus,
  noSteward,
  fastestLapEventId,
  formattedLapTime,
} from "@/lib/models/live";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const POSITION_HISTORY_CAP = 20;
const TELEMETRY_HISTORY_CAP = 900;

// ── Fastest-lap one-shot event bus (deliberately outside Zustand state —
// it's a transient signal, not persistent state, and must never re-fire on
// a rerender the way a state field would if a component remounted). ───────
type FastestLapListener = (e: FastestLapEvent) => void;
const fastestLapListeners = new Set<FastestLapListener>();
let lastFastestLapKey: string | null = null;

export function onFastestLap(listener: FastestLapListener): () => void {
  fastestLapListeners.add(listener);
  return () => fastestLapListeners.delete(listener);
}

function emitFastestLap(entry: LeaderboardEntry) {
  const event: FastestLapEvent = {
    driverNumber: entry.driverNumber,
    driverName: entry.name,
    shortName: entry.shortName,
    lapTime: formattedLapTime(entry.lastLapTime),
    teamColorHex: entry.teamColor,
    lapNumber: entry.lapNumber,
  };
  const id = fastestLapEventId(event);
  if (id === lastFastestLapKey) return;
  lastFastestLapKey = id;
  for (const l of fastestLapListeners) l(event);
}

interface LiveTimingState extends LiveSnapshot {
  debugInfo: string | null;
}

interface LiveTimingActions {
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  forceRefresh: () => Promise<void>;
  onSessionEnded: () => void;
  /** Shifts the displayed feed behind wall-clock by delayMs — e.g. to match a broadcast stream's own lag. 0 = fully live. */
  setPlaybackDelay: (delayMs: number) => void;
  pausePlayback: () => void;
  /** Resumes from a pause — the backlog that built up while paused plays back at CATCH_UP_MULTIPLIER x until caught up. */
  resumePlayback: () => void;
  /** Clears any delay/pause and jumps straight to wall-clock live, dropping the buffered backlog instead of playing through it. */
  skipToLive: () => void;
}

export const useLiveTimingStore = create<LiveTimingState & LiveTimingActions>()(
  (set, get) => {
    const ws = new LiveWebSocketClient();

    // ── Non-reactive bookkeeping (mirrors instance fields on LiveTimingNotifier) ──
    let bootstrapTimer: ReturnType<typeof setTimeout> | null = null;
    let radioPollTimer: ReturnType<typeof setInterval> | null = null;
    let sessionPollTimer: ReturnType<typeof setInterval> | null = null;
    const trackCells = new Set<string>();
    let started = false;

    // ── Playback buffer (client-side DVR) — mirrors LiveTimingNotifier's
    // _buffer/_playhead/_playbackDelay/_paused instance fields. ─────────────
    const playbackBuffer: { receivedAt: number; msg: Json }[] = [];
    let playhead: number | null = null;
    let playbackDelayMs = 0;
    let paused = false;
    let playbackTicker: ReturnType<typeof setInterval> | null = null;
    const TICK_INTERVAL_MS = 100;
    const CATCH_UP_MULTIPLIER = 6;
    const MAX_BUFFER_WINDOW_MS = 15 * 60 * 1000;

    // ── Small helpers (ported 1:1 from the Dart private helpers) ───────────

    function toIntOrNull(v: unknown): number | null {
      if (v == null) return null;
      if (typeof v === "number") return Math.trunc(v);
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? null : n;
    }

    function parseSeconds(value: string | null | undefined): number | null {
      if (!value) return null;
      const parts = value.split(":");
      if (parts.length === 2) {
        const m = parseFloat(parts[0]);
        const s = parseFloat(parts[1]);
        if (Number.isNaN(m) || Number.isNaN(s)) return null;
        return m * 60 + s;
      }
      const n = parseFloat(value);
      return Number.isNaN(n) ? null : n;
    }

    function extractInterval(raw: Json): string | null {
      if (raw == null) return null;
      if (typeof raw === "object") return raw.Value?.toString() ?? "";
      return String(raw);
    }

    /** 3 = overall fastest (purple), 2 = personal best (green), else existing. */
    function lapTimeStatus(lapTimeMap: Json, existing: number): number {
      if (lapTimeMap == null) return existing;
      if (lapTimeMap.OverallFastest === true) return 3;
      if (lapTimeMap.PersonalFastest === true) return 2;
      if (lapTimeMap.Value != null) return 0;
      return existing;
    }

    function mergeSectors(existing: (number | null)[], update: Json): (number | null)[] {
      if (update == null) return existing;
      const result = [...existing];
      for (let i = 0; i < 3; i++) {
        const v = update[String(i)]?.Value;
        if (v != null) result[i] = parseFloat(v) || null;
      }
      return result;
    }

    function mergeSectorStatus(existing: number[], update: Json): number[] {
      if (update == null) return existing;
      const result = [...existing];
      for (let i = 0; i < 3; i++) {
        const sector = update[String(i)];
        if (sector == null) continue;
        if (sector.Value != null) {
          result[i] = sector.OverallFastest === true ? 3 : sector.PersonalFastest === true ? 2 : 1;
        }
      }
      return result;
    }

    function mergeSegmentStatus(existing: number[][], update: Json): number[][] {
      if (update == null) return existing;
      const result = [0, 1, 2].map((i) => [...(existing[i] ?? [])]);
      for (let i = 0; i < 3; i++) {
        const sector = update[String(i)];
        const segs = sector?.Segments;
        if (segs == null) continue;
        for (const [key, val] of Object.entries(segs as Json)) {
          const idx = parseInt(key, 10);
          if (Number.isNaN(idx)) continue;
          const status = (val as Json)?.Status ?? 0;
          while (result[i].length <= idx) result[i].push(0);
          result[i][idx] = status;
        }
      }
      return result;
    }

    function parseStintsList(raw: Json): TyreStint[] {
      if (Array.isArray(raw)) return raw.map(tyreStintFromJson);
      if (raw && typeof raw === "object") {
        return Object.keys(raw)
          .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
          .map((k) => raw[k])
          .filter((v) => v && typeof v === "object")
          .map(tyreStintFromJson);
      }
      return [];
    }

    const rcKey = (m: RaceControlMessage) => `${m.utc.slice(0, 19)}|${m.message}`;

    /** Extracts a race+session slug from an F1 CDN team-radio URL to detect cross-session leakage. */
    function radioSessionSlug(url: string): string {
      const marker = "/TeamRadio/";
      const ti = url.indexOf(marker);
      if (ti < 0) return "";
      const parts = url.slice(0, ti).split("/");
      if (parts.length < 2) return "";
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }

    function purgeStaleRadio(existing: TeamRadioMessage[], incoming: TeamRadioMessage[]): TeamRadioMessage[] {
      const incomingSlugs = new Set(
        incoming.map((m) => radioSessionSlug(m.recordingUrl)).filter((s) => s.length > 0),
      );
      if (incomingSlugs.size === 0) return existing;
      return existing.filter((m) => {
        const slug = radioSessionSlug(m.recordingUrl);
        return slug === "" || incomingSlugs.has(slug);
      });
    }

    function shortStewardSummary(raw: string, penalty: boolean): string {
      const clean = raw
        .replace(/CAR\s*\d+\s*\([A-Z]{3}\)\s*-?\s*/gi, "")
        .replace(/FIA STEWARDS:\s*/gi, "")
        .trim();
      const prefix = penalty ? "Penalty" : "Under investigation";
      return clean ? `${prefix} · ${clean}` : prefix;
    }

    /** Rebuilt from scratch every call from the full RC history (newest-first) so late REST bootstraps converge. */
    function deriveStewardStatuses(messages: RaceControlMessage[]): Record<number, DriverSteward> {
      const ordered = [...messages].reverse(); // oldest -> newest
      const result: Record<number, DriverSteward> = {};
      const carRe = /(\d+)\s*\(([A-Z]{3})\)/g;

      for (const m of ordered) {
        const upper = m.message.toUpperCase();
        const looksSteward =
          upper.includes("INVESTIGATION") ||
          upper.includes("INVESTIGATED") ||
          upper.includes("PENALTY") ||
          upper.includes("NO FURTHER ACTION") ||
          upper.includes("NOTED");
        if (!looksSteward) continue;

        const driverNums = new Set<number>();
        for (const match of upper.matchAll(carRe)) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n)) driverNums.add(n);
        }
        if (driverNums.size === 0 && m.driverNumber != null) driverNums.add(m.driverNumber);
        if (driverNums.size === 0) continue;

        const isPenaltyServed = upper.includes("PENALTY SERVED") || /PENALTY\b.*\bSERVED/.test(upper);
        const isClearInvestigation =
          upper.includes("NO FURTHER ACTION") || upper.includes("NO FURTHER INVESTIGATION");
        const isPenalty = upper.includes("PENALTY") && !isPenaltyServed;
        const isInvestigation = upper.includes("UNDER INVESTIGATION") || upper.includes("WILL BE INVESTIGATED");

        for (const dn of driverNums) {
          if (isPenaltyServed) {
            result[dn] = noSteward;
          } else if (isClearInvestigation) {
            const prev = result[dn];
            if (!prev || prev.state === "underInvestigation") result[dn] = noSteward;
          } else if (isPenalty) {
            result[dn] = {
              state: "penalty" as StewardState,
              summary: shortStewardSummary(m.message, true),
              sourceMessage: m.message,
            };
          } else if (isInvestigation) {
            const prev = result[dn];
            if (!prev || prev.state !== "penalty") {
              result[dn] = {
                state: "underInvestigation" as StewardState,
                summary: shortStewardSummary(m.message, false),
                sourceMessage: m.message,
              };
            }
          }
        }
      }

      for (const key of Object.keys(result)) {
        if (result[Number(key)].state === "none") delete result[Number(key)];
      }
      return result;
    }

    /**
     * Captures the starting grid the first time we see the leaderboard in a
     * Race/Sprint session before racing has begun (currentLap still null —
     * TimingData.Position only reflects the true grid slot pre-lights-out).
     */
    function maybeCaptureGrid(lb: Record<string, LeaderboardEntry>): Record<number, number> | null {
      const state = get();
      if (Object.keys(state.gridPositions).length > 0) return null;
      const type = state.sessionInfo?.type.toLowerCase() ?? "";
      if (type !== "race" && type !== "sprint") return null;
      if (state.currentLap != null) return null;
      if (Object.keys(lb).length === 0) return null;
      const grid: Record<number, number> = {};
      for (const e of Object.values(lb)) {
        if (e.driverNumber > 0) grid[e.driverNumber] = e.position;
      }
      return grid;
    }

    // ── REST bootstrap ──────────────────────────────────────────────────────

    async function bootstrapOnce(): Promise<void> {
      const state = get();
      const hasRealEntries = Object.values(state.leaderboard).some((e) => e.name || e.team);
      if (hasRealEntries) return;

      try {
        set({ debugInfo: "Fetching leaderboard…" });
        const list = await liveApi.getLeaderboard();

        if (list.length === 0) {
          set({ debugInfo: "Server returned 0 entries" });
        } else {
          const entries = list.map(leaderboardEntryFromJson);
          const lb: Record<string, LeaderboardEntry> = {};
          for (const e of entries) lb[String(e.driverNumber)] = e;

          const grid: Record<number, number> = {};
          for (const j of list) {
            const dn = toIntOrNull(j.driverNumber);
            const gp = toIntOrNull(j.gridPosition);
            if (dn && dn > 0 && gp && gp > 0) grid[dn] = gp;
          }
          set({
            leaderboard: lb,
            debugInfo: null,
            gridPositions: Object.keys(grid).length > 0 ? grid : get().gridPositions,
          });

          bootstrapClock();
          bootstrapSessionInfo();
          bootstrapRaceControl();
          bootstrapPitStops();
          bootstrapTeamRadio();
          bootstrapStints();
          startRadioPoller();
          startSessionPoller();
          return;
        }
      } catch (e) {
        set({ debugInfo: `REST error: ${e instanceof Error ? e.message : String(e)}` });
      }

      if (Object.keys(get().leaderboard).length === 0) {
        bootstrapTimer = setTimeout(bootstrapOnce, 5000);
      }
    }

    async function bootstrapClock(): Promise<void> {
      try {
        const clock = await liveApi.getClock();
        if (clock && get().clock == null) set({ clock: extrapolatedClockFromJson(clock) });
      } catch {}
    }

    /** Bounded wait for the WS-delivered SessionInfo — REST /api/sessions can lag hours behind a just-started session. */
    async function waitForWsSessionInfo(): Promise<void> {
      for (let i = 0; i < 16 && get().sessionInfo == null; i++) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    function pickRelevantSession(sessions: Json[]): Json | null {
      return sessions.length > 0 ? sessions[sessions.length - 1] : null;
    }

    function sessionInfoFromRestRow(pick: Json): SessionInfo {
      return {
        key: toIntOrNull(pick.session_key) ?? 0,
        name: pick.session_name?.toString() ?? "",
        type: pick.session_type?.toString() ?? "",
        startDate: pick.date_start?.toString() ?? null,
        meetingName: pick.meeting_name?.toString() ?? pick.location?.toString() ?? "",
        officialName: pick.meeting_name?.toString() ?? "",
        location: pick.location?.toString() ?? "",
        country: pick.country_name?.toString() ?? "",
      };
    }

    async function bootstrapSessionInfo(): Promise<void> {
      if (get().sessionInfo != null) return;
      await waitForWsSessionInfo();
      if (get().sessionInfo != null) return;
      try {
        const sessions = await liveApi.getSessions();
        if (sessions.length === 0) return;
        const pick = pickRelevantSession(sessions);
        if (!pick) return;
        set({ sessionInfo: sessionInfoFromRestRow(pick) });
      } catch {}
    }

    async function resolveSessionKey(): Promise<number | null> {
      let key = get().sessionInfo?.key;
      if (key) return key;
      await waitForWsSessionInfo();
      key = get().sessionInfo?.key;
      if (key) return key;
      try {
        const sessions = await liveApi.getSessions();
        if (sessions.length > 0) return toIntOrNull(sessions[sessions.length - 1].session_key);
      } catch {}
      return null;
    }

    async function bootstrapRaceControl(): Promise<void> {
      if (get().raceControl.length > 0) return;
      try {
        const sessionKey = await resolveSessionKey();
        if (sessionKey == null) return;
        const msgs = await liveApi.getRaceControl(sessionKey);
        if (get().raceControl.length === 0 && msgs.length > 0) {
          const seen = new Set<string>();
          const deduped: RaceControlMessage[] = [];
          for (const m of msgs) {
            const parsed = raceControlFromRestJson(m);
            const k = rcKey(parsed);
            if (!seen.has(k)) {
              seen.add(k);
              deduped.push(parsed);
            }
          }
          const updated = [...deduped].reverse();
          set({ raceControl: updated, stewardStatuses: deriveStewardStatuses(updated) });
        }
      } catch {}
    }

    async function bootstrapPitStops(): Promise<void> {
      if (get().pitStops.length > 0) return;
      try {
        const sessionKey = await resolveSessionKey();
        if (sessionKey == null) return;
        const raw = await liveApi.getPitStops(sessionKey);
        if (raw.length === 0) return;
        const stops = raw.map(pitStopFromJson).reverse();
        set({ pitStops: stops });
      } catch {}
    }

    async function fetchAndMergeTeamRadio(): Promise<void> {
      try {
        const sessionKey = await resolveSessionKey();
        if (sessionKey == null) return;
        const raw = await liveApi.getTeamRadio(sessionKey);
        if (raw.length === 0) return;
        const incoming = raw.map(teamRadioFromRestJson);
        const state = get();
        const purged = purgeStaleRadio(state.teamRadio, incoming);
        const existingUrls = new Set(purged.map((m) => m.recordingUrl));
        const newMsgs = incoming.filter((m) => !existingUrls.has(m.recordingUrl));
        if (newMsgs.length === 0 && purged.length === state.teamRadio.length) return;
        const updated = [...[...newMsgs].reverse(), ...purged].slice(0, 40);
        set({ teamRadio: updated });
      } catch {}
    }
    const bootstrapTeamRadio = fetchAndMergeTeamRadio;

    function startRadioPoller(): void {
      if (radioPollTimer) clearInterval(radioPollTimer);
      radioPollTimer = setInterval(fetchAndMergeTeamRadio, 30_000);
    }

    async function bootstrapStints(): Promise<void> {
      try {
        const sessionKey = await resolveSessionKey();
        if (sessionKey == null) return;
        const raw = await liveApi.getStints(sessionKey);
        if (raw.length === 0) return;

        const byDriver = new Map<number, TyreStint[]>();
        for (const j of raw) {
          const dn = toIntOrNull(j.driver_number) ?? 0;
          if (dn === 0) continue;
          if (!byDriver.has(dn)) byDriver.set(dn, []);
          byDriver.get(dn)!.push(tyreStintFromRestJson(j));
        }
        if (byDriver.size === 0) return;

        const updated = { ...get().leaderboard };
        let changed = false;
        for (const [dn, stints] of byDriver) {
          const key = String(dn);
          const ex = updated[key];
          if (!ex) continue;
          stints.sort((a, b) => a.startLap - b.startLap);
          const currentTyre = stints.length > 0 ? stints[stints.length - 1].compound : ex.tyre;
          updated[key] = { ...ex, stints, tyre: currentTyre };
          changed = true;
        }
        if (changed) set({ leaderboard: updated });
      } catch {}
    }

    // ── Session-change polling ──────────────────────────────────────────────

    function startSessionPoller(): void {
      if (sessionPollTimer) clearInterval(sessionPollTimer);
      sessionPollTimer = setInterval(checkSessionChanged, 30_000);
    }

    function escalateSessionPoll(): void {
      if (sessionPollTimer) clearInterval(sessionPollTimer);
      sessionPollTimer = setInterval(checkSessionChanged, 10_000);
    }

    async function checkSessionChanged(): Promise<void> {
      try {
        const sessions = await liveApi.getSessions();
        if (sessions.length === 0) return;
        const pick = pickRelevantSession(sessions);
        if (!pick) return;

        const newKey = toIntOrNull(pick.session_key) ?? 0;
        const newName = pick.session_name?.toString() ?? "";
        const newType = pick.session_type?.toString() ?? "";
        const newStart = pick.date_start?.toString() ?? null;

        const state = get();
        const currentKey = state.sessionInfo?.key ?? 0;
        const currentName = state.sessionInfo?.name ?? "";
        const currentType = state.sessionInfo?.type ?? "";
        const currentStart = state.sessionInfo?.startDate ?? null;

        // Don't switch backwards in time.
        if (currentStart && newStart) {
          const a = new Date(currentStart).getTime();
          const b = new Date(newStart).getTime();
          if (!Number.isNaN(a) && !Number.isNaN(b) && b < a) return;
        }

        const keyChanged = newKey !== 0 && newKey !== currentKey;
        const nameChanged = newName !== "" && newName !== currentName;
        const typeChanged = newType !== "" && newType !== currentType;
        if (!keyChanged && !nameChanged && !typeChanged) return;

        resetPlaybackBuffer();
        const info = sessionInfoFromRestRow(pick);
        set({
          sessionInfo: info,
          audioStreams: [],
          raceControl: [],
          pitStops: [],
          teamRadio: [],
          leaderboard: {},
          qualifyingPart: null,
          gridPositions: {},
        });
        await bootstrapOnce();
      } catch {}
    }

    // ── WS message dispatch ─────────────────────────────────────────────────

    function handleMessage(msg: Json): void {
      const type = msg.type as string | undefined;
      if (type === undefined) {
        applyInitialSnapshot(msg);
        return;
      }
      const rawData = msg.data;
      const data: Json = rawData && typeof rawData === "object" && !Array.isArray(rawData) ? rawData : {};

      switch (type) {
        case "SessionInfo":
          applySessionInfo(data);
          break;
        case "TimingData":
          applyTimingData(data);
          break;
        case "WeatherData":
          set({ weather: weatherDataFromJson(data) });
          break;
        case "TrackStatus":
          set({ trackStatus: trackStatusFromJson(data) });
          break;
        case "RaceControlMessages":
          applyRaceControl(data);
          break;
        case "ExtrapolatedClock":
          set({ clock: extrapolatedClockFromJson(data) });
          break;
        case "CarData":
          applyCarData(data);
          break;
        case "LapCount": {
          const cur = toIntOrNull(data.CurrentLap);
          const tot = toIntOrNull(data.TotalLaps);
          if (cur != null || tot != null) {
            set({ currentLap: cur ?? get().currentLap, totalLaps: tot ?? get().totalLaps });
          }
          break;
        }
        case "Position":
          applyPositions(rawData);
          break;
        case "NewTeamRadio":
          applyTeamRadio(data);
          break;
        case "TimingAppData":
          applyTimingAppData(data);
          break;
        case "NewPitStop":
          applyNewPitStop(data);
          break;
        case "TeamRadioTranscript":
          applyTeamRadioTranscript(data);
          break;
        case "SessionStatus":
          applySessionStatus(data);
          break;
        case "AudioStreams":
          set({ audioStreams: audioStreamsFromJson(data) });
          break;
      }
    }

    // ── Initial snapshot ────────────────────────────────────────────────────

    function applyInitialSnapshot(snap: Json): void {
      const previousSession = get().sessionInfo;
      const previousSessionKey = previousSession?.key ?? 0;
      const snapshotSessionInfo = snap.SessionInfo ? sessionInfoFromJson(snap.SessionInfo) : null;
      const snapshotSessionKey = snapshotSessionInfo?.key ?? 0;
      const keyChanged =
        previousSessionKey !== 0 && snapshotSessionKey !== 0 && previousSessionKey !== snapshotSessionKey;
      const identityChanged =
        previousSession != null &&
        snapshotSessionInfo != null &&
        snapshotSessionInfo.name !== "" &&
        (snapshotSessionInfo.name !== previousSession.name || snapshotSessionInfo.type !== previousSession.type);
      const sessionChanged = keyChanged || identityChanged;

      const snapshotAudioStreams = audioStreamsFromJson(snap.AudioStreams);

      const driverList: Json = snap.DriverList ?? {};
      const timingLines: Json = snap.TimingData?.Lines ?? {};
      const tyreLines: Json = snap.TimingAppData?.Lines ?? {};
      const qPart = toIntOrNull(snap.TimingData?.SessionPart);

      const lb: Record<string, LeaderboardEntry> = {};
      for (const [driverKey, d] of Object.entries<Json>(driverList)) {
        const t: Json = timingLines[driverKey] ?? {};
        const tyreStints = parseStintsList(tyreLines[driverKey]?.Stints);
        const tyre = tyreStints.length > 0 ? tyreStints[tyreStints.length - 1].compound : "UNKNOWN";

        const sectorAt = (i: number): Json => {
          const raw = t.Sectors;
          if (raw && !Array.isArray(raw) && typeof raw === "object") return raw[String(i)] ?? null;
          if (Array.isArray(raw)) return raw[i] ?? null;
          return null;
        };

        const sectors: (number | null)[] = [];
        const sectorStat: number[] = [];
        const segStat: number[][] = [[], [], []];
        for (let i = 0; i < 3; i++) {
          const sec = sectorAt(i);
          sectors.push(sec?.Value != null ? parseFloat(sec.Value) : null);
          if (sec != null && sec.Value != null) {
            sectorStat.push(sec.OverallFastest === true ? 3 : sec.PersonalFastest === true ? 2 : 1);
          } else {
            sectorStat.push(0);
          }
          const rawSegs = sec?.Segments;
          let segs: Json = {};
          if (rawSegs && !Array.isArray(rawSegs) && typeof rawSegs === "object") segs = rawSegs;
          else if (Array.isArray(rawSegs)) segs = Object.fromEntries(rawSegs.map((v, k) => [String(k), v]));
          const segList: number[] = [];
          for (let j = 0; Object.prototype.hasOwnProperty.call(segs, String(j)); j++) {
            segList.push(segs[String(j)]?.Status ?? 0);
          }
          segStat[i] = segList;
        }

        lb[driverKey] = {
          position: toIntOrNull(t.Position) ?? 99,
          name: d.FullName ?? "",
          shortName: d.Tla ?? driverKey,
          driverNumber: toIntOrNull(driverKey) ?? 0,
          team: d.TeamName ?? "",
          teamColor: d.TeamColour ?? "FFFFFF",
          headshotUrl: d.HeadshotUrl ?? null,
          lastLapTime: parseSeconds(t.LastLapTime?.Value),
          lapTimeStatus: lapTimeStatus(t.LastLapTime, 0),
          gapToLeader: t.GapToLeader?.toString() ?? "",
          interval: extractInterval(t.IntervalToPositionAhead) ?? "",
          tyre,
          stints: tyreStints,
          sectorTimes: sectors,
          sectorStatus: sectorStat,
          segmentStatus: segStat,
          lapNumber: toIntOrNull(t.NumberOfLaps),
          inPit: t.InPit === true,
          retired: t.Retired === true || t.Stopped === true,
          knockedOut: t.KnockedOut === true,
          cutoff: t.Cutoff === true,
          eliminatedInPart: t.KnockedOut === true ? qPart : null,
          hasFastestLap: false,
        };
      }

      const rcMessages: RaceControlMessage[] = [];
      const rcData = snap.RaceControlMessages?.Messages;
      if (Array.isArray(rcData)) {
        for (const m of [...rcData].reverse()) rcMessages.push(raceControlFromWsJson(m));
      }

      // Latest position frame only, seeding both carPositions and a
      // one-sample positionHistory entry so the map has something before
      // live Position frames start flowing.
      const posData = snap.Position?.Position;
      const carPos: Record<string, TrackPoint> = {};
      const posHistory: Record<string, PositionSample[]> = {};
      const dots: TrackPoint[] = [...get().trackDots];
      if (Array.isArray(posData) && posData.length > 0) {
        const entries: Json = posData[posData.length - 1]?.Entries ?? {};
        const now = Date.now();
        for (const [key, pos] of Object.entries<Json>(entries)) {
          const x = pos?.X ?? pos?.x;
          const y = pos?.Y ?? pos?.y;
          if (x == null || y == null) continue;
          carPos[key] = { x, y };
          posHistory[key] = [{ x, y, time: now }];
          const cellKey = `${Math.round(x / 150)},${Math.round(y / 150)}`;
          if (!trackCells.has(cellKey) && dots.length < 5000) {
            trackCells.add(cellKey);
            dots.push({ x, y });
          }
        }
      }

      const rawCaptures = snap.TeamRadio?.Captures;
      const captures: Json[] = Array.isArray(rawCaptures)
        ? rawCaptures
        : rawCaptures && typeof rawCaptures === "object"
          ? Object.values(rawCaptures)
          : [];
      const radio = [...captures.map(teamRadioFromWsJson)].reverse().slice(0, 30);

      const lapCountData: Json = snap.LapCount ?? {};

      const nextState: LiveSnapshot & { debugInfo: string | null } = {
        ...emptyLiveSnapshot(),
        leaderboard: lb,
        weather: snap.WeatherData ? weatherDataFromJson(snap.WeatherData) : emptyLiveSnapshot().weather,
        audioStreams: snapshotAudioStreams.length > 0 ? snapshotAudioStreams : sessionChanged ? [] : get().audioStreams,
        trackStatus: snap.TrackStatus ? trackStatusFromJson(snap.TrackStatus) : clearTrackStatus,
        raceControl: rcMessages,
        sessionInfo: snapshotSessionInfo,
        clock: snap.ExtrapolatedClock ? extrapolatedClockFromJson(snap.ExtrapolatedClock) : null,
        telemetry: get().telemetry,
        telemetryHistory: get().telemetryHistory,
        connected: true,
        carPositions: carPos,
        trackDots: dots,
        positionHistory: posHistory,
        teamRadio: radio,
        // Same preserve-unless-session-changed pattern as audioStreams above —
        // this snapshot path runs on every WS reconnect, not just a genuine
        // new session, and the reconnect snapshot's LapCount can lack
        // TotalLaps (sent once early, not necessarily re-included later),
        // which was wiping the header's lap counter to null on any reconnect
        // mid-session even though nothing about the session actually changed.
        currentLap: toIntOrNull(lapCountData.CurrentLap) ?? (sessionChanged ? null : get().currentLap),
        totalLaps: toIntOrNull(lapCountData.TotalLaps) ?? (sessionChanged ? null : get().totalLaps),
        qualifyingPart: qPart,
        stewardStatuses: deriveStewardStatuses(rcMessages),
        debugInfo: null,
      };
      set(nextState);

      const grid = maybeCaptureGrid(lb);
      if (grid) set({ gridPositions: grid });

      bootstrapTeamRadio();
      bootstrapPitStops();
      bootstrapStints();
    }

    // ── Session info (WS) ───────────────────────────────────────────────────

    function applySessionInfo(data: Json): void {
      const info = sessionInfoFromJson(data);
      if (info.key === 0 && info.name === "") return;

      const current = get().sessionInfo;
      const keyChanged = info.key !== 0 && info.key !== (current?.key ?? -1);
      const nameChanged =
        current == null ||
        info.name !== current.name ||
        info.meetingName !== current.meetingName ||
        info.location !== current.location;

      if (current == null || keyChanged || nameChanged) {
        set({
          sessionInfo: info,
          audioStreams: [],
          raceControl: [],
          pitStops: [],
          teamRadio: [],
          leaderboard: {},
          qualifyingPart: null,
          gridPositions: {},
        });
        bootstrapOnce();
      }
    }

    // ── Timing data ──────────────────────────────────────────────────────────

    function applyTimingData(data: Json): void {
      const lines: Json = data.Lines ?? {};
      const incomingPart = toIntOrNull(data.SessionPart);
      const state = get();
      const currentPart = incomingPart ?? state.qualifyingPart;
      const updated = { ...state.leaderboard };
      const newLapTimeHistory: Record<number, LapRecord[]> = Object.fromEntries(
        Object.entries(state.lapTimeHistory).map(([k, v]) => [k, [...v]]),
      );
      const newSectors: Record<number, (number | null)[]> = Object.fromEntries(
        Object.entries(state.currentLapSectors).map(([k, v]) => [k, [...v]]),
      );

      for (const [driverKey, d] of Object.entries<Json>(lines)) {
        const ex = updated[driverKey];
        if (!ex) continue;
        const rawLaps = d.NumberOfLaps;

        const incomingKnockedOut = Object.prototype.hasOwnProperty.call(d, "KnockedOut")
          ? d.KnockedOut === true
          : ex.knockedOut;
        let nextEliminatedInPart: number | null;
        if (incomingKnockedOut && !ex.knockedOut) {
          nextEliminatedInPart = currentPart ?? ex.eliminatedInPart;
        } else if (!incomingKnockedOut) {
          nextEliminatedInPart = null;
        } else {
          nextEliminatedInPart = ex.eliminatedInPart;
        }

        const next: LeaderboardEntry = {
          ...ex,
          position: toIntOrNull(d.Position) ?? ex.position,
          lastLapTime: parseSeconds(d.LastLapTime?.Value) ?? ex.lastLapTime,
          lapTimeStatus: lapTimeStatus(d.LastLapTime, ex.lapTimeStatus),
          gapToLeader: d.GapToLeader?.toString() ?? ex.gapToLeader,
          interval: extractInterval(d.IntervalToPositionAhead) ?? ex.interval,
          sectorTimes: mergeSectors(ex.sectorTimes, d.Sectors),
          sectorStatus: mergeSectorStatus(ex.sectorStatus, d.Sectors),
          segmentStatus: mergeSegmentStatus(ex.segmentStatus, d.Sectors),
          lapNumber: rawLaps != null ? toIntOrNull(rawLaps) : ex.lapNumber,
          inPit: Object.prototype.hasOwnProperty.call(d, "InPit") ? d.InPit === true : ex.inPit,
          retired: ex.retired || d.Retired === true || d.Stopped === true,
          knockedOut: incomingKnockedOut,
          cutoff: Object.prototype.hasOwnProperty.call(d, "Cutoff") ? d.Cutoff === true : ex.cutoff,
          eliminatedInPart: nextEliminatedInPart,
        };
        updated[driverKey] = next;

        if (next.lapTimeStatus === 3 && ex.lapTimeStatus !== 3) emitFastestLap(next);

        const dn = ex.driverNumber;
        const lapChanged = next.lapNumber != null && next.lapNumber !== ex.lapNumber;
        const sectorBaseline = lapChanged ? [null, null, null] : (newSectors[dn] ?? [null, null, null]);
        newSectors[dn] = mergeSectors(sectorBaseline, d.Sectors);

        if (next.lastLapTime != null && next.lastLapTime !== ex.lastLapTime) {
          const lapNum = next.lapNumber ?? ex.lapNumber ?? 0;
          const history = newLapTimeHistory[dn] ?? (newLapTimeHistory[dn] = []);
          if (history.length === 0 || history[history.length - 1].lapNumber !== lapNum) {
            history.push({ lapNumber: lapNum, time: next.lastLapTime });
          }
        }
      }

      set({
        leaderboard: updated,
        qualifyingPart: incomingPart ?? state.qualifyingPart,
        gridPositions: maybeCaptureGrid(updated) ?? state.gridPositions,
        lapTimeHistory: newLapTimeHistory,
        currentLapSectors: newSectors,
      });
    }

    // ── Race control ─────────────────────────────────────────────────────────

    function applyRaceControl(data: Json): void {
      const raw = data.Messages;
      const msgs: Json[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
      if (msgs.length === 0) return;
      const incoming = msgs.map(raceControlFromWsJson);

      const state = get();
      const existingKeys = new Set(state.raceControl.map(rcKey));
      const newMsgs = incoming.filter((m) => !existingKeys.has(rcKey(m)));
      if (newMsgs.length === 0) return;

      newMsgs.sort((a, b) => (b.utc < a.utc ? -1 : b.utc > a.utc ? 1 : 0));
      const updated = [...newMsgs, ...state.raceControl];
      set({ raceControl: updated, stewardStatuses: deriveStewardStatuses(updated) });
    }

    // ── Car telemetry ────────────────────────────────────────────────────────

    function applyCarData(data: Json): void {
      const entries: Json[] = data.Entries;
      if (!Array.isArray(entries) || entries.length === 0) return;

      const parsed: { time: number; cars: Json }[] = [];
      let newestServer = 0;
      for (const e of entries) {
        const cars = e?.Cars;
        if (!cars || Object.keys(cars).length === 0) continue;
        const t = Date.parse(e.Utc ?? "") || Date.now();
        if (t > newestServer) newestServer = t;
        parsed.push({ time: t, cars });
      }
      if (parsed.length === 0) return;
      const shift = Date.now() - newestServer;

      const state = get();
      const latestTick = { ...state.telemetry };
      const history: Record<number, TelemetrySample[]> = Object.fromEntries(
        Object.entries(state.telemetryHistory).map(([k, v]) => [k, [...v]]),
      );

      for (const tick of parsed) {
        const time = tick.time + shift;
        for (const [key, car] of Object.entries<Json>(tick.cars)) {
          const n = parseInt(key, 10);
          if (Number.isNaN(n)) continue;
          const channels = car?.Channels;
          if (!channels) continue;
          latestTick[n] = carTelemetryFromChannels(n, channels);

          const hist = history[n] ?? (history[n] = []);
          if (hist.length === 0 || time > hist[hist.length - 1].time) {
            hist.push(telemetrySampleFromChannels(channels, time, state.leaderboard[String(n)]?.lapNumber ?? 0));
            if (hist.length > TELEMETRY_HISTORY_CAP) hist.splice(0, hist.length - TELEMETRY_HISTORY_CAP);
          }
        }
      }

      set({ telemetry: latestTick, telemetryHistory: history });
    }

    // ── Position / track map ────────────────────────────────────────────────

    function appendPositionSamples(batches: { time: number; entries: Json }[]): void {
      if (batches.length === 0) return;
      const state = get();
      const history: Record<string, PositionSample[]> = Object.fromEntries(
        Object.entries(state.positionHistory).map(([k, v]) => [k, [...v]]),
      );
      const carPos = { ...state.carPositions };
      const dots = [...state.trackDots];

      for (const batch of batches) {
        for (const [numStr, pos] of Object.entries<Json>(batch.entries)) {
          const x = pos?.X ?? pos?.x;
          const y = pos?.Y ?? pos?.y;
          if (x == null || y == null) continue;

          const hist = history[numStr] ?? (history[numStr] = []);
          if (hist.length === 0 || batch.time > hist[hist.length - 1].time) {
            hist.push({ x, y, time: batch.time });
            if (hist.length > POSITION_HISTORY_CAP) hist.splice(0, hist.length - POSITION_HISTORY_CAP);
          }

          carPos[numStr] = { x, y };
          const cellKey = `${Math.round(x / 150)},${Math.round(y / 150)}`;
          if (!trackCells.has(cellKey) && dots.length < 5000) {
            trackCells.add(cellKey);
            dots.push({ x, y });
          }
        }
      }

      set({ carPositions: carPos, trackDots: dots, positionHistory: history });
    }

    function applyPositions(rawData: Json): void {
      // Format A: List of {driver_number, x, y} — untimestamped, stamp with now.
      if (Array.isArray(rawData)) {
        const entries: Json = {};
        for (const item of rawData) {
          const num = (item?.driver_number ?? item?.DriverNumber)?.toString();
          if (num != null) entries[num] = item;
        }
        if (Object.keys(entries).length > 0) appendPositionSamples([{ time: Date.now(), entries }]);
        return;
      }

      const data: Json = rawData && typeof rawData === "object" ? rawData : {};

      // Format B: {Position: [{Timestamp, Entries: {num:{X,Y,Z}}}]} — multi-frame batch.
      const posList = data.Position;
      if (Array.isArray(posList) && posList.length > 0) {
        const raw: { time: number; entries: Json }[] = [];
        let newestServer = 0;
        for (const f of posList) {
          const entries = f?.Entries ?? {};
          if (Object.keys(entries).length === 0) continue;
          const t = Date.parse(f?.Timestamp ?? "") || Date.now();
          if (t > newestServer) newestServer = t;
          raw.push({ time: t, entries });
        }
        if (raw.length === 0) return;
        const shift = Date.now() - newestServer;
        appendPositionSamples(raw.map((b) => ({ time: b.time + shift, entries: b.entries })));
        return;
      }

      // Format C: {Entries: {num:{X,Y,Z}}} — single frame.
      const namedEntries = data.Entries ?? data.entries;
      if (namedEntries) {
        appendPositionSamples([{ time: Date.now(), entries: namedEntries }]);
        return;
      }

      // Format D: flat {driverNum: {x,y}}.
      const flatEntries: Json = {};
      for (const [key, value] of Object.entries<Json>(data)) {
        if (value && typeof value === "object" && ("X" in value || "x" in value || "Y" in value || "y" in value)) {
          flatEntries[key] = value;
        }
      }
      if (Object.keys(flatEntries).length > 0) appendPositionSamples([{ time: Date.now(), entries: flatEntries }]);
    }

    // ── Team radio ───────────────────────────────────────────────────────────

    function applyTeamRadio(data: Json): void {
      const raw = data.Captures;
      const captures: Json[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
      if (captures.length === 0) return;
      const newMsgs = captures.map(teamRadioFromWsJson);
      const state = get();
      const purged = purgeStaleRadio(state.teamRadio, newMsgs);
      const updated = [...newMsgs, ...purged].slice(0, 40);
      set({ teamRadio: updated });
    }

    // ── Pit stops (WS) ───────────────────────────────────────────────────────

    function applyNewPitStop(data: Json): void {
      const stop = pitStopFromJson(data);
      const key = `${stop.driverNumber}|${stop.lapNumber}`;
      const state = get();
      if (state.pitStops.some((p) => `${p.driverNumber}|${p.lapNumber}` === key)) return;
      set({ pitStops: [stop, ...state.pitStops] });
    }

    // ── Team radio transcript (WS) ───────────────────────────────────────────

    function applyTeamRadioTranscript(data: Json): void {
      const racingNumber = data.RacingNumber?.toString() ?? "";
      const utc = data.Utc?.toString() ?? "";
      const transcript = data.Transcript;
      if (transcript == null || racingNumber === "") return;
      const updated = get().teamRadio.map((m) =>
        m.racingNumber === racingNumber && m.utc === utc ? { ...m, transcript } : m,
      );
      set({ teamRadio: updated });
    }

    // ── Session status (WS) ──────────────────────────────────────────────────

    function applySessionStatus(data: Json): void {
      const status = data.Status;
      if (status === "Finished" || status === "Aborted") escalateSessionPoll();
    }

    // ── Tyre / TimingAppData ─────────────────────────────────────────────────

    function applyTimingAppData(data: Json): void {
      const lines: Json = data.Lines ?? {};
      if (Object.keys(lines).length === 0) return;
      const updated = { ...get().leaderboard };

      for (const [key, lineData] of Object.entries<Json>(lines)) {
        const ex = updated[key];
        if (!ex) continue;
        const rawStints = lineData?.Stints;
        if (rawStints == null) continue;

        const mergedStints = [...ex.stints];
        if (rawStints && !Array.isArray(rawStints) && typeof rawStints === "object") {
          for (const [idxStr, patch] of Object.entries<Json>(rawStints)) {
            const idx = parseInt(idxStr, 10);
            if (Number.isNaN(idx)) continue;
            while (mergedStints.length <= idx) {
              mergedStints.push({ compound: "UNKNOWN", isNew: false, startLap: 0, laps: 0 });
            }
            const cur = mergedStints[idx];
            mergedStints[idx] = {
              compound: Object.prototype.hasOwnProperty.call(patch, "Compound")
                ? (patch.Compound as string).toUpperCase()
                : cur.compound,
              isNew: Object.prototype.hasOwnProperty.call(patch, "New")
                ? patch.New === "true" || patch.New === true
                : cur.isNew,
              startLap: toIntOrNull(patch.StartLaps) ?? cur.startLap,
              laps: toIntOrNull(patch.TotalLaps) ?? cur.laps,
            };
          }
        } else if (Array.isArray(rawStints)) {
          const parsed = parseStintsList(rawStints);
          if (parsed.length > 0) {
            mergedStints.length = 0;
            mergedStints.push(...parsed);
          }
        }

        if (mergedStints.length === 0) continue;
        updated[key] = { ...ex, tyre: mergedStints[mergedStints.length - 1].compound, stints: mergedStints };
      }
      set({ leaderboard: updated });
    }

    // ── Playback buffer (client-side DVR) ───────────────────────────────────
    // Every WS message lands here with its arrival time instead of being
    // applied straight away — tickPlayback drains it into handleMessage once
    // each message's age has passed playbackDelayMs. Lets the UI trail
    // wall-clock by a chosen amount (to match a delayed broadcast) and/or
    // pause entirely while the queue keeps filling in the background.

    function onRawMessage(msg: Json): void {
      // The full-state snapshot (type === undefined, sent once per WS
      // connection) is a structural bootstrap, not part of the
      // moment-to-moment feed — always apply it right away so a reconnect
      // doesn't sit blank for the whole delay/pause window. Everything
      // after it still buffers normally.
      //
      // AudioStreams gets the same immediate treatment despite being a
      // typed event: F1 sends it exactly once, early in the session, not
      // as a repeating stream like CarData/TimingData. Routing a one-shot
      // event through the DVR buffer risks trimBuffer silently evicting it
      // (long pause, or a delay that ages past MAX_BUFFER_WINDOW_MS) before
      // it's ever applied — and unlike every other feed, there's no later
      // update to supersede the lost one, so commentary would be gone for
      // the session.
      if (msg.type === undefined || msg.type === "AudioStreams") {
        handleMessage(msg);
        return;
      }
      playbackBuffer.push({ receivedAt: Date.now(), msg });
      trimBuffer();
    }

    function trimBuffer(): void {
      const cutoff = Date.now() - MAX_BUFFER_WINDOW_MS;
      while (playbackBuffer.length > 0 && playbackBuffer[0].receivedAt < cutoff) {
        playbackBuffer.shift();
      }
      // A pause longer than the buffer window trims past the frozen
      // playhead — snap it forward so it doesn't chase a target that no
      // longer exists.
      if (playhead != null && playbackBuffer.length > 0 && playhead < playbackBuffer[0].receivedAt) {
        playhead = playbackBuffer[0].receivedAt;
      }
    }

    function resetPlaybackBuffer(): void {
      playbackBuffer.length = 0;
      playhead = null;
    }

    function tickPlayback(): void {
      const target = Date.now() - playbackDelayMs;
      if (playhead == null) playhead = target;

      if (!paused && target > playhead) {
        const gap = target - playhead;
        // More than ~2s of backlog (post-pause, or delay just decreased) ->
        // replay faster than real time so it visibly plays through instead
        // of jumping; once close, settle back to tracking 1:1 with real time.
        const step = gap > 2000 ? TICK_INTERVAL_MS * CATCH_UP_MULTIPLIER : TICK_INTERVAL_MS;
        const advanced = playhead + step;
        playhead = advanced > target ? target : advanced;

        while (playbackBuffer.length > 0 && playbackBuffer[0].receivedAt <= playhead) {
          handleMessage(playbackBuffer.shift()!.msg);
        }
      }
      // else: target <= playhead (delay was just increased, or paused) —
      // hold the playhead where it is rather than moving it backward;
      // messages already shown can't be un-applied.

      const bufferedMs = target > playhead ? target - playhead : 0;
      const s = get();
      if (bufferedMs !== s.bufferedMs || paused !== s.paused || playbackDelayMs !== s.playbackDelayMs) {
        set({ playbackDelayMs, paused, bufferedMs });
      }
    }

    // ── Wiring ───────────────────────────────────────────────────────────────

    function start(): void {
      if (started) return;
      started = true;
      ws.onStateChange((s: WsConnectionState) => {
        const connected = s === "connected";
        set({ connected });
        if (connected) {
          if (bootstrapTimer) clearTimeout(bootstrapTimer);
          bootstrapTimer = setTimeout(bootstrapOnce, 1000);
        }
      });
      ws.onMessage(onRawMessage);
      ws.connect();
      playbackTicker = setInterval(tickPlayback, TICK_INTERVAL_MS);
    }

    return {
      ...emptyLiveSnapshot(),
      debugInfo: null,

      connect: start,

      disconnect: () => {
        if (bootstrapTimer) clearTimeout(bootstrapTimer);
        if (radioPollTimer) clearInterval(radioPollTimer);
        if (sessionPollTimer) clearInterval(sessionPollTimer);
        if (playbackTicker) clearInterval(playbackTicker);
        ws.disconnect();
      },

      setPlaybackDelay: (delayMs: number) => {
        playbackDelayMs = delayMs;
        set({ playbackDelayMs: delayMs });
      },

      pausePlayback: () => {
        paused = true;
        set({ paused: true });
      },

      resumePlayback: () => {
        paused = false;
        set({ paused: false });
      },

      skipToLive: () => {
        playbackDelayMs = 0;
        paused = false;
        const target = Date.now();
        while (playbackBuffer.length > 0 && playbackBuffer[0].receivedAt <= target) {
          handleMessage(playbackBuffer.shift()!.msg);
        }
        playhead = target;
        set({ playbackDelayMs: 0, paused: false, bufferedMs: 0 });
      },

      reconnect: () => {
        ws.disconnect();
        ws.connect();
      },

      forceRefresh: async () => {
        resetPlaybackBuffer();
        set({
          sessionInfo: null,
          leaderboard: {},
          audioStreams: [],
          raceControl: [],
          pitStops: [],
          teamRadio: [],
          qualifyingPart: null,
          gridPositions: {},
        });
        ws.disconnect();
        ws.connect();
        await bootstrapOnce();
      },

      onSessionEnded: escalateSessionPoll,
    };
  },
);

/** Convenience selector: the WS base URL this store connects to, for display/debugging. */
export const liveWsUrl = config.liveWsUrl;
