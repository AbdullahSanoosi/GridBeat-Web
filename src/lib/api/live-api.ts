/**
 * Ported from GridBeat (Flutter) lib/services/live_api_service.dart.
 * The Flutter version bypasses Dio via raw dart:io HttpClient specifically
 * for the leaderboard bootstrap call ("Dio can fail silently on some
 * devices") — that workaround is mobile-specific and doesn't apply in a
 * browser, so this is plain fetch throughout.
 */
import { activeLiveApiBaseUrl } from "@/lib/dev/dev-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function get(path: string, query: Record<string, string | number | undefined> = {}): Promise<Json> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  const url = `${activeLiveApiBaseUrl()}${path}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`live-api ${path} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export const getLeaderboard = (): Promise<Json[]> => get("/api/leaderboard");
export const getClock = (): Promise<Json | null> => get("/api/clock");
export const getSessionStatus = (): Promise<string | null> => get("/api/sessionstatus");
export const getSessions = (): Promise<Json[]> => get("/api/sessions");
export const getDrivers = (sessionKey?: number): Promise<Json[]> =>
  get("/api/drivers", { session_key: sessionKey });
export const getLaps = (sessionKey: number, driverNumber?: number): Promise<Json[]> =>
  get("/api/laps", { session_key: sessionKey, driver_number: driverNumber });
export const getStints = (sessionKey: number, driverNumber?: number): Promise<Json[]> =>
  get("/api/stints", { session_key: sessionKey, driver_number: driverNumber });
export const getRaceControl = (sessionKey: number): Promise<Json[]> =>
  get("/api/racecontrol", { session_key: sessionKey });
export const getWeather = (sessionKey: number): Promise<Json[]> =>
  get("/api/weather", { session_key: sessionKey });
export const getTeamRadio = (sessionKey: number, driverNumber?: number): Promise<Json[]> =>
  get("/api/teamradio", { session_key: sessionKey, driver_number: driverNumber });
export const getPitStops = (sessionKey: number): Promise<Json[]> =>
  get("/api/pit", { session_key: sessionKey });
