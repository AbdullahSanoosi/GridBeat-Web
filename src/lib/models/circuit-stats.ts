/**
 * Ported from GridBeat (Flutter) lib/features/circuit_guide/providers/
 * past_circuits_provider.dart + stats_provider.dart's displayNameFor/
 * _titleCase + the record-derivation logic inlined in
 * circuit_guide_detail_screen.dart's `_PastCircuitScreen`/
 * `_CareerFirstsCard`/`_WinningGridSlotCard`/`_CircuitMiniLeaderboard`.
 *
 * All of this reads `computed_stats` directly and has **no Supabase
 * dependency** — unlike `getCircuitDetail()`'s description/podiums, which
 * are Supabase-only. Keeping that boundary intentional: a circuit with no
 * curated bio (any of the ~52 circuits off the current calendar) still
 * gets every section here, matching the Flutter app's own `_PastCircuitScreen`.
 */
import type { ComputedStat } from "@/lib/api/types";
import type { Row } from "@/lib/api/types";

function titleCase(id: string): string {
  return id
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** entity_id is often a composite `<a>__<b>` key (driver__circuit, etc.) — resolve each half, join with " vs " if both present. */
export function displayNameFor(entityId: string, names: Record<string, string>): string {
  if (names[entityId]) return names[entityId];
  if (entityId.includes("__")) {
    return entityId
      .split("__")
      .map((p) => names[p] ?? titleCase(p))
      .join(" vs ");
  }
  return titleCase(entityId);
}

// ── Fastest lap / pit / quali, career firsts — all from one entity_id=circuitId fetch ──

export interface CircuitLiveStats {
  lapRecord: [string, string, string] | null;
  pitRecord: [string, string, string] | null;
  firstGp: number | null;
  lastGp: number | null;
  races: number | null;
  maidenWin: { driverId: string; season: number } | null;
  maidenPole: { driverId: string; season: number } | null;
  /** [gridSlot, winCount][], sorted by grid slot ascending. */
  winningGridSlots: { total: number; entries: [number, number][] } | null;
}

function fmtLapTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const rest = totalMs % 60000;
  const secs = Math.floor(rest / 1000);
  const ms = rest % 1000;
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

/** Parses the flat list from getStatsForEntity(circuitId) into the pieces the detail page needs. */
export function circuitLiveStats(stats: ComputedStat[], names: Record<string, string>): CircuitLiveStats {
  const find = (key: string) => stats.find((s) => s.metricKey === key) ?? null;

  const lap = find("fastest_lap_alltime");
  const pit = find("fastest_pit_alltime");
  const firstGp = find("first_gp");
  const lastGp = find("last_gp");
  const gps = find("gps");
  const maidenWin = find("maiden_win_here");
  const maidenPole = find("maiden_pole_here");
  const dist = find("winning_grid_slot_distribution");

  return {
    lapRecord: lap
      ? [displayNameFor(String(lap.extra?.driver_id ?? ""), names), fmtLapTime(lap.value), String(lap.extra?.season ?? "")]
      : null,
    pitRecord: pit
      ? [
          displayNameFor(String(pit.extra?.constructor_id ?? ""), names),
          `${pit.value.toFixed(3)}s`,
          String(pit.extra?.season ?? ""),
        ]
      : null,
    firstGp: firstGp ? Math.trunc(firstGp.value) : null,
    lastGp: lastGp ? Math.trunc(lastGp.value) : null,
    races: gps ? Math.trunc(gps.value) : null,
    maidenWin: maidenWin
      ? { driverId: String(maidenWin.extra?.driver_id ?? ""), season: Math.trunc(maidenWin.value) }
      : null,
    maidenPole: maidenPole
      ? { driverId: String(maidenPole.extra?.driver_id ?? ""), season: Math.trunc(maidenPole.value) }
      : null,
    winningGridSlots:
      dist && dist.extra
        ? {
            total: Math.trunc(dist.value),
            entries: Object.entries(dist.extra)
              .map(([slot, count]): [number, number] => [Number(slot), Number(count)])
              .sort((a, b) => a[0] - b[0]),
          }
        : null,
  };
}

/** Every "maiden podium" row for a circuit — there can be several, unlike win/pole. */
export function maidenPodiums(stats: ComputedStat[], names: Record<string, string>): { name: string; season: number }[] {
  return stats
    .filter((s) => s.metricKey === "maiden_podium_here")
    .map((s) => ({ name: displayNameFor(String(s.extra?.driver_id ?? ""), names), season: Math.trunc(s.value) }))
    .sort((a, b) => a.season - b.season);
}

/** One row of a wins/poles/podiums-at-this-circuit leaderboard. */
export interface CircuitLeaderboardRow {
  rank: number;
  name: string;
  value: number;
}

export function circuitLeaderboardRows(stats: ComputedStat[], names: Record<string, string>): CircuitLeaderboardRow[] {
  return stats.map((s, i) => ({
    rank: i + 1,
    name: displayNameFor(s.entityId.split("__")[0], names),
    value: Math.trunc(s.value),
  }));
}

// ── Past circuits (index page) ──────────────────────────────────────────────

export interface PastCircuit {
  circuitId: string;
  name: string;
  city: string;
  country: string;
  firstSeason: number;
  lastSeason: number;
  races: number;
  imageUrl: string | null;
}

/**
 * Circuits that have hosted a GP but aren't in the curated CircuitFacts set
 * (current-era venues) — sourced from `computed_stats` (first_gp/last_gp/
 * gps, entity_type=circuit) joined against `circuits`. Sorted by last
 * season raced, newest first, matching the Flutter provider.
 */
export function buildPastCircuits(
  allCircuits: Row[],
  curatedIds: Set<string>,
  firstGpStats: ComputedStat[],
  lastGpStats: ComputedStat[],
  gpsStats: ComputedStat[],
): PastCircuit[] {
  const firstGp = new Map(firstGpStats.map((s) => [s.entityId, Math.trunc(s.value)]));
  const lastGp = new Map(lastGpStats.map((s) => [s.entityId, Math.trunc(s.value)]));
  const gps = new Map(gpsStats.map((s) => [s.entityId, Math.trunc(s.value)]));

  const past = allCircuits
    .filter((c) => !curatedIds.has(c.circuit_id as string))
    .map((c) => {
      const id = c.circuit_id as string;
      const imageUrl = c.image_url as string | null;
      return {
        circuitId: id,
        name: (c.name as string) ?? "",
        city: (c.locality as string) ?? "",
        country: (c.country as string) ?? "",
        firstSeason: firstGp.get(id) ?? 0,
        lastSeason: lastGp.get(id) ?? 0,
        races: gps.get(id) ?? 0,
        imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null,
      };
    });

  past.sort((a, b) => b.lastSeason - a.lastSeason);
  return past;
}
