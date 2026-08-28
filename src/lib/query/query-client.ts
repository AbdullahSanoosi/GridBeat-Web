import { QueryClient } from "@tanstack/react-query";
import { staleTime } from "./ttl";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Per-query staleTime (see ttl.ts) overrides this; this is just the
        // floor for anything that doesn't set one explicitly.
        staleTime: staleTime.daily,
        // In-memory retention for inactive queries — not the same thing as
        // how long "immutable" data stays trustworthy (that's staleTime,
        // and long-term persistence across sessions comes from the
        // localStorage persister in query-provider.tsx, not this). Kept
        // well under staleTime.immutable: TanStack Query schedules GC via
        // setTimeout(gcTime), which overflows Node/browsers' 32-bit signed
        // int limit (~24.8 days) above that.
        gcTime: staleTime.weekly,
        refetchOnWindowFocus: false,
        // Default 'online' mode pauses a query (fetchStatus: 'paused')
        // whenever the onlineManager thinks the browser is offline, and
        // just leaves it pending forever instead of erroring — even when
        // navigator.onLine is true and a raw fetch() works fine, some
        // browser/automation environments never fire the online/offline
        // events onlineManager listens for, so it can get stuck believing
        // it's offline. 'always' skips that heuristic for the *first*
        // attempt.
        networkMode: "always",
        // Retries specifically still get stuck in fetchStatus: 'paused'
        // after the first failure, even with networkMode: 'always' set
        // explicitly (reproduced with retry:2 + networkMode:'always' both
        // set directly on a query, not just here in defaults) — a stuck
        // spinner forever is worse than a shown error, so retries are off
        // entirely rather than risking queries hanging silently.
        retry: false,
      },
    },
  });
}
