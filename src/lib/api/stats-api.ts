/**
 * Ported from GridBeat (Flutter) lib/services/stats_api_service.dart.
 * Read-only PostgREST client over the personal F1 stats mirror
 * (1950-present, 82 computed metrics, daily refresh). Schema/catalog docs
 * live at `${config.statsApiBaseUrl}/docs`.
 *
 * Method-for-method port of the Dio client — same endpoints, same query
 * params, same client-side reshaping where the Flutter version did any
 * (getSchedule flattens the embedded `circuits` relation, for example).
 * Kept as free functions rather than a class: there's no per-instance state
 * to hold (Dio's BaseOptions become one shared fetch wrapper below).
 */
import { config } from "@/lib/config";
import { type ComputedStat, type Row, computedStatFromRow } from "./types";

async function get(path: string, query: Record<string, string | number | undefined>): Promise<Row[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const url = `${config.statsApiBaseUrl}${path}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`stats-api ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Row[];
}

/**
 * Exact row count for a table, without transferring the rows: PostgREST
 * returns it in the Content-Range header when asked for `count=exact` over
 * an empty range. Used for the homepage's archive figures so they're the
 * live size of the mirror rather than numbers baked into the page.
 */
export async function getTableCount(table: string): Promise<number | null> {
  const res = await fetch(`${config.statsApiBaseUrl}/${table}?select=*`, {
    headers: { Prefer: "count=exact", Range: "0-0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok && res.status !== 206) return null;
  const total = res.headers.get("content-range")?.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : null;
}

/** When the daily sync last ran, and the most recent race it has full results for. */
export async function getSyncStatus(): Promise<Row | null> {
  const rows = await get("/sync_status", { limit: 1 });
  return rows[0] ?? null;
}

// ── computed_stats ──────────────────────────────────────────────────────────

export async function getComputedStats(opts: {
  metricKey: string;
  entityType?: string;
  periodFrom?: number;
  limit?: number;
  order?: string;
}): Promise<ComputedStat[]> {
  const rows = await get("/computed_stats", {
    metric_key: `eq.${opts.metricKey}`,
    order: opts.order ?? "value.desc",
    entity_type: opts.entityType ? `eq.${opts.entityType}` : undefined,
    period_from: opts.periodFrom !== undefined ? `eq.${opts.periodFrom}` : undefined,
    limit: opts.limit,
  });
  return rows.map(computedStatFromRow);
}

/** Every computed_stats row for one entity — one request for a whole detail screen. */
export async function getStatsForEntity(entityId: string): Promise<ComputedStat[]> {
  const rows = await get("/computed_stats", { entity_id: `eq.${entityId}` });
  return rows.map(computedStatFromRow);
}

/** e.g. "most wins at this circuit" (entity_type driver_circuit/constructor_circuit). */
export async function getCircuitLeaderboard(opts: {
  circuitId: string;
  metricKey: string;
  entityType: string;
  limit?: number;
}): Promise<ComputedStat[]> {
  const rows = await get("/computed_stats", {
    metric_key: `eq.${opts.metricKey}`,
    entity_type: `eq.${opts.entityType}`,
    entity_id: `like.*__${opts.circuitId}`,
    order: "value.desc",
    limit: opts.limit,
  });
  return rows.map(computedStatFromRow);
}

/** e.g. "most wins for this team, by driver" (entity_id `<driverId>__<constructorId>`). */
export async function getTeamLeaderboard(opts: {
  constructorId: string;
  metricKey: string;
  limit?: number;
}): Promise<ComputedStat[]> {
  const rows = await get("/computed_stats", {
    metric_key: `eq.${opts.metricKey}`,
    entity_type: "eq.driver_team",
    entity_id: `like.*__${opts.constructorId}`,
    order: "value.desc",
    limit: opts.limit,
  });
  return rows.map(computedStatFromRow);
}

/** Season-by-season constructor championship standing — championship-finish-by-year chart. */
export function getConstructorStandingsHistory(constructorId: string): Promise<Row[]> {
  return get("/constructor_standings", {
    constructor_id: `eq.${constructorId}`,
    select: "season,position,points,wins",
    order: "season.asc",
  });
}

/** Season-by-season driver championship standing. */
export function getDriverStandingsHistory(driverId: string): Promise<Row[]> {
  return get("/driver_standings", {
    driver_id: `eq.${driverId}`,
    select: "season,position,points,wins",
    order: "season.asc",
  });
}

/** Full career race results for one driver — race-by-race results grid. */
export function getDriverCareerResults(driverId: string): Promise<Row[]> {
  return get("/race_results", {
    driver_id: `eq.${driverId}`,
    select: "season,round,position,position_text,status,points,constructor_id",
    order: "season.asc,round.asc",
  });
}

/** This constructor's best circuit for one metric (wins/podiums/poles). */
export async function getConstructorBestCircuit(opts: {
  constructorId: string;
  metricKey: string;
}): Promise<ComputedStat | null> {
  const rows = await get("/computed_stats", {
    metric_key: `eq.${opts.metricKey}`,
    entity_type: "eq.constructor_circuit",
    entity_id: `like.${opts.constructorId}__*`,
    order: "value.desc",
    limit: 1,
  });
  return rows[0] ? computedStatFromRow(rows[0]) : null;
}

/** Every row for a circuit_driver metric at one circuit. */
export async function getCircuitDriverStats(opts: {
  circuitId: string;
  metricKey: string;
}): Promise<ComputedStat[]> {
  const rows = await get("/computed_stats", {
    metric_key: `eq.${opts.metricKey}`,
    entity_id: `like.${opts.circuitId}__*`,
    order: "value.asc",
  });
  return rows.map(computedStatFromRow);
}

// ── Reference data (name directory) ─────────────────────────────────────────

export function getAllDrivers(): Promise<Row[]> {
  return get("/drivers", {
    select: "driver_id,given_name,family_name,code,nationality,date_of_birth,image_url",
    limit: 1000,
  });
}

export function getAllConstructors(): Promise<Row[]> {
  return get("/constructors", { select: "constructor_id,name,image_url", limit: 500 });
}

/** All circuits since 1950, including venues no longer on the calendar. */
export function getAllCircuits(): Promise<Row[]> {
  return get("/circuits", {
    select: "circuit_id,name,locality,country,image_url",
    limit: 200,
  });
}

/** Every race in one season, calendar order — race picker on Quali -> Race Progression. */
export function getRacesForSeason(season: number): Promise<Row[]> {
  return get("/races", {
    season: `eq.${season}`,
    select: "round,race_name,circuit_id,race_date",
    order: "round.asc",
  });
}

/**
 * Full weekend schedule for a season — race + FP1-3/qualifying/sprint
 * session times, circuit locality/country flattened client-side from the
 * embedded `circuits` relation (same shape the Flutter app's F1Race.fromSupabase
 * expects, so page code can reuse that shape as-is).
 */
export async function getSchedule(season: number): Promise<Row[]> {
  const rows = await get("/races", {
    season: `eq.${season}`,
    select:
      "season,round,race_name,circuit_id,race_date,race_time," +
      "fp1_date,fp1_time,fp2_date,fp2_time,fp3_date,fp3_time," +
      "qualifying_date,qualifying_time," +
      "sprint_qualifying_date,sprint_qualifying_time,sprint_date,sprint_time," +
      "circuits(locality,country)",
    order: "round.asc",
  });
  return rows.map((r) => {
    const circuit = (r.circuits as Row | null) ?? {};
    const flat = { ...r };
    delete flat.circuits;
    flat.locality = circuit.locality ?? null;
    flat.country = circuit.country ?? null;
    return flat;
  });
}

/** Races for a season with circuit name/locality/country embedded — pair with getSeasonWinners(). */
export function getSeasonRacesWithCircuit(season: number): Promise<Row[]> {
  return get("/races", {
    season: `eq.${season}`,
    select: "round,race_name,race_date,race_time,circuit_id,circuits(name,locality,country)",
    order: "round.asc",
  });
}

/** Winning driver/constructor for every completed race in a season. */
export function getSeasonWinners(season: number): Promise<Row[]> {
  return get("/race_results", {
    season: `eq.${season}`,
    position: "eq.1",
    select: "round,driver_id,constructor_id",
  });
}

export function getDriverStandings(season: number): Promise<Row[]> {
  return get("/driver_standings", {
    season: `eq.${season}`,
    select:
      "position,points,wins," +
      "drivers(driver_id,given_name,family_name,code,nationality,permanent_number,date_of_birth)," +
      "constructors(constructor_id,name,nationality)",
    order: "position.asc",
  });
}

export function getConstructorStandings(season: number): Promise<Row[]> {
  return get("/constructor_standings", {
    season: `eq.${season}`,
    select: "position,points,wins,constructors(constructor_id,name,nationality)",
    order: "position.asc",
  });
}

/** Every season's #1 in the drivers' championship — one request, not one per season. */
export function getAllDriverChampions(): Promise<Row[]> {
  return get("/driver_standings", {
    position: "eq.1",
    select:
      "season,points,wins," +
      "drivers(driver_id,given_name,family_name,nationality)," +
      "constructors(name)",
    order: "season.desc",
  });
}

export function getAllConstructorChampions(): Promise<Row[]> {
  return get("/constructor_standings", {
    position: "eq.1",
    select: "season,points,wins,constructors(constructor_id,name,nationality)",
    order: "season.desc",
  });
}

/**
 * Qualifying + race position for every driver in one race — two requests
 * merged client-side by driver_id, since qualifying_results has no
 * grid/position_text/status and race_results has no qualifying position.
 */
export async function getRaceProgression(
  season: number,
  round: number,
): Promise<{ qualifying: Row[]; race: Row[] }> {
  const [qualifying, race] = await Promise.all([
    get("/qualifying_results", {
      season: `eq.${season}`,
      round: `eq.${round}`,
      select: "driver_id,constructor_id,position",
    }),
    get("/race_results", {
      season: `eq.${season}`,
      round: `eq.${round}`,
      select: "driver_id,constructor_id,grid,position,position_text,status",
    }),
  ]);
  return { qualifying, race };
}

/** The most recently completed race of a season — round, top-3 qualifiers, top-3 finishers. */
export async function getLastRacePodium(season: number): Promise<Row | null> {
  const latest = await get("/race_results", {
    season: `eq.${season}`,
    position: "eq.1",
    order: "round.desc",
    limit: 1,
    select: "round",
  });
  if (latest.length === 0) return null;
  const round = latest[0].round as number;

  const [podium, races, qualifying] = await Promise.all([
    get("/race_results", {
      season: `eq.${season}`,
      round: `eq.${round}`,
      position: "in.(1,2,3)",
      order: "position.asc",
      select: "position,driver_id,constructor_id",
    }),
    get("/races", {
      season: `eq.${season}`,
      round: `eq.${round}`,
      select: "race_name,circuit_id",
      limit: 1,
    }),
    get("/qualifying_results", {
      season: `eq.${season}`,
      round: `eq.${round}`,
      position: "in.(1,2,3)",
      order: "position.asc",
      select: "position,driver_id",
    }),
  ]);
  if (races.length === 0) return null;

  return {
    round,
    raceName: races[0].race_name,
    circuitId: races[0].circuit_id,
    podium,
    qualifying,
  };
}

// ── Small raw-table lookups not worth precomputing as a metric ─────────────

export function getAllDriverTitles(): Promise<Row[]> {
  return get("/driver_standings", { position: "eq.1", select: "season,driver_id" });
}

export function getAllConstructorTitles(): Promise<Row[]> {
  return get("/constructor_standings", { position: "eq.1", select: "season,constructor_id" });
}

/** Earliest race on record for a driver. */
export async function getDriverFirstEntry(driverId: string): Promise<Row | null> {
  const rows = await get("/race_results", {
    driver_id: `eq.${driverId}`,
    order: "season.asc,round.asc",
    limit: 1,
    select: "season,round,constructor_id",
  });
  return rows[0] ?? null;
}

/** driver_id/constructor_id -> display name, for resolving ids embedded in other responses. */
export async function getEntityNames(): Promise<Record<string, string>> {
  const [drivers, constructors] = await Promise.all([getAllDrivers(), getAllConstructors()]);
  const names: Record<string, string> = {};
  for (const d of drivers) {
    names[d.driver_id as string] = `${d.given_name ?? ""} ${d.family_name ?? ""}`.trim();
  }
  for (const c of constructors) {
    names[c.constructor_id as string] = c.name as string;
  }
  return names;
}

// ── Race Details ────────────────────────────────────────────────────────────
// Ported from the getFull*/getPitStops methods of stats_api_service.dart —
// same tables, same select lists, same ordering. Backs /race-details/[raceId].

const RESULT_ENTITY_SELECT =
  "drivers(driver_id,given_name,family_name,code,nationality,permanent_number)," +
  "constructors(constructor_id,name,nationality)";

/** Full race classification, position order, DNFs sorted last. */
export function getFullRaceResults(season: number, round: number): Promise<Row[]> {
  return get("/race_results", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    order: "position.asc.nullslast",
    select:
      `grid,position,position_text,points,status,fastest_lap_rank,fastest_lap_time,time_millis,laps,${RESULT_ENTITY_SELECT}`,
  });
}

/** sprint_results carries no time/fastest-lap columns — Jolpica's sprint endpoint never provided them. */
export function getFullSprintResults(season: number, round: number): Promise<Row[]> {
  return get("/sprint_results", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    order: "position.asc.nullslast",
    select: `grid,position,position_text,points,status,${RESULT_ENTITY_SELECT}`,
  });
}

export function getFullQualifyingResults(season: number, round: number): Promise<Row[]> {
  return get("/qualifying_results", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    order: "position.asc",
    select: `position,q1,q2,q3,${RESULT_ENTITY_SELECT}`,
  });
}

/** One practice/sprint-qualifying session's computed fastest-lap ranking (OpenF1-sourced). */
export function getFullPracticeResults(season: number, round: number, session: string): Promise<Row[]> {
  return get("/practice_results", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    session: `eq.${session}`,
    order: "position.asc.nullslast",
    select: `position,best_lap_time,laps,${RESULT_ENTITY_SELECT}`,
  });
}

/** Every pit stop of one race — used for the fastest-pit banner stat and the full stop list. */
export function getPitStops(season: number, round: number): Promise<Row[]> {
  return get("/pit_stops", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    order: "lap.asc,stop_number.asc",
    select: "driver_id,stop_number,lap,duration",
  });
}

/**
 * One row per lap = the driver/constructor leading that lap — an entirely
 * unused table until this route. Only ingested once a race is fully backfilled
 * (see f1-stats-api's backfill_laps_led.py), so a mid-ingest race legitimately
 * returns fewer rows than its lap count.
 */
export function getLapLeaders(season: number, round: number): Promise<Row[]> {
  return get("/lap_leaders", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    order: "lap.asc",
    select: "lap,driver_id,constructor_id,drivers(driver_id,code,family_name),constructors(constructor_id,name)",
  });
}
