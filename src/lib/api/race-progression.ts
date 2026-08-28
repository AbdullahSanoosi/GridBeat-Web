/**
 * Ported from GridBeat (Flutter) lib/features/stats/providers/race_progression_provider.dart.
 * Powers the Quali -> Race Progression chart: one race's qualifying, grid,
 * and finishing positions merged into a single per-driver record.
 */
import { getAllDrivers, getEntityNames, getRaceProgression, getRacesForSeason as getRacesForSeasonRaw } from "./stats-api";
import { teamColor } from "@/lib/theme/colors";

export interface RaceOption {
  round: number;
  raceName: string;
  circuitId: string;
}

export async function getRacesForSeason(season: number): Promise<RaceOption[]> {
  const rows = await getRacesForSeasonRaw(season);
  return rows.map((r) => ({
    round: Number(r.round),
    raceName: (r.race_name as string | undefined) ?? `Round ${r.round}`,
    circuitId: (r.circuit_id as string | undefined) ?? "",
  }));
}

/** racePos is null when the driver wasn't classified (DNF/DNS/DSQ) — raceStatus carries the reason. */
export interface RaceProgressionEntry {
  driverId: string;
  code: string;
  teamColor: string;
  qualiPos: number | null;
  gridPos: number | null;
  racePos: number | null;
  raceStatus: string | null;
}

export async function getRaceProgressionEntries(season: number, round: number): Promise<RaceProgressionEntry[]> {
  const [{ qualifying, race }, drivers, names] = await Promise.all([
    getRaceProgression(season, round),
    getAllDrivers(),
    getEntityNames(),
  ]);

  const driverRef = new Map(drivers.map((d) => [d.driver_id as string, d]));
  const qualiByDriver = new Map(qualifying.map((q) => [q.driver_id as string, q]));
  const raceByDriver = new Map(race.map((r) => [r.driver_id as string, r]));
  const driverIds = new Set([...qualiByDriver.keys(), ...raceByDriver.keys()]);

  function codeFor(driverId: string): string {
    const code = (driverRef.get(driverId)?.code as string | undefined) ?? "";
    if (code) return code.toUpperCase();
    // Older drivers often predate Jolpica's TLA convention — fall back to
    // the first 3 letters of the family name.
    const full = names[driverId] ?? driverId;
    const family = full.split(" ").pop() ?? full;
    return family.length >= 3 ? family.slice(0, 3).toUpperCase() : family.toUpperCase().padEnd(3, "·");
  }

  const entries: RaceProgressionEntry[] = [];
  for (const id of driverIds) {
    const q = qualiByDriver.get(id);
    const r = raceByDriver.get(id);
    const constructorId = (r?.constructor_id ?? q?.constructor_id) as string | undefined;
    const constructorName = constructorId ? (names[constructorId] ?? constructorId) : undefined;
    const qualiPos = q?.position != null ? Number(q.position) : null;
    const gridPos = r?.grid != null ? Number(r.grid) : null;
    const racePos = r?.position != null ? Number(r.position) : null;
    entries.push({
      driverId: id,
      code: codeFor(id),
      teamColor: constructorName ? teamColor(constructorName) : "#B52400",
      qualiPos,
      gridPos,
      racePos,
      raceStatus: racePos == null ? ((r?.position_text as string | undefined) ?? (r?.status as string | undefined) ?? null) : null,
    });
  }
  return entries;
}
