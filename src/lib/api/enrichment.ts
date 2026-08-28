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
import { supabase } from "./supabase";
import { getEntityNames, getStatsForEntity } from "./stats-api";
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
