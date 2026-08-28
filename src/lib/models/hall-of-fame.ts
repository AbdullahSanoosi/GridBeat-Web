/**
 * Ported from GridBeat (Flutter) lib/features/hall_of_fame/providers/hall_of_fame_provider.dart —
 * a full all-time index (every driver/constructor on record since 1950, not
 * just winners), wins/podiums/poles/dnfs defaulting to 0 for anyone who
 * never scored one. Supabase bio images are a bonus enrichment layered on
 * top for whoever's on the current grid, not a requirement — not ported
 * here (this is stats-api-only) since the web dashboard doesn't have a
 * dense-avatar-grid layout to hang photos on; it's a data table instead.
 */
import { getAllConstructors, getAllDrivers, getAllConstructorTitles, getAllDriverTitles, getComputedStats } from "@/lib/api/stats-api";
import type { Row } from "@/lib/api/types";

export interface HallOfFameDriver {
  driverId: string;
  name: string;
  nationality: string;
  titles: number;
  wins: number;
  podiums: number;
  poles: number;
  dnfs: number;
}

export interface HallOfFameConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  titles: number;
  wins: number;
  podiums: number;
  poles: number;
}

function tallyById(rows: Row[], idField: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const id = r[idField] as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function valueById(stats: { entityId: string; value: number }[]): Record<string, number> {
  return Object.fromEntries(stats.map((s) => [s.entityId, s.value]));
}

export async function getDriverHallOfFame(): Promise<HallOfFameDriver[]> {
  const [allDrivers, winsStats, podiumsStats, polesStats, dnfsStats, titleRows] = await Promise.all([
    getAllDrivers(),
    getComputedStats({ metricKey: "wins", entityType: "driver", limit: 1000 }),
    getComputedStats({ metricKey: "podiums", entityType: "driver", limit: 1000 }),
    getComputedStats({ metricKey: "poles", entityType: "driver", limit: 1000 }),
    getComputedStats({ metricKey: "dnfs", entityType: "driver", limit: 1000 }),
    getAllDriverTitles(),
  ]);

  const wins = valueById(winsStats);
  const podiums = valueById(podiumsStats);
  const poles = valueById(polesStats);
  const dnfs = valueById(dnfsStats);
  const titles = tallyById(titleRows, "driver_id");

  const list: HallOfFameDriver[] = allDrivers.map((d) => {
    const driverId = d.driver_id as string;
    return {
      driverId,
      name: `${d.given_name ?? ""} ${d.family_name ?? ""}`.toString().trim(),
      nationality: (d.nationality as string) ?? "",
      titles: titles[driverId] ?? 0,
      wins: wins[driverId] ?? 0,
      podiums: podiums[driverId] ?? 0,
      poles: poles[driverId] ?? 0,
      dnfs: dnfs[driverId] ?? 0,
    };
  });

  return list.sort((a, b) => b.titles - a.titles || b.wins - a.wins);
}

export async function getConstructorHallOfFame(): Promise<HallOfFameConstructor[]> {
  const [allConstructors, winsStats, podiumsStats, polesStats, titleRows] = await Promise.all([
    getAllConstructors(),
    getComputedStats({ metricKey: "wins", entityType: "constructor", limit: 500 }),
    getComputedStats({ metricKey: "podiums", entityType: "constructor", limit: 500 }),
    getComputedStats({ metricKey: "poles", entityType: "constructor", limit: 500 }),
    getAllConstructorTitles(),
  ]);

  const wins = valueById(winsStats);
  const podiums = valueById(podiumsStats);
  const poles = valueById(polesStats);
  const titles = tallyById(titleRows, "constructor_id");

  const list: HallOfFameConstructor[] = allConstructors.map((c) => {
    const constructorId = c.constructor_id as string;
    return {
      constructorId,
      name: (c.name as string) ?? "",
      nationality: "",
      titles: titles[constructorId] ?? 0,
      wins: wins[constructorId] ?? 0,
      podiums: podiums[constructorId] ?? 0,
      poles: poles[constructorId] ?? 0,
    };
  });

  return list.sort((a, b) => b.titles - a.titles || b.wins - a.wins);
}
