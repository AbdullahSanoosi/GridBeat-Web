/** Ported from lib/core/constants/app_constants.dart. */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return value;
}

export const config = {
  statsApiBaseUrl: required(
    "NEXT_PUBLIC_STATS_API_BASE_URL",
    process.env.NEXT_PUBLIC_STATS_API_BASE_URL,
  ),
  liveApiBaseUrl: required(
    "NEXT_PUBLIC_LIVE_API_BASE_URL",
    process.env.NEXT_PUBLIC_LIVE_API_BASE_URL,
  ),
  liveWsUrl: required("NEXT_PUBLIC_LIVE_WS_URL", process.env.NEXT_PUBLIC_LIVE_WS_URL),
  ergastBaseUrl: required(
    "NEXT_PUBLIC_ERGAST_BASE_URL",
    process.env.NEXT_PUBLIC_ERGAST_BASE_URL,
  ),
  openF1BaseUrl: required(
    "NEXT_PUBLIC_OPENF1_BASE_URL",
    process.env.NEXT_PUBLIC_OPENF1_BASE_URL,
  ),
  currentSeason: Number(process.env.NEXT_PUBLIC_CURRENT_SEASON ?? "2026"),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
