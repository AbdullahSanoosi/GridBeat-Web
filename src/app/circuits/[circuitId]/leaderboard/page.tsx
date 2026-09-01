"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllCircuits, getCircuitLeaderboard, getEntityNames } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { circuitColor } from "@/lib/theme/colors";
import { circuitLeaderboardRows } from "@/lib/models/circuit-stats";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton, SkeletonRows } from "@/components/shared/skeleton";

/**
 * Ports CircuitLeaderboardScreen — the full ranked list behind a Circuit
 * Records mini-leaderboard's "VIEW ALL" link (which only ever shows a
 * top-5 preview). `metricKey`/`entityType`/`title` travel as query params
 * rather than Flutter's router `extra` state, since a URL here has to be
 * a real, shareable address.
 */
export default function CircuitLeaderboardPage({ params }: { params: Promise<{ circuitId: string }> }) {
  const { circuitId } = use(params);
  const searchParams = useSearchParams();
  const metricKey = searchParams.get("metricKey") ?? "";
  const entityType = searchParams.get("entityType") ?? "driver_circuit";
  const title = searchParams.get("title") ?? "LEADERBOARD";
  const mounted = useMounted();

  const circuitQuery = useQuery({
    queryKey: ["circuit", circuitId],
    queryFn: async () => {
      const circuits = await getAllCircuits();
      return circuits.find((c) => c.circuit_id === circuitId) ?? null;
    },
    staleTime: staleTime.immutable,
  });

  const namesQuery = useQuery({ queryKey: ["entity-names"], queryFn: getEntityNames, staleTime: staleTime.immutable });

  const leaderboardQuery = useQuery({
    queryKey: ["circuit-leaderboard-full", circuitId, metricKey, entityType],
    queryFn: () => getCircuitLeaderboard({ circuitId, metricKey, entityType }),
    staleTime: staleTime.immutable,
    enabled: metricKey.length > 0,
  });

  if (!mounted || circuitQuery.isLoading) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-xl">
          <Skeleton className="mb-1 h-7 w-2/3" />
          <Skeleton className="mb-6 h-3 w-1/3" />
          <SkeletonRows count={6} className="h-14" />
        </div>
      </main>
    );
  }

  const circuit = circuitQuery.data;
  const accent = circuitColor(circuitId);
  const rows = circuitLeaderboardRows(leaderboardQuery.data ?? [], namesQuery.data ?? {});

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <Link href={`/circuits/${circuitId}`} className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← {circuit?.name as string}
      </Link>

      <div className="mx-auto max-w-xl">
        <h1 className="font-[var(--font-f1)] text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-[11px] font-bold tracking-[0.16em] text-(--color-text-muted)">
          {(circuit?.name as string)?.toUpperCase()}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {leaderboardQuery.isLoading ? (
            <SkeletonRows count={6} className="h-14" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-(--color-text-muted)">No data for this metric yet.</p>
          ) : (
            rows.map((row) => (
                  <div key={row.rank} className="flex items-center gap-3 rounded-xl bg-(--color-surface-elevated) px-4 py-3">
                    <span
                      className="w-7 shrink-0 font-[var(--font-f1)] text-base font-black"
                      style={{ color: row.rank <= 3 ? accent : "var(--color-text-muted)" }}
                    >
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{row.name}</span>
                    <span className="shrink-0 font-[var(--font-f1)] text-base font-black" style={{ color: accent }}>
                      {row.value}
                    </span>
                  </div>
                ))
          )}
        </div>
      </div>
    </main>
  );
}
