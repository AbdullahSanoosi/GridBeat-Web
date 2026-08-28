"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True only after the client has hydrated. Every dashboard page here is
 * client-fetched (no server-side query prefetch/dehydration set up) and
 * often formats dates/times with the viewer's local timezone — both of
 * which can legitimately differ between the server's render and the
 * client's first paint. Gating query-dependent JSX behind this avoids the
 * whole class of hydration mismatches.
 *
 * Uses useSyncExternalStore (server snapshot false, client snapshot true)
 * rather than the more common `useEffect(() => setMounted(true), [])`
 * idiom — that pattern works but is exactly the "setState synchronously in
 * an effect" case eslint-plugin-react-hooks flags; useSyncExternalStore is
 * React's own hydration-aware primitive for a value that's meant to differ
 * between server and client, so it doesn't trigger an extra render pass.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
