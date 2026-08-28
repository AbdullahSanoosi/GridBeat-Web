/** Ported from GridBeat (Flutter) lib/features/results/providers/results_provider.dart. */
import type { Row } from "@/lib/api/types";

export interface ArchiveRace {
  season: string;
  round: string;
  raceName: string;
  circuitName: string;
  circuitId: string;
  locality: string;
  country: string;
  date: string;
  time: string | null;
  winnerName: string | null;
  winnerTeam: string | null;
}

export interface ChampionEntry {
  season: string;
  name: string;
  team: string | null;
  points: string;
  wins: string;
  nationality: string | null;
}

/** All F1 seasons descending (current -> 1950). */
export function archiveSeasons(): string[] {
  const current = new Date().getFullYear();
  return Array.from({ length: current - 1950 + 1 }, (_, i) => String(current - i));
}

/**
 * Merges races + winners (see getSeasonRacesWithCircuit/getSeasonWinners in
 * stats-api.ts) by round, resolving winner driver/constructor ids via the
 * entity-names map.
 */
export function archiveRacesFromRows(
  season: string,
  races: Row[],
  winners: Row[],
  names: Record<string, string>,
): ArchiveRace[] {
  const winnerByRound = new Map<number, Row>(winners.map((w) => [w.round as number, w]));

  return races.map((r) => {
    const circuit = (r.circuits as Row | null) ?? {};
    const winner = winnerByRound.get(r.round as number);
    return {
      season,
      round: String(r.round),
      raceName: (r.race_name as string) ?? "",
      circuitName: (circuit.name as string) ?? "",
      circuitId: (r.circuit_id as string) ?? "",
      locality: (circuit.locality as string) ?? "",
      country: (circuit.country as string) ?? "",
      date: (r.race_date as string) ?? "",
      time: (r.race_time as string | null) ?? null,
      winnerName: winner ? (names[winner.driver_id as string] ?? null) : null,
      winnerTeam: winner ? (names[winner.constructor_id as string] ?? null) : null,
    };
  });
}

export function driverChampionsFromRows(rows: Row[]): ChampionEntry[] {
  return rows.map((r) => {
    const d = (r.drivers as Row) ?? {};
    const c = r.constructors as Row | null;
    return {
      season: String(r.season),
      name: `${d.given_name ?? ""} ${d.family_name ?? ""}`.toString().trim(),
      team: (c?.name as string | null) ?? null,
      points: String(r.points ?? "0"),
      wins: String(r.wins ?? "0"),
      nationality: (d.nationality as string | null) ?? null,
    };
  });
}

export function constructorChampionsFromRows(rows: Row[]): ChampionEntry[] {
  return rows.map((r) => {
    const c = (r.constructors as Row) ?? {};
    return {
      season: String(r.season),
      name: (c.name as string) ?? "",
      team: null,
      points: String(r.points ?? "0"),
      wins: String(r.wins ?? "0"),
      nationality: (c.nationality as string | null) ?? null,
    };
  });
}
