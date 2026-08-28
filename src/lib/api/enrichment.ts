/**
 * Ported from GridBeat (Flutter) lib/features/shared/providers/enrichment_provider.dart —
 * merges hand-written editorial content from Supabase with computed metrics
 * from the stats-api. Note the Flutter app also layers a large (~880 line)
 * hardcoded CircuitFacts fallback dataset under this for circuits Supabase
 * doesn't have an entry for yet (lib/features/schedule/data/circuit_facts.dart)
 * — that fallback wasn't ported here; circuits without a Supabase row just
 * show what stats-api alone provides (name/locality/country/image). Worth
 * revisiting if that gap turns out to matter in practice.
 */
import { config } from "@/lib/config";
import { supabase } from "./supabase";
import {
  getAllConstructorTitles,
  getAllConstructors,
  getAllDriverTitles,
  getAllDrivers,
  getDriverFirstEntry,
  getEntityNames,
  getStatsForEntity,
} from "./stats-api";
import type { Row } from "./types";

export interface CircuitDetail {
  circuitId: string;
  imageUrl: string | null;
  circuitDescription: string | null;
  circuitBasicInfo: string[];
  circuitPodiums: string[];
  fastestLaps: string[];
  fastestPit: string[];
  dotd: string | null;
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

function formatLapTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const rest = totalMs % 60000;
  const secs = Math.floor(rest / 1000);
  const ms = rest % 1000;
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export async function getCircuitDetail(circuitId: string): Promise<CircuitDetail | null> {
  const { data, error } = await supabase
    .from("CircuitDetails")
    .select()
    .eq("circuitId", circuitId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Row;
  const [names, circuitStats] = await Promise.all([
    getEntityNames(),
    getStatsForEntity(circuitId),
  ]);
  const lapStat = circuitStats.find((s) => s.metricKey === "fastest_lap_alltime");
  const pitStat = circuitStats.find((s) => s.metricKey === "fastest_pit_alltime");

  const fastestLaps = lapStat
    ? [
        names[lapStat.extra?.driver_id as string] ?? String(lapStat.extra?.driver_id ?? "-"),
        formatLapTime(lapStat.value),
        String(lapStat.extra?.season ?? ""),
      ]
    : [];
  const fastestPit = pitStat
    ? [
        names[pitStat.extra?.constructor_id as string] ?? String(pitStat.extra?.constructor_id ?? "-"),
        `${pitStat.value.toFixed(3)}s`,
        String(pitStat.extra?.season ?? ""),
      ]
    : [];

  return {
    circuitId: (row.circuitId as string) ?? circuitId,
    imageUrl: (row.imageUrl as string | null) ?? null,
    circuitDescription: (row.circuitDescription as string | null) ?? null,
    circuitBasicInfo: toStringArray(row.circuitBasicInfo),
    circuitPodiums: toStringArray(row.circuitPodiums),
    fastestLaps,
    fastestPit,
    dotd: (row.dotd as string | null) ?? null,
  };
}

// circuitBasicInfo is a positional array: [country, city, lengthKm, laps, turns, topSpeed, elevationChange]
export function circuitBasicField(detail: CircuitDetail, index: number): string {
  return detail.circuitBasicInfo[index] ?? "";
}

// ── Driver / Constructor detail ─────────────────────────────────────────────
// Ported from enrichment_provider.dart's driverDetailProvider/constructorDetailProvider.
// Bio/image/roster content stays on Supabase (hand-written editorial, doesn't
// change from race data). Wins/podiums/poles/dnfs/titles/firsts come from the
// F1 Stats API instead — full history, refreshed daily, no manual upkeep.

export interface DriverDetail {
  driverId: string;
  imageUrl: string | null;
  about: string | null;
  wdc: number;
  firstEntry: string | null;
  firstWin: string | null;
  firstPodium: string | null;
  nationality: string;
  dateOfBirth: string;
  carNumber: string;
  /** [wins, podiums, poles, dnfs] */
  careerStats: [string, string, string, string];
  /** [wins, podiums, poles, dnfs] */
  seasonStats: [string, string, string, string];
}

export async function getDriverDetail(driverId: string): Promise<DriverDetail> {
  const { data: bioRow } = await supabase
    .from("DriverDetails")
    .select()
    .eq("driverId", driverId)
    .maybeSingle();
  const row = (bioRow as Row | null) ?? null;

  const [stats, titleRows, names, drivers, entry] = await Promise.all([
    getStatsForEntity(driverId),
    getAllDriverTitles(),
    getEntityNames(),
    getAllDrivers(),
    getDriverFirstEntry(driverId),
  ]);

  const wdc = titleRows.filter((r) => r.driver_id === driverId).length;
  const reference = drivers.find((d) => d.driver_id === driverId);

  const currentSeason = config.currentSeason;
  const find = (metricKey: string, periodFrom: number | null = null): number =>
    stats.find((s) => s.metricKey === metricKey && s.periodFrom === periodFrom)?.value ?? 0;

  const firstWinStat = stats.find((s) => s.metricKey === "first_win");
  const firstPodiumStat = stats.find((s) => s.metricKey === "first_podium");

  let firstEntry: string | null = null;
  if (entry) {
    const constructorName = names[entry.constructor_id as string] ?? (entry.constructor_id as string);
    firstEntry = `${entry.season}, ${constructorName}`;
  }

  const bioInfo = toStringArray(row?.driverInfo);
  const nationality = bioInfo[0] || (reference?.nationality as string | undefined) || "";
  const dateOfBirth = bioInfo[1] || (reference?.date_of_birth as string | undefined) || "";

  const refImage = reference?.image_url as string | undefined;
  const bioImage = (row?.imageUrl as string | null) ?? null;
  const imageUrl = bioImage || (refImage && refImage.length > 0 ? refImage : null);

  return {
    driverId,
    imageUrl,
    about: (row?.about as string | null) ?? null,
    wdc,
    firstEntry,
    firstWin: firstWinStat ? String(Math.trunc(firstWinStat.value)) : null,
    firstPodium: firstPodiumStat ? String(Math.trunc(firstPodiumStat.value)) : null,
    nationality,
    dateOfBirth,
    carNumber: (reference?.code as string | undefined) ?? "",
    careerStats: [
      String(Math.trunc(find("wins"))),
      String(Math.trunc(find("podiums"))),
      String(Math.trunc(find("poles"))),
      String(Math.trunc(find("dnfs"))),
    ],
    seasonStats: [
      String(Math.trunc(find("wins_season", currentSeason))),
      String(Math.trunc(find("podiums_season", currentSeason))),
      String(Math.trunc(find("poles_season", currentSeason))),
      String(Math.trunc(find("dnfs_season", currentSeason))),
    ],
  };
}

export interface ConstructorDetail {
  constructorId: string;
  imageUrl: string | null;
  carImageUrl: string | null;
  about: string | null;
  chassis: string | null;
  powerUnit: string | null;
  teamPrincipal: string | null;
  firstEntry: string | null;
  wcc: number;
  wdc: number;
  /** [wins, podiums, poles] */
  totalStats: [string, string, string];
  firstDriver: string[];
  secondDriver: string[];
}

export async function getConstructorDetail(constructorId: string): Promise<ConstructorDetail> {
  const { data: bioRow } = await supabase
    .from("ConstructorDetails")
    .select()
    .eq("constructorId", constructorId)
    .maybeSingle();
  const row = (bioRow as Row | null) ?? null;

  const [stats, titleRows, constructors] = await Promise.all([
    getStatsForEntity(constructorId),
    getAllConstructorTitles(),
    getAllConstructors(),
  ]);

  const wcc = titleRows.filter((r) => r.constructor_id === constructorId).length;
  const reference = constructors.find((c) => c.constructor_id === constructorId);

  const find = (metricKey: string): number =>
    stats.find((s) => s.metricKey === metricKey && s.periodFrom === null)?.value ?? 0;

  const refLogo = reference?.image_url as string | undefined;
  const imageUrl = (row?.imageUrl as string | null) ?? (refLogo && refLogo.length > 0 ? refLogo : null);

  return {
    constructorId,
    imageUrl,
    carImageUrl: (row?.carImageUrl as string | null) ?? null,
    about: (row?.about as string | null) ?? null,
    chassis: (row?.chassis as string | null) ?? null,
    powerUnit: (row?.powerUnit as string | null) ?? null,
    teamPrincipal: (row?.teamPrincipal as string | null) ?? null,
    firstEntry: (row?.firstEntry as string | null) ?? null,
    wcc,
    wdc: (row?.wdc as number | null) ?? 0,
    totalStats: [
      String(Math.trunc(find("wins"))),
      String(Math.trunc(find("podiums"))),
      String(Math.trunc(find("poles"))),
    ],
    firstDriver: toStringArray(row?.firstDriver),
    secondDriver: toStringArray(row?.secondDriver),
  };
}
