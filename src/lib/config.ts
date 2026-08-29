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

  // --- Dev-only: replay backend switcher (see src/lib/dev/dev-store.ts) ---
  // Not required() — only meaningful when dev controls are compiled in, and
  // even then the panel that needs them just no-ops if unset. The
  // NEXT_PUBLIC_ENABLE_DEV_CONTROLS flag itself is deliberately NOT read
  // here — it needs to appear as a literal `process.env.NEXT_PUBLIC_...`
  // expression at its actual usage site for Next.js's build-time inlining +
  // minifier dead-code-elimination to reliably strip the dev panel out of
  // the production bundle; reading it once here and re-exporting a boolean
  // would make every caller's check a property access on an imported
  // object instead, which isn't guaranteed to fold the same way. See
  // src/lib/dev/dev-store.ts.
  replayApiBaseUrl: process.env.NEXT_PUBLIC_REPLAY_API_BASE_URL || null,
  replayWsUrl: process.env.NEXT_PUBLIC_REPLAY_WS_URL || null,
} as const;
