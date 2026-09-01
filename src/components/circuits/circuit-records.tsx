"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getCircuitLeaderboard } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { circuitLeaderboardRows } from "@/lib/models/circuit-stats";

/**
 * Ports `_CircuitRecordsSection`/`_CircuitMiniLeaderboard` — a DRIVERS/TEAMS
 * toggle over three "most X at this circuit" leaderboards (wins/poles/
 * podiums). Reads `computed_stats` directly (`driver_circuit`/
 * `constructor_circuit` entity types) — no Supabase involved, so this
 * works identically for a curated current-era circuit and one with no
 * hand-written facts at all.
 */
export function CircuitRecords({ circuitId, accent, names }: { circuitId: string; accent: string; names: Record<string, string> }) {
  const [entityType, setEntityType] = useState<"driver_circuit" | "constructor_circuit">("driver_circuit");

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <ToggleButton label="DRIVERS" selected={entityType === "driver_circuit"} onClick={() => setEntityType("driver_circuit")} />
        <ToggleButton label="TEAMS" selected={entityType === "constructor_circuit"} onClick={() => setEntityType("constructor_circuit")} />
      </div>
      <MiniLeaderboard title="MOST WINS" circuitId={circuitId} metricKey="wins_circuit" entityType={entityType} accent={accent} names={names} />
      <MiniLeaderboard title="MOST POLES" circuitId={circuitId} metricKey="poles_circuit" entityType={entityType} accent={accent} names={names} />
      <MiniLeaderboard title="MOST PODIUMS" circuitId={circuitId} metricKey="podiums_circuit" entityType={entityType} accent={accent} names={names} />
    </div>
  );
}

function ToggleButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full py-2 font-[var(--font-f1)] text-[10px] font-black tracking-[0.12em] transition-colors"
      style={{
        backgroundColor: selected ? "var(--color-primary)" : "var(--color-surface-elevated)",
        color: selected ? "white" : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

function MiniLeaderboard({
  title,
  circuitId,
  metricKey,
  entityType,
  accent,
  names,
}: {
  title: string;
  circuitId: string;
  metricKey: string;
  entityType: string;
  accent: string;
  names: Record<string, string>;
}) {
  const query = useQuery({
    queryKey: ["circuit-leaderboard", circuitId, metricKey, entityType],
    queryFn: () => getCircuitLeaderboard({ circuitId, metricKey, entityType }),
    staleTime: staleTime.immutable,
  });

  const stats = query.data ?? [];
  const rows = circuitLeaderboardRows(stats, names);
  const top = rows.slice(0, 5);

  if (query.isLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-(--color-surface-elevated)" />;
  }
  if (top.length === 0) return null;

  return (
    <div className="rounded-xl bg-(--color-surface-elevated) p-4">
      <div className="mb-3 text-[9px] font-black tracking-[0.16em]" style={{ color: accent }}>
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {top.map((row) => (
          <div key={row.rank} className="flex items-center gap-2.5">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black"
              style={{ color: row.rank === 1 ? accent : "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
            >
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{row.name}</span>
            <span className="shrink-0 text-[13px] font-bold text-(--color-text-secondary)">{row.value}</span>
          </div>
        ))}
      </div>
      {rows.length > 5 && (
        <Link
          href={{
            pathname: `/circuits/${circuitId}/leaderboard`,
            query: { metricKey, entityType, title },
          }}
          className="mt-3 flex items-center justify-center gap-1 text-[10px] font-extrabold tracking-[0.1em]"
          style={{ color: accent }}
        >
          VIEW ALL {rows.length} ›
        </Link>
      )}
    </div>
  );
}
