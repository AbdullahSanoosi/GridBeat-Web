"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAllCircuits, getSchedule } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { useMounted } from "@/hooks/use-mounted";
import type { Row } from "@/lib/api/types";

export default function CircuitGuidePage() {
  const mounted = useMounted();

  const query = useQuery({
    queryKey: ["circuit-guide", config.currentSeason],
    queryFn: async () => {
      const [circuits, schedule] = await Promise.all([
        getAllCircuits(),
        getSchedule(config.currentSeason),
      ]);
      // This season's calendar order, deduped by circuit_id (a venue can
      // theoretically host more than one round in a season).
      const seasonCircuitIds = [...new Set(schedule.map((r) => r.circuit_id as string))];
      const byId = new Map(circuits.map((c) => [c.circuit_id as string, c]));
      return seasonCircuitIds
        .map((id) => byId.get(id))
        .filter((c): c is Row => c !== undefined);
    },
    staleTime: staleTime.currentSeason,
  });

  return (
    <main className="flex-1 px-8 py-8">
      <h1 className="mb-2 font-[var(--font-f1)] text-2xl font-bold">Circuit Guide</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">
        {config.currentSeason} calendar
      </p>

      {!mounted || query.isLoading ? (
        <p className="text-(--color-text-secondary)">Loading circuits…</p>
      ) : query.isError ? (
        <p className="text-(--color-error)">
          Failed to load circuits: {query.error instanceof Error ? query.error.message : String(query.error)}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.map((circuit) => (
            <Link
              key={circuit.circuit_id as string}
              href={`/circuits/${circuit.circuit_id}`}
              className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-primary)"
            >
              <div className="font-medium">{circuit.name as string}</div>
              <div className="mt-1 text-sm text-(--color-text-secondary)">
                {circuit.locality as string}, {circuit.country as string}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
