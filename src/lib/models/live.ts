/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/data/models/live_models.dart.
 * Models for the live timing backend (WebSocket + REST).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

// ── Track map ───────────────────────────────────────────────────────────────

export interface TrackPoint {
  x: number;
  y: number;
}

/**
 * Single timestamped car-position sample. `time` is anchored to local
 * wall-clock (newest server frame in each batch is shifted to `Date.now()`),
 * so clock skew doesn't break interpolation.
 */
export interface PositionSample {
  x: number;
  y: number;
  time: number; // epoch ms
}

// ── Driver ───────────────────────────────────────────────────────────────────

export interface LiveDriver {
  racingNumber: string;
  fullName: string;
  tla: string;
  teamName: string;
  teamColour: string;
  headshotUrl: string | null;
  firstName: string;
  lastName: string;
  broadcastName: string;
}

export function liveDriverFromJson(number: string, json: Json): LiveDriver {
  return {
    racingNumber: json.RacingNumber ?? number,
    fullName: json.FullName ?? "",
    tla: json.Tla ?? "",
    teamName: json.TeamName ?? "",
    teamColour: json.TeamColour ?? "FFFFFF",
    headshotUrl: json.HeadshotUrl ?? null,
    firstName: json.FirstName ?? "",
    lastName: json.LastName ?? "",
    broadcastName: json.BroadcastName ?? "",
  };
}

export function driverTeamColor(d: LiveDriver): string {
  return /^[0-9a-fA-F]{6}$/.test(d.teamColour) ? `#${d.teamColour}` : "#FFFFFF";
}

// ── Tyre stint ───────────────────────────────────────────────────────────────
// Ported from GridBeat (Flutter) TyreStint.fromJson/fromRestJson — the two
// feeds describe the SAME stint in different units (WS: StartLaps = tyre age
// when fitted, TotalLaps = cumulative tyre life; REST: lap_start/lap_end =
// race-lap boundaries). Both are normalized here into tyreAgeAtStart/lapsRun
// so a consumer never has to know which feed a stint came from — don't
// reintroduce raw StartLaps/TotalLaps or lap_start/lap_end field merging
// across sources, that's exactly the "26-lap stint silently read as 4 laps"
// bug this normalization exists to prevent.

export interface TyreStint {
  compound: string;
  isNew: boolean;
  /** Tyre age (in laps) when this set was fitted. 0 for a fresh set. */
  tyreAgeAtStart: number;
  /** Laps driven during this stint. */
  lapsRun: number;
  /** 1-based position in the driver's stint sequence, 0 if unknown — the
   * only reliable ordering key (REST rows arrive unordered, and tyre age
   * isn't monotonic across a race). */
  stintNumber: number;
}

export function tyreStintFromJson(j: Json): TyreStint {
  const age = Number(j.StartLaps ?? 0);
  const total = Number(j.TotalLaps ?? 0);
  return {
    compound: (j.Compound ?? "UNKNOWN").toUpperCase(),
    isNew: j.New === "true" || j.New === true,
    tyreAgeAtStart: age,
    // TotalLaps is cumulative life, so laps carried in must come off or a
    // refitted set double-counts them.
    lapsRun: Math.min(Math.max(total - age, 0), total),
    stintNumber: 0,
  };
}

/** From REST /api/stints — DB-backed, snake_case, race-lap boundaries. */
export function tyreStintFromRestJson(j: Json): TyreStint {
  const age = Number(j.tyre_age_at_start ?? 0);
  const start = Number(j.lap_start ?? 0);
  const end = Number(j.lap_end ?? 0);
  const rawNew = j.new ?? j.is_new;
  return {
    compound: (j.compound ?? "UNKNOWN").toUpperCase(),
    isNew: rawNew == null ? age === 0 : rawNew === true || rawNew === "true",
    tyreAgeAtStart: age,
    // Inclusive range: laps 3..21 is 19 laps, not 18.
    lapsRun: end >= start ? end - start + 1 : 0,
    stintNumber: Number(j.stint_number ?? 0),
  };
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  position: number;
  name: string;
  shortName: string;
  driverNumber: number;
  team: string;
  teamColor: string;
  headshotUrl: string | null;
  lastLapTime: number | null;
  /** 0 = normal (white), 2 = personal best (green), 3 = overall fastest (purple) */
  lapTimeStatus: number;
  gapToLeader: string;
  /** Gap to the car immediately ahead. String because F1 emits "+1.234", "LAP", or "". */
  interval: string;
  tyre: string;
  sectorTimes: (number | null)[];
  /** 0 = no data/grey, 1 = yellow, 2 = green (PB), 3 = purple (overall best) */
  sectorStatus: number[];
  /** Per-sector segment statuses (raw F1 values): 0 not done, 2048 yellow, 2049 green, 2051 purple, 2052 in-progress. */
  segmentStatus: number[][];
  hasFastestLap: boolean;
  lapNumber: number | null;
  inPit: boolean;
  retired: boolean;
  /** Qualifying: driver eliminated from the current session part. */
  knockedOut: boolean;
  /** Qualifying: driver currently on the elimination bubble. */
  cutoff: boolean;
  /** Qualifying: which part (1/2/3) the driver was eliminated in. */
  eliminatedInPart: number | null;
  stints: TyreStint[];
}

function toIntOrNull(v: unknown): number | null {
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function toDoubleOrNull(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function leaderboardEntryFromJson(json: Json): LeaderboardEntry {
  const rawSectors: unknown[] | undefined = json.sectorTimes;
  const sectors: (number | null)[] = [];
  for (let i = 0; i < 3; i++) {
    const v = rawSectors?.[i];
    sectors.push(typeof v === "number" ? v : toDoubleOrNull(v));
  }
  const status = (json.status as string | undefined)?.toUpperCase();

  return {
    position: toIntOrNull(json.position) ?? 99,
    name: json.name ?? "",
    shortName: json.shortName ?? "",
    driverNumber: toIntOrNull(json.driverNumber) ?? 0,
    team: json.team ?? "",
    teamColor: json.teamColor ?? "FFFFFF",
    headshotUrl: json.headshotUrl ?? null,
    lastLapTime: toDoubleOrNull(json.lastLapTime),
    lapTimeStatus: 0,
    gapToLeader: json.gapToLeader?.toString() ?? "",
    interval: json.interval?.toString() ?? "",
    tyre: json.tyre ?? "UNKNOWN",
    sectorTimes: sectors.length === 3 ? sectors : [null, null, null],
    sectorStatus: [0, 1, 2].map((i) => (sectors[i] != null ? 1 : 0)),
    segmentStatus: [[], [], []],
    hasFastestLap: json.hasFastestLap === true,
    lapNumber: toIntOrNull(json.lapNumber),
    inPit: json.inPit === true,
    // Backend authoritative source is the sticky `status` string
    // ("ACTIVE" | "OUT" | "DNF"). Legacy boolean keys kept as fallback.
    retired: status === "DNF" || json.retired === true || json.stopped === true,
    knockedOut: status === "OUT" || json.knockedOut === true,
    cutoff: json.cutoff === true,
    eliminatedInPart: toIntOrNull(json.eliminatedInPart),
    stints: [],
  };
}

export function teamColorHex(teamColor: string): string {
  return /^[0-9a-fA-F]{6}$/.test(teamColor) ? `#${teamColor}` : "#FFFFFF";
}

export function formattedLapTime(seconds: number | null): string {
  if (seconds == null) return "-";
  const mins = Math.trunc(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

export function lastName(fullName: string): string {
  const parts = fullName.split(" ");
  return parts[parts.length - 1] ?? fullName;
}

// ── Fastest lap event ───────────────────────────────────────────────────────
// One-shot signal for the fastest-lap overlay — not part of LiveSnapshot
// state, so it must never re-fire on a rerender (kept as a separate pub/sub
// channel by the store, not a field on the snapshot).

export interface FastestLapEvent {
  driverNumber: number;
  driverName: string;
  shortName: string;
  lapTime: string;
  teamColorHex: string;
  lapNumber: number | null;
}

export function fastestLapEventId(e: FastestLapEvent): string {
  return `${e.driverNumber}-${e.lapNumber}-${e.lapTime}`;
}

// ── Leader-change event ─────────────────────────────────────────────────────
// Same one-shot-signal shape as FastestLapEvent above, for an on-track P1
// overtake (race/sprint only, after lights-out — see store.ts's emission
// rule in applyTimingData).

export interface LeaderChangeEvent {
  driverNumber: number;
  driverName: string;
  shortName: string;
  teamColorHex: string;
  lapNumber: number | null;
}

export function leaderChangeEventId(e: LeaderChangeEvent): string {
  return `${e.driverNumber}-${e.lapNumber}`;
}

// ── Weather ──────────────────────────────────────────────────────────────────

export interface WeatherData {
  airTemp: number;
  trackTemp: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  rainfall: boolean;
  pressure: number;
}

export function weatherDataFromJson(json: Json): WeatherData {
  return {
    airTemp: parseFloat(json.AirTemp ?? "0") || 0,
    trackTemp: parseFloat(json.TrackTemp ?? "0") || 0,
    humidity: parseFloat(json.Humidity ?? "0") || 0,
    windSpeed: parseFloat(json.WindSpeed ?? "0") || 0,
    windDirection: parseFloat(json.WindDirection ?? "0") || 0,
    rainfall: json.Rainfall != null && json.Rainfall !== "0" && json.Rainfall !== 0,
    pressure: parseFloat(json.Pressure ?? "0") || 0,
  };
}

export const emptyWeather: WeatherData = {
  airTemp: 0,
  trackTemp: 0,
  humidity: 0,
  windSpeed: 0,
  windDirection: 0,
  rainfall: false,
  pressure: 0,
};

// ── Audio streams (live broadcast commentary) ───────────────────────────────
// Separate from TeamRadio — this is F1's own live coverage audio (HLS).

export interface AudioStreamInfo {
  name: string;
  language: string;
  uri: string;
}

/**
 * Parses the {"Streams": [...]} wrapper both the WS feed and /api/audiostreams
 * send, skipping any entry with no playable URL.
 *
 * F1's SignalR feed represents list-valued fields as a plain JSON array in a
 * full snapshot but as an index-keyed object ({"0": {...}}) in an
 * incremental delta — same quirk the backend already works around for
 * RaceControlMessages.Messages. Handled here too as a second line of
 * defense: Streams only ever arrives once per session, so a shape this
 * misses is gone for the rest of the session with nothing to retry.
 */
export function audioStreamsFromJson(json: Json | undefined): AudioStreamInfo[] {
  const raw = json?.Streams;
  const list: Json[] | null = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : null;
  if (list == null) return [];
  return list
    .map((e: Json): AudioStreamInfo => ({
      name: e.Name?.toString() ?? "",
      language: e.Language?.toString() ?? "",
      uri: e.Uri?.toString() ?? "",
    }))
    .filter((s) => s.uri.length > 0);
}

// ── Track status ─────────────────────────────────────────────────────────────

export interface TrackStatus {
  status: string;
  message: string;
}

export function trackStatusFromJson(json: Json): TrackStatus {
  return { status: json.Status?.toString() ?? "1", message: json.Message ?? "" };
}

export const clearTrackStatus: TrackStatus = { status: "1", message: "AllClear" };

/**
 * Ported from TrackStatusInfo in the Flutter app's app_constants.dart.
 * The feed sends a bare numeric code; `message` is a terse F1 token
 * ("AllClear", "SCDeployed") that isn't presentable, so map the code.
 */
export function trackStatusLabel(code: string): string {
  switch (code) {
    case "1":
      return "ALL CLEAR";
    case "2":
      return "YELLOW FLAG";
    case "4":
      return "SAFETY CAR";
    case "5":
      return "RED FLAG";
    case "6":
      return "VSC";
    case "7":
      return "VSC ENDING";
    default:
      return "UNKNOWN";
  }
}

export function trackStatusColor(code: string): string {
  switch (code) {
    case "1":
      return "var(--color-success)";
    case "2":
    case "4":
    case "6":
      return "var(--color-warning)";
    case "5":
      return "var(--color-error)";
    case "7":
      return "#FF6F00";
    default:
      return "var(--color-text-muted)";
  }
}

// ── Race control ─────────────────────────────────────────────────────────────

export interface RaceControlMessage {
  utc: string;
  category: string;
  message: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  lapNumber: number | null;
  driverNumber: number | null;
}

/** From WebSocket RaceControlMessages.Messages[]. */
export function raceControlFromWsJson(json: Json): RaceControlMessage {
  return {
    utc: json.Utc ?? "",
    category: json.Category ?? "",
    message: json.Message ?? "",
    flag: json.Flag ?? null,
    scope: json.Scope ?? null,
    sector: json.Sector != null ? Number(json.Sector) : null,
    lapNumber: json.Lap != null ? Number(json.Lap) : null,
    driverNumber: json.RacingNumber != null ? Number(json.RacingNumber) : null,
  };
}

/** From REST /api/racecontrol. */
export function raceControlFromRestJson(json: Json): RaceControlMessage {
  return {
    utc: json.date ?? "",
    category: json.category ?? "",
    message: json.message ?? "",
    flag: json.flag ?? null,
    scope: json.scope ?? null,
    sector: json.sector != null ? Number(json.sector) : null,
    lapNumber: json.lap_number != null ? Number(json.lap_number) : null,
    driverNumber: json.driver_number != null ? Number(json.driver_number) : null,
  };
}

// ── Steward status per driver ────────────────────────────────────────────────

export type StewardState = "none" | "underInvestigation" | "penalty";

export interface DriverSteward {
  state: StewardState;
  /** Short human summary, e.g. "5-sec penalty - Turn 4 track limits". */
  summary: string | null;
  sourceMessage: string | null;
}

export const noSteward: DriverSteward = { state: "none", summary: null, sourceMessage: null };

// ── Session ──────────────────────────────────────────────────────────────────

export interface SessionInfo {
  key: number;
  name: string;
  type: string;
  startDate: string | null;
  meetingName: string;
  officialName: string;
  location: string;
  country: string;
}

export function sessionInfoFromJson(json: Json): SessionInfo {
  const meeting = json.Meeting ?? {};
  const country = meeting.Country ?? {};
  return {
    key: Number(json.Key ?? 0),
    name: json.Name ?? "",
    type: json.Type ?? "",
    startDate: json.StartDate ?? null,
    meetingName: meeting.Name ?? "",
    officialName: meeting.OfficialName ?? "",
    location: meeting.Location ?? "",
    country: country.Name ?? "",
  };
}

const GP_LOCATION_OVERRIDES: Record<string, string> = {
  "monte carlo": "MONACO",
  "monte-carlo": "MONACO",
  monaco: "MONACO",
  imola: "EMILIA-ROMAGNA",
  miami: "MIAMI",
  "las vegas": "LAS VEGAS",
  "são paulo": "SAO PAULO",
  "sao paulo": "SAO PAULO",
  austin: "UNITED STATES",
  sakhir: "BAHRAIN",
  jeddah: "SAUDI ARABIAN",
  lusail: "QATAR",
  losail: "QATAR",
  "yas island": "ABU DHABI",
  "yas marina": "ABU DHABI",
  "abu dhabi": "ABU DHABI",
  spielberg: "AUSTRIAN",
  silverstone: "BRITISH",
  spa: "BELGIAN",
  monza: "ITALIAN",
  zandvoort: "DUTCH",
  budapest: "HUNGARIAN",
  shanghai: "CHINESE",
  suzuka: "JAPANESE",
  baku: "AZERBAIJAN",
  singapore: "SINGAPORE",
  "marina bay": "SINGAPORE",
  "mexico city": "MEXICO CITY",
  mexico: "MEXICAN",
  montréal: "CANADIAN",
  montreal: "CANADIAN",
  melbourne: "AUSTRALIAN",
  barcelona: "SPANISH",
  madrid: "SPANISH",
};

/**
 * Display name for the Grand Prix — e.g. "MONACO GP", "BRITISH GP".
 * Resolution order: 1) meetingName already says "Grand Prix" -> strip &
 * uppercase, 2) location override table, 3) country fallback, 4) last resort.
 */
export function grandPrixName(session: SessionInfo): string {
  if (session.meetingName.toLowerCase().includes("grand prix")) {
    const stripped = session.meetingName
      .replace(/\s*grand\s+prix\s*$/i, "")
      .toUpperCase();
    return `${stripped} GP`;
  }
  const loc = session.location.toLowerCase();
  for (const [needle, value] of Object.entries(GP_LOCATION_OVERRIDES)) {
    if (loc.includes(needle)) return `${value} GP`;
  }
  if (session.country) return `${session.country.toUpperCase()} GP`;
  return session.location ? session.location.toUpperCase() : "LIVE TIMING";
}

// ── Clock ────────────────────────────────────────────────────────────────────

export interface ExtrapolatedClock {
  utc: string;
  remaining: string;
  extrapolating: boolean;
}

export function extrapolatedClockFromJson(json: Json): ExtrapolatedClock {
  return {
    utc: json.Utc ?? "",
    remaining: json.Remaining ?? "00:00:00",
    extrapolating: json.Extrapolating === true,
  };
}

// ── Telemetry ────────────────────────────────────────────────────────────────

export interface CarTelemetry {
  driverNumber: number;
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
}

export function carTelemetryFromChannels(driverNumber: number, channels: Json): CarTelemetry {
  return {
    driverNumber,
    rpm: Number(channels["0"] ?? 0),
    speed: Number(channels["2"] ?? 0),
    gear: Number(channels["3"] ?? 0),
    throttle: Number(channels["4"] ?? 0),
    brake: Number(channels["5"] ?? 0),
    drs: Number(channels["45"] ?? 0),
  };
}

export function drsActive(drs: number): boolean {
  return drs >= 8;
}

/**
 * One timestamped CarData tick, same channels as CarTelemetry plus a
 * wall-clock time and the driver's lap counter at arrival (so Telemetry
 * Compare can bucket samples by lap instead of a rolling window).
 */
export interface TelemetrySample {
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
  drs: number;
  time: number; // epoch ms
  lapNumber: number;
}

export function telemetrySampleFromChannels(
  channels: Json,
  time: number,
  lapNumber = 0,
): TelemetrySample {
  return {
    rpm: Number(channels["0"] ?? 0),
    speed: Number(channels["2"] ?? 0),
    gear: Number(channels["3"] ?? 0),
    throttle: Number(channels["4"] ?? 0),
    brake: Number(channels["5"] ?? 0),
    drs: Number(channels["45"] ?? 0),
    time,
    lapNumber,
  };
}

// ── Pit stop ─────────────────────────────────────────────────────────────────

export interface PitStop {
  driverNumber: number;
  lapNumber: number;
  stopNumber: number;
  pitDuration: number | null; // seconds
  date: string;
}

export function pitStopFromJson(json: Json): PitStop {
  return {
    driverNumber: Number(json.driver_number ?? 0),
    lapNumber: Number(json.lap_number ?? 0),
    stopNumber: Number(json.stop_number ?? 1),
    pitDuration: json.pit_duration != null ? Number(json.pit_duration) : null,
    date: json.date?.toString() ?? "",
  };
}

export function formattedPitDuration(p: PitStop): string {
  return p.pitDuration == null ? "-" : `${p.pitDuration.toFixed(1)}s`;
}

export function pitStopTimeStr(p: PitStop): string {
  const dt = new Date(p.date);
  if (Number.isNaN(dt.getTime())) return "";
  const h = String(dt.getHours()).padStart(2, "0");
  const m = String(dt.getMinutes()).padStart(2, "0");
  const s = String(dt.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ── Team radio ───────────────────────────────────────────────────────────────

export interface TeamRadioMessage {
  utc: string;
  racingNumber: string;
  /** Full URL to the MP3 file on the F1 CDN. */
  recordingUrl: string;
  transcript: string | null;
}

/** From WebSocket NewTeamRadio (path is relative). */
export function teamRadioFromWsJson(json: Json): TeamRadioMessage {
  const path: string = json.Path ?? "";
  const url = path.startsWith("http") ? path : `https://livetiming.formula1.com/static/${path}`;
  return {
    utc: json.Utc ?? "",
    racingNumber: json.RacingNumber?.toString() ?? "",
    recordingUrl: url,
    transcript: json.Transcript ?? null,
  };
}

/** From REST /api/teamradio. */
export function teamRadioFromRestJson(json: Json): TeamRadioMessage {
  return {
    utc: json.date ?? "",
    racingNumber: json.driver_number?.toString() ?? "",
    recordingUrl: json.recording_url ?? "",
    transcript: json.transcript ?? null,
  };
}

/** One completed lap's time, keyed to its lap number. */
export interface LapRecord {
  lapNumber: number;
  time: number;
}

// ── Full live snapshot ──────────────────────────────────────────────────────

export interface LiveSnapshot {
  leaderboard: Record<string, LeaderboardEntry>;
  weather: WeatherData;
  /** F1's live broadcast commentary stream(s). Empty until the feed sends it. */
  audioStreams: AudioStreamInfo[];
  trackStatus: TrackStatus;
  raceControl: RaceControlMessage[];
  sessionInfo: SessionInfo | null;
  clock: ExtrapolatedClock | null;
  telemetry: Record<number, CarTelemetry>;
  /** Per-driver time-ordered telemetry ticks (oldest -> newest), capped in the store. */
  telemetryHistory: Record<number, TelemetrySample[]>;
  /** Per-driver completed-lap times for the whole session (oldest -> newest). */
  lapTimeHistory: Record<number, LapRecord[]>;
  /** Per-driver [s1, s2, s3] durations for the lap currently in progress. */
  currentLapSectors: Record<number, (number | null)[]>;
  // Client-side DVR
  playbackDelayMs: number;
  paused: boolean;
  bufferedMs: number;
  connected: boolean;
  // Track map
  carPositions: Record<string, TrackPoint>;
  trackDots: TrackPoint[];
  /** Per-driver time-ordered position samples (oldest -> newest), capped in the store. */
  positionHistory: Record<string, PositionSample[]>;
  teamRadio: TeamRadioMessage[];
  pitStops: PitStop[];
  currentLap: number | null;
  totalLaps: number | null;
  /** Qualifying only: current part (1/2/3). */
  qualifyingPart: number | null;
  /** Race/Sprint only: starting grid position keyed by driver number. */
  gridPositions: Record<number, number>;
  /** Per-driver steward status, derived from parsing race control messages. */
  stewardStatuses: Record<number, DriverSteward>;
  debugInfo: string | null;
}

export function emptyLiveSnapshot(): LiveSnapshot {
  return {
    leaderboard: {},
    weather: emptyWeather,
    audioStreams: [],
    trackStatus: clearTrackStatus,
    raceControl: [],
    sessionInfo: null,
    clock: null,
    telemetry: {},
    telemetryHistory: {},
    lapTimeHistory: {},
    currentLapSectors: {},
    playbackDelayMs: 0,
    paused: false,
    bufferedMs: 0,
    connected: false,
    carPositions: {},
    trackDots: [],
    positionHistory: {},
    teamRadio: [],
    pitStops: [],
    currentLap: null,
    totalLaps: null,
    qualifyingPart: null,
    gridPositions: {},
    stewardStatuses: {},
    debugInfo: null,
  };
}

/** The stream to actually play — prefers English, falls back to F1's first. */
export function primaryCommentaryStream(s: Pick<LiveSnapshot, "audioStreams">): AudioStreamInfo | null {
  if (s.audioStreams.length === 0) return null;
  return s.audioStreams.find((a) => a.language.toLowerCase() === "en") ?? s.audioStreams[0];
}

export function sortedLeaderboard(s: Pick<LiveSnapshot, "leaderboard">): LeaderboardEntry[] {
  return Object.values(s.leaderboard).sort((a, b) => a.position - b.position);
}

/**
 * Ghost-driver guard: only entries with activity this session (telemetry,
 * a last lap time, a completed lap, or a current-session sector time).
 * Fail-open: if this would drop everyone, fall back to the unfiltered list.
 * Only reads leaderboard/telemetry — callers can pass just those two fields
 * rather than a full LiveSnapshot.
 */
export function activeSortedLeaderboard(s: Pick<LiveSnapshot, "leaderboard" | "telemetry">): LeaderboardEntry[] {
  const sorted = sortedLeaderboard(s);
  const isActive = (e: LeaderboardEntry) =>
    e.driverNumber in s.telemetry ||
    e.lastLapTime != null ||
    (e.lapNumber ?? 0) > 0 ||
    e.sectorTimes.some((v) => v != null);
  const active = sorted.filter(isActive);
  return active.length === 0 ? sorted : active;
}
