/**
 * Ported from GridBeat (Flutter)
 * lib/features/schedule/presentation/race_details_screen.dart +
 * lib/features/standings/data/models/standings_models.dart +
 * lib/features/standings/providers/standings_provider.dart.
 *
 * Simplified vs. the Flutter version: that one reshapes stats-api rows into
 * a Jolpica-nested, string-typed JSON shape purely so it could reuse a
 * RaceResult model originally written for Ergast responses (same pattern
 * standings.ts already documents). There's no such legacy model to reuse
 * here, so these map directly off the stats-api row shape instead — one
 * fewer indirection, same computed values (gap/interval math is ported
 * verbatim from _shapeRaceResults / _RaceResultsList._computeIntervals).
 */
import type { Row } from "@/lib/api/types";
import { type F1Driver, type F1Constructor, driverFromRow, constructorFromRow } from "./standings";

export type { F1Driver, F1Constructor };

export interface RaceResult {
  position: string;
  positionText: string | null;
  points: string | null;
  driver: F1Driver;
  constructor: F1Constructor;
  grid: string | null;
  laps: string | null;
  status: string | null;
  /** Absolute race time in ms — leader only; everyone else has a gap instead. */
  timeMillis: number | null;
  fastestLapRank: string | null;
  fastestLapTime: string | null;
}

export function raceResultFromRow(r: Row): RaceResult {
  const d = (r.drivers as Row) ?? {};
  const c = (r.constructors as Row) ?? {};
  return {
    position: String(r.position ?? ""),
    positionText: r.position_text != null ? String(r.position_text) : null,
    points: r.points != null ? String(r.points) : null,
    driver: driverFromRow(d),
    constructor: constructorFromRow(c),
    grid: r.grid != null ? String(r.grid) : null,
    laps: r.laps != null ? String(r.laps) : null,
    status: (r.status as string | null) ?? null,
    timeMillis: (r.time_millis as number | null) ?? null,
    fastestLapRank: r.fastest_lap_rank != null ? String(r.fastest_lap_rank) : null,
    fastestLapTime: (r.fastest_lap_time as string | null) ?? null,
  };
}

/** sprint_results has no time/fastest-lap columns — sprintResultFromRow leaves them null. */
export function sprintResultFromRow(r: Row): RaceResult {
  const d = (r.drivers as Row) ?? {};
  const c = (r.constructors as Row) ?? {};
  return {
    position: String(r.position ?? ""),
    positionText: r.position_text != null ? String(r.position_text) : null,
    points: r.points != null ? String(r.points) : null,
    driver: driverFromRow(d),
    constructor: constructorFromRow(c),
    grid: r.grid != null ? String(r.grid) : null,
    laps: null,
    status: (r.status as string | null) ?? null,
    timeMillis: null,
    fastestLapRank: null,
    fastestLapTime: null,
  };
}

export function isFinished(r: RaceResult): boolean {
  return r.positionText != null && Number.isFinite(Number(r.positionText));
}

export interface QualifyingResult {
  position: string;
  driver: F1Driver;
  constructor: F1Constructor;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export function qualifyingResultFromRow(r: Row): QualifyingResult {
  const d = (r.drivers as Row) ?? {};
  const c = (r.constructors as Row) ?? {};
  return {
    position: String(r.position ?? ""),
    driver: driverFromRow(d),
    constructor: constructorFromRow(c),
    q1: (r.q1 as string | null) ?? null,
    q2: (r.q2 as string | null) ?? null,
    q3: (r.q3 as string | null) ?? null,
  };
}

/** m:ss.mmm — practice_results has no pre-formatted time string like race/qualifying do. */
function fmtLapSeconds(secs: number): string {
  const ms = Math.round(secs * 1000);
  const minutes = Math.floor(ms / 60000);
  const rest = (ms % 60000) / 1000;
  const secStr = rest.toFixed(3).padStart(6, "0");
  return minutes > 0 ? `${minutes}:${secStr}` : rest.toFixed(3);
}

/** A computed fastest-lap ranking (OpenF1-sourced), not an FIA-published classification. */
export interface PracticeResult {
  position: string;
  driver: F1Driver;
  constructor: F1Constructor;
  bestLapTime: string | null;
  bestLapSeconds: number | null;
  laps: string | null;
}

export function practiceResultFromRow(r: Row): PracticeResult {
  const d = (r.drivers as Row) ?? {};
  const c = (r.constructors as Row) ?? {};
  const bestLap = r.best_lap_time as number | null;
  return {
    position: String(r.position ?? ""),
    driver: driverFromRow(d),
    constructor: constructorFromRow(c),
    bestLapTime: bestLap != null ? fmtLapSeconds(bestLap) : null,
    bestLapSeconds: bestLap,
    laps: r.laps != null ? String(r.laps) : null,
  };
}

export interface PitStop {
  driverId: string;
  stopNumber: number;
  lap: number | null;
  duration: string | null;
}

export function pitStopFromRow(r: Row): PitStop {
  return {
    driverId: (r.driver_id as string) ?? "",
    stopNumber: Number(r.stop_number ?? 0),
    lap: r.lap != null ? Number(r.lap) : null,
    duration: (r.duration as string | null) ?? null,
  };
}

export interface LapLeader {
  lap: number;
  driverId: string;
  driverCode: string;
  constructorId: string;
  constructorName: string;
}

export function lapLeaderFromRow(r: Row): LapLeader {
  const d = (r.drivers as Row) ?? {};
  const c = (r.constructors as Row) ?? {};
  return {
    lap: Number(r.lap ?? 0),
    driverId: (r.driver_id as string) ?? "",
    driverCode: (d.code as string | null) ?? ((d.family_name as string) ?? "").slice(0, 3).toUpperCase(),
    constructorId: (r.constructor_id as string) ?? "",
    constructorName: (c.name as string) ?? "",
  };
}

/** "Doe" (>=3 letters) or the driver's own code — same 3-letter fallback used throughout the app. */
export function driverCode(d: F1Driver): string {
  return d.code ?? d.familyName.slice(0, 3).toUpperCase();
}

// ── Race-tab gap/interval math ──────────────────────────────────────────────
// Ported verbatim from _RaceResultsList._computeIntervals /
// _fmtMs / _shapeRaceResults._fmtGapMs / _fmtAbsoluteMs in
// race_details_screen.dart + standings_provider.dart — matches Oversteer's
// calculateIntervals()/formatMillisToTime() so the numbers read the same as
// every other F1 results app.

function fmtAbsoluteMs(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = (ms % 60000) / 1000;
  const secStr = seconds.toFixed(3).padStart(6, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secStr}` : `${minutes}:${secStr}`;
}

/**
 * `ms` is meant to always be a positive gap, but a non-same-lap row's
 * time_millis isn't really comparable to the leader's (see the isSpecial
 * comment in race-results.tsx's RaceResultRow) and can legitimately go
 * negative — Math.abs keeps this from ever emitting a double-signed
 * "+-35.530" (JS's `%` keeps the dividend's sign, unlike Dart's).
 */
function fmtGapMs(rawMs: number): string {
  const ms = Math.abs(rawMs);
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  return minutes > 0 ? `+${minutes}:${seconds.toFixed(3).padStart(6, "0")}` : `+${seconds.toFixed(3)}`;
}

/**
 * Interval to the car immediately ahead — deliberately a different
 * formatter from fmtGapMs above (ported from _RaceResultsList._fmtMs, not
 * _shapeRaceResults._fmtGapMs): no leading "+", integer h/m/s/ms division
 * rather than a decimal split. The two read differently in the Flutter app
 * on purpose — INTERVAL (this) vs. GAP TO LEADER (fmtGapMs) are separate
 * tiles on the result card.
 */
function fmtIntervalMs(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor(ms / 60000) % 60;
  const seconds = Math.floor(ms / 1000) % 60;
  const millis = ms % 1000;
  const msStr = String(millis).padStart(3, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${msStr}`;
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, "0")}.${msStr}`;
  return `${seconds}.${msStr}`;
}

/** The leader's own row: absolute time. Every other classified row: "+gap". DNF/DNS/etc: null (status text wins). */
export function raceTimeDisplay(results: RaceResult[], r: RaceResult): string | null {
  if (r.timeMillis == null) return null;
  const leaderMillis = results[0]?.timeMillis;
  if (leaderMillis != null && r.timeMillis !== leaderMillis) return fmtGapMs(r.timeMillis - leaderMillis);
  return fmtAbsoluteMs(r.timeMillis);
}

/**
 * Per-row interval: DNF/DNS/DSQ/DNQ status word, "+N Lap(s)" once a driver
 * falls a lap down, else the gap to the car immediately ahead (not the
 * leader — that's raceTimeDisplay's job).
 */
export function computeIntervals(results: RaceResult[]): (string | null)[] {
  if (results.length === 0) return [];
  const leaderLaps = results[0].laps != null ? Number(results[0].laps) : null;
  return results.map((r, i) => {
    const status = (r.status ?? "").toLowerCase();
    if (status.includes("retired") || status === "dnf") return "DNF";
    if (status.includes("did not start") || status === "dns") return "DNS";
    if (status.includes("disqualified") || status === "dsq") return "DSQ";
    if (status.includes("did not qualify") || status === "dnq") return "DNQ";
    if (i === 0) return null;

    const laps = r.laps != null ? Number(r.laps) : null;
    if (leaderLaps != null && laps != null && laps < leaderLaps) {
      const lapsDown = leaderLaps - laps;
      return `+${lapsDown} Lap${lapsDown > 1 ? "s" : ""}`;
    }

    const prev = results[i - 1];
    if (r.timeMillis != null && prev.timeMillis != null) {
      const interval = r.timeMillis - prev.timeMillis;
      if (interval >= 0) return fmtIntervalMs(interval);
    }
    return raceTimeDisplay(results, r);
  });
}

/** "22.456" or "1:22.456" → total seconds. */
function parsePitDuration(raw: string): number {
  const parts = raw.split(":");
  if (parts.length === 2) {
    const mins = Number(parts[0]) || 0;
    const secs = Number(parts[1]);
    return mins * 60 + (Number.isFinite(secs) ? secs : Infinity);
  }
  const secs = Number(raw);
  return Number.isFinite(secs) ? secs : Infinity;
}

/** Fastest of the race's pit stops, skipping SC/VSC-length ones (>60s), as "Team (22.456)". */
export function fastestPitDisplay(pitStops: PitStop[], results: RaceResult[]): string {
  let fastest: PitStop | null = null;
  let fastestSecs = Infinity;
  for (const p of pitStops) {
    if (!p.duration) continue;
    const secs = parsePitDuration(p.duration);
    if (secs > 60) continue;
    if (secs < fastestSecs) {
      fastestSecs = secs;
      fastest = p;
    }
  }
  if (!fastest) return "N/A";
  const team = results.find((r) => r.driver.driverId === fastest.driverId)?.constructor.name ?? fastest.driverId;
  return `${team} (${fastest.duration})`;
}
