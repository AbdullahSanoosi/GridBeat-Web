import type { Row } from "@/lib/api/types";
import { teamColor } from "@/lib/theme/colors";

export interface HomeDriverStanding {
  driverId: string;
  code: string;
  name: string;
  team: string;
  position: number;
  points: number;
  wins: number;
  color: string;
}

export interface HomeConstructorStanding {
  constructorId: string;
  name: string;
  position: number;
  points: number;
  wins: number;
  color: string;
}

export interface ChampionshipPoint {
  round: number;
  [driverId: string]: number;
}

export interface SeasonRaceCount {
  season: number;
  races: number;
}

/**
 * Races per season, straight off the `races` table — the archive chart's
 * only input. The shape of this curve is real history: 7 rounds in 1950,
 * into the twenties today.
 */
export function buildSeasonRaceCounts(rows: Row[]): SeasonRaceCount[] {
  const bySeason = new Map<number, number>();
  for (const row of rows) {
    const season = Number(row.season ?? 0);
    if (!season) continue;
    bySeason.set(season, (bySeason.get(season) ?? 0) + 1);
  }
  return [...bySeason.entries()]
    .map(([season, races]) => ({ season, races }))
    .sort((a, b) => a.season - b.season);
}

export function homeDriverStandingFromRow(row: Row): HomeDriverStanding {
  const driver = (row.drivers as Row | null) ?? {};
  const constructor = (row.constructors as Row | null) ?? {};
  const given = String(driver.given_name ?? "");
  const family = String(driver.family_name ?? "");
  const team = String(constructor.name ?? "");
  return {
    driverId: String(driver.driver_id ?? ""),
    code: String(driver.code ?? `${given[0] ?? ""}${family[0] ?? ""}`),
    name: `${given} ${family}`.trim(),
    team,
    position: Number(row.position ?? 0),
    points: Number(row.points ?? 0),
    wins: Number(row.wins ?? 0),
    color: teamColor(team),
  };
}

export function homeConstructorStandingFromRow(row: Row): HomeConstructorStanding {
  const constructor = (row.constructors as Row | null) ?? {};
  const name = String(constructor.name ?? "");
  return {
    constructorId: String(constructor.constructor_id ?? ""),
    name,
    position: Number(row.position ?? 0),
    points: Number(row.points ?? 0),
    wins: Number(row.wins ?? 0),
    color: teamColor(name),
  };
}

export function buildChampionshipProgression(
  drivers: HomeDriverStanding[],
  raceRows: Row[],
  sprintRows: Row[],
): ChampionshipPoint[] {
  const selected = new Set(drivers.map((driver) => driver.driverId));
  const byRound = new Map<number, Map<string, number>>();

  for (const row of [...raceRows, ...sprintRows]) {
    const driverId = String(row.driver_id ?? "");
    if (!selected.has(driverId)) continue;
    const round = Number(row.round ?? 0);
    if (!round) continue;
    const points = Number(row.points ?? 0);
    const roundPoints = byRound.get(round) ?? new Map<string, number>();
    roundPoints.set(driverId, (roundPoints.get(driverId) ?? 0) + points);
    byRound.set(round, roundPoints);
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const totals = new Map(drivers.map((driver) => [driver.driverId, 0]));
  return rounds.map((round) => {
    const point: ChampionshipPoint = { round };
    for (const driver of drivers) {
      const next = (totals.get(driver.driverId) ?? 0) + (byRound.get(round)?.get(driver.driverId) ?? 0);
      totals.set(driver.driverId, next);
      point[driver.driverId] = next;
    }
    return point;
  });
}
