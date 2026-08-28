/**
 * Ported from the OpenF1 methods of GridBeat (Flutter) lib/services/api_service.dart.
 * Used for qualifying session sector/speed-trap detail.
 */
import { config } from "@/lib/config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function openF1Get(path: string, params: Record<string, string | number>): Promise<Json[]> {
  const query = new URLSearchParams(toStringRecord(params));
  const res = await fetch(`${config.openF1BaseUrl}${path}?${query.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`openf1 ${path} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) ?? [];
}

function toStringRecord(params: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
}

/** Qualifying sessions for a given year: session_key, session_name, date_start, location, ... */
export function getOpenF1Sessions(year: string): Promise<Json[]> {
  return openF1Get("/sessions", { session_name: "Qualifying", year });
}

/**
 * All lap records for a session — used to extract best sector times per driver.
 * Each item: driver_number, lap_number, lap_duration, duration_sector_1/2/3,
 * i1_speed, i2_speed, st_speed, is_pit_out_lap.
 */
export function getOpenF1Laps(sessionKey: number): Promise<Json[]> {
  return openF1Get("/laps", { session_key: sessionKey });
}

/** Driver list for a session — driver_number -> name_acronym mapping. */
export function getOpenF1Drivers(sessionKey: number): Promise<Json[]> {
  return openF1Get("/drivers", { session_key: sessionKey });
}
