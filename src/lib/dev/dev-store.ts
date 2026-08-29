/**
 * Dev-only backend switcher — lets you and Sajjad point the live-timing
 * feature at the replay backend instead of production live, from inside the
 * dashboard, without an env var edit + restart.
 *
 * DEV_CONTROLS_ENABLED reads NEXT_PUBLIC_ENABLE_DEV_CONTROLS directly as a
 * literal `process.env.NEXT_PUBLIC_...` expression (not funneled through
 * config.ts) specifically so Next.js's build-time inlining sees it here at
 * its actual usage site — that's what a bundler's dead-code-elimination
 * needs to fold `DEV_CONTROLS_ENABLED && x` to nothing when the flag is
 * "false", the intended value for the real public production build once
 * one exists (see gridbeat-web/CLAUDE.md's deployment section). The one
 * render site that actually needs the bundle-stripping guarantee —
 * src/app/live/page.tsx's `<BackendPanel />` — repeats the same literal
 * check rather than importing this constant, for the same reason: an
 * imported binding is a property access at the call site, not guaranteed
 * to fold the same way a same-module literal does. This guarantee is about
 * `next build`'s minified output specifically, not `next dev` (nothing
 * strips dead code there — harmless, since dev mode is never what's
 * actually deployed).
 *
 * backendMode is deliberately NOT trusted on its own to switch anything —
 * activeLiveApiBaseUrl()/activeLiveWsUrl() re-check DEV_CONTROLS_ENABLED
 * before honoring it, so even a "replay" value written into localStorage by
 * hand on a build with the panel compiled out still resolves to production
 * live.
 *
 * Verified against a real `next build` with the flag off: BackendPanel and
 * replay-control-api.ts (the actual UI text, the token header name, every
 * replay-specific string) are fully absent from the client bundle — that
 * part tree-shakes cleanly. This file itself does NOT disappear, though,
 * because activeLiveApiBaseUrl()/activeLiveWsUrl() are imported
 * unconditionally by the always-on live-timing data layer (live-api.ts,
 * websocket-client.ts) — so the Zustand store shell survives (its
 * "gridbeat-dev-settings" persist key name is still a literal string in the
 * bundle). That residue is inert, not a leak: it holds no secret (the
 * control token only ever lives in this browser's localStorage, never in
 * source), and DEV_CONTROLS_ENABLED being a build-time `false` means
 * backendMode can't actually redirect anything even if someone finds and
 * pokes at the store directly. Don't read the module docstring as "nothing
 * of this file ships" — it's "nothing exploitable ships."
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { config } from "@/lib/config";

const DEV_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_CONTROLS === "true";

export type BackendMode = "live" | "replay";

interface DevStore {
  backendMode: BackendMode;
  /** X-Replay-Control-Token for POST /api/replay/start|stop. Deliberately
   * kept out of any NEXT_PUBLIC_* env var — that would bake it into the JS
   * bundle, readable by anyone who can view source on this build. Typed in
   * once via the panel instead, stored only in this browser's localStorage. */
  replayControlToken: string;
  setBackendMode: (mode: BackendMode) => void;
  setReplayControlToken: (token: string) => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set) => ({
      backendMode: "live",
      replayControlToken: "",
      setBackendMode: (mode) => set({ backendMode: mode }),
      setReplayControlToken: (token) => set({ replayControlToken: token }),
    }),
    { name: "gridbeat-dev-settings" },
  ),
);

/** True only when dev controls are compiled in AND the replay backend URLs
 * are actually configured — the panel checks this to decide whether replay
 * mode is even offered as an option. */
export const replayBackendConfigured =
  DEV_CONTROLS_ENABLED && Boolean(config.replayApiBaseUrl && config.replayWsUrl);

export function activeLiveApiBaseUrl(): string {
  if (DEV_CONTROLS_ENABLED && useDevStore.getState().backendMode === "replay" && config.replayApiBaseUrl) {
    return config.replayApiBaseUrl;
  }
  return config.liveApiBaseUrl;
}

export function activeLiveWsUrl(): string {
  if (DEV_CONTROLS_ENABLED && useDevStore.getState().backendMode === "replay" && config.replayWsUrl) {
    return config.replayWsUrl;
  }
  return config.liveWsUrl;
}
