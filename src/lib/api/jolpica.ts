/**
 * Ported from the Jolpica (Ergast-compatible) methods of GridBeat (Flutter)
 * lib/services/api_service.dart. Used for race/qualifying results and pit
 * stops — the parts of the app not yet migrated to the personal stats-api.
 * The live-REST methods on the Flutter `ApiService` (getLiveLeaderboard etc.)
 * are intentionally not ported here — those belong to the live-timing layer
 * (Phase 2), not this static data-fetching module.
 */
import { config } from "@/lib/config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function ergastGet(path: string, params: Record<string, string | number> = {}): Promise<Json> {
  const query = new URLSearchParams({ limit: "100", ...toStringRecord(params) });
  const res = await fetch(`${config.ergastBaseUrl}${path}?${query.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`jolpica ${path} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function toStringRecord(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
}

export async function getDriverStandings(season: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/driverstandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists as Json[] | undefined;
  return list?.[0]?.DriverStandings ?? [];
}

export async function getConstructorStandings(season: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/constructorstandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists as Json[] | undefined;
  return list?.[0]?.ConstructorStandings ?? [];
}

export async function getDriverResults(season: string, driverId: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/drivers/${driverId}/results.json`);
  return data?.MRData?.RaceTable?.Races ?? [];
}

export async function getDriverQualifying(season: string, driverId: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/drivers/${driverId}/qualifying.json`);
  return data?.MRData?.RaceTable?.Races ?? [];
}

export async function getConstructorResults(season: string, constructorId: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/constructors/${constructorId}/results.json`);
  return data?.MRData?.RaceTable?.Races ?? [];
}

export async function getRaceResults(season: string, round: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/${round}/results.json`);
  const races = data?.MRData?.RaceTable?.Races as Json[] | undefined;
  return races?.[0]?.Results ?? [];
}

export async function getQualifyingResults(season: string, round: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/${round}/qualifying.json`);
  const races = data?.MRData?.RaceTable?.Races as Json[] | undefined;
  return races?.[0]?.QualifyingResults ?? [];
}

/**
 * Pit stop data for a specific race. Each item:
 * {driverId, lap, stop, time, duration} — duration is seconds as a string
 * ("22.456" or "1:22.456" for SC pits).
 */
export async function getRacePitStops(season: string, round: string): Promise<Json[]> {
  const data = await ergastGet(`/${season}/${round}/pitstops.json`);
  const races = data?.MRData?.RaceTable?.Races as Json[] | undefined;
  return races?.[0]?.PitStops ?? [];
}
