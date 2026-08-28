"use client";

import { useQuery } from "@tanstack/react-query";
import { getComputedStats } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { entityDisplayName } from "@/lib/models/stats-catalog";
import { findRank, fmtNum } from "@/lib/models/rank";

/**
 * One card in the horizontal "all-time rankings" strip on the driver/
 * constructor detail pages — fetches the full leaderboard for a single
 * metric and shows this entity's rank plus its immediate neighbors.
 * Ported from driver_details_screen.dart's _RankCard/constructor's twin.
 */
export function RankCard({
  entityId,
  entityType,
  metricKey,
  label,
  accent,
  names,
}: {
  entityId: string;
  entityType: "driver" | "constructor";
  metricKey: string;
  label: string;
  accent: string;
  names: Record<string, string>;
}) {
  const query = useQuery({
    queryKey: ["computed-stats", metricKey, entityType, "full"],
    queryFn: () => getComputedStats({ metricKey, entityType }),
    staleTime: staleTime.daily,
  });

  return (
    <div className="flex w-[186px] shrink-0 flex-col gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
      <span className="text-[9px] font-extrabold tracking-wide text-(--color-text-muted)">{label}</span>
      {query.isLoading ? (
        <span className="text-sm text-(--color-text-muted)">…</span>
      ) : (
        (() => {
          const rank = query.data ? findRank(query.data, entityId) : null;
          if (!rank) {
            return <span className="text-sm text-(--color-text-muted)">—</span>;
          }
          return (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black" style={{ color: accent }}>
                  #{rank.rank}
                </span>
                <span className="text-[10px] text-(--color-text-muted)">of {rank.total}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {rank.above && (
                  <NeighborRow direction="up" name={entityDisplayName(rank.above.entityId, names)} value={fmtNum(rank.above.value)} />
                )}
                {rank.below && (
                  <NeighborRow direction="down" name={entityDisplayName(rank.below.entityId, names)} value={fmtNum(rank.below.value)} />
                )}
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

function NeighborRow({ direction, name, value }: { direction: "up" | "down"; name: string; value: string }) {
  return (
    <div className="flex items-center gap-1 text-[9.5px] text-(--color-text-muted)">
      <span>{direction === "up" ? "▲" : "▼"}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
