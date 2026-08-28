"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { makeQueryClient } from "@/lib/query/query-client";
import { staleTime } from "@/lib/query/ttl";

// How old restored localStorage cache can be before it's discarded instead
// of shown. Matched to query-client.ts's gcTime (also staleTime.weekly) for
// consistency — both are "in-practice" ceilings, not the same thing as a
// query's own staleTime (see ttl.ts's comment on why gcTime can't reuse
// staleTime.immutable here).
const PERSIST_MAX_AGE = staleTime.weekly;

/**
 * Persists the query cache to localStorage so a returning visitor sees
 * cached data instantly, then revalidates in the background — the same
 * "never see a spinner after the first successful fetch" behavior as the
 * Flutter app's SharedPreferences-backed cachedFetch (cache_service.dart).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [persister] = useState(() =>
    typeof window !== "undefined"
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: "gridbeat-web-query-cache",
        })
      : null,
  );

  if (!persister) {
    // Server render has no localStorage — plain provider, no persistence.
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
