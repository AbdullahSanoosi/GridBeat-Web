"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getComputedStats, getEntityNames } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";
import { entityDisplayName, lookupMetric } from "@/lib/models/stats-catalog";
import type { ComputedStat } from "@/lib/api/types";

export default function StatsLeaderboardPage({
  params,
}: {
  params: Promise<{ metricKey: string }>;
}) {
  const { metricKey } = use(params);
  const metric = lookupMetric(metricKey);
  const mounted = useMounted();
  const [entityType, setEntityType] = useState(metric.entityTypes[0]);

  const statsQuery = useQuery({
    queryKey: ["computed-stats", metricKey, entityType],
    queryFn: () => getComputedStats({ metricKey, entityType, limit: 100 }),
    staleTime: staleTime.daily,
  });

  const namesQuery = useQuery({
    queryKey: ["entity-names"],
    queryFn: getEntityNames,
    staleTime: staleTime.immutable,
  });

  return (
    <main className="flex-1 px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">{metric.label}</h1>
        {metric.entityTypes.length > 1 && (
          <div className="flex rounded-full border border-(--color-border) p-1">
            {metric.entityTypes.map((t) => (
              <button
                key={t}
                onClick={() => setEntityType(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  entityType === t
                    ? "bg-(--color-primary) text-(--color-on-secondary)"
                    : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!mounted || statsQuery.isLoading ? (
        <p className="text-(--color-text-secondary)">Loading…</p>
      ) : statsQuery.isError ? (
        <p className="text-(--color-error)">
          Failed to load: {statsQuery.error instanceof Error ? statsQuery.error.message : String(statsQuery.error)}
        </p>
      ) : (
        <Leaderboard stats={statsQuery.data ?? []} names={namesQuery.data ?? {}} />
      )}
    </main>
  );
}

function Leaderboard({
  stats,
  names,
}: {
  stats: ComputedStat[];
  names: Record<string, string>;
}) {
  if (stats.length === 0) {
    return <p className="text-(--color-text-muted)">No data for this metric yet.</p>;
  }
  const maxValue = Math.max(...stats.map((s) => Math.abs(s.value)));

  return (
    <div className="flex flex-col gap-2">
      {stats.map((stat, i) => (
        <div
          key={stat.entityId}
          className="flex items-center gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3"
        >
          <span className="w-6 shrink-0 text-right text-sm text-(--color-text-muted)">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {entityDisplayName(stat.entityId, names)}
            </div>
            <div className="mt-1 h-1 rounded-full bg-(--color-surface-elevated)">
              <div
                className="h-1 rounded-full bg-(--color-primary)"
                style={{ width: `${maxValue > 0 ? (Math.abs(stat.value) / maxValue) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
