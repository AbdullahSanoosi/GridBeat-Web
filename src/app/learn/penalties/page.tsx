"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFiaDecisions } from "@/lib/api/fia-docs";
import { fiaDecisionFromRow } from "@/lib/models/fia-docs";
import { buildPenaltyGuide, type PenaltyKindStats } from "@/lib/models/penalty-guide-stats";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { useMounted } from "@/hooks/use-mounted";
import { SkeletonRows } from "@/components/shared/skeleton";

/**
 * Ports penalty_guide_screen.dart — "why did they get a penalty?", ordered
 * by how often it really happens across this season's steward decisions,
 * each with the stewards' own reason text as real examples.
 */
export default function PenaltyGuidePage() {
  const mounted = useMounted();
  const [open, setOpen] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["penalty-guide", config.currentSeason],
    queryFn: async () => {
      const rows = await getFiaDecisions(config.currentSeason);
      return buildPenaltyGuide(rows.map(fiaDecisionFromRow));
    },
    staleTime: staleTime.currentSeason,
  });

  const total = query.data?.reduce((s, k) => s + k.count, 0) ?? 0;

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[var(--font-f1)] text-2xl font-bold">Penalties</h1>
      <p className="mt-3 max-w-xl text-2xl leading-tight font-bold tracking-tight">
        What actually gets you penalised.
      </p>

      {!mounted || query.isLoading ? (
        <div className="mt-6 max-w-2xl">
          <SkeletonRows count={8} className="h-[68px]" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-(--color-error)">
          Failed to load: {query.error instanceof Error ? query.error.message : String(query.error)}
        </p>
      ) : !query.data || query.data.length === 0 ? (
        <p className="mt-4 text-(--color-text-secondary)">No decisions on file yet.</p>
      ) : (
        <>
          <p className="mt-2 max-w-xl text-sm text-(--color-text-secondary)">
            Ordered by how often it really happens, counted across {total} steward decisions this season. Tap any
            one to see the rule and real incidents it was applied to.
          </p>
          <div className="mt-6 flex max-w-2xl flex-col gap-2.5">
            {query.data.map((stats) => (
              <KindCard key={stats.kind.name} stats={stats} expanded={open.has(stats.kind.name)} onTap={() => toggle(stats.kind.name)} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function KindCard({ stats, expanded, onTap }: { stats: PenaltyKindStats; expanded: boolean; onTap: () => void }) {
  const k = stats.kind;
  return (
    <button
      onClick={onTap}
      className="rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-4 text-left transition-colors hover:border-(--color-primary)"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-base"
          style={{
            backgroundColor: `color-mix(in srgb, ${k.accent} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${k.accent} 35%, transparent)`,
          }}
        >
          {k.icon}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{k.name}</span>
        <span className="shrink-0 text-xs font-black" style={{ color: k.accent }}>
          {stats.count}×
        </span>
        <span className="shrink-0 text-(--color-text-muted)">{expanded ? "▲" : "▼"}</span>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-(--color-text-primary)">{k.what}</p>

      {expanded && (
        <div className="mt-4 flex flex-col gap-3">
          <Block label="WHY IT EXISTS" body={k.why} />
          <Block label="WHAT YOU GET" body={k.typical} />
          {stats.examples.length > 0 && (
            <div>
              <div className="text-[9px] font-black tracking-[0.12em] text-(--color-text-muted)">REAL INCIDENTS</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {stats.examples.map((e, i) => (
                  <div key={i} className="rounded-lg bg-(--color-surface) p-2">
                    <p className="text-[11.5px] leading-relaxed text-(--color-text-primary)">{e.reason}</p>
                    {(e.driver || e.round) && (
                      <p className="mt-1 text-[9px] text-(--color-text-muted)">
                        {[e.driver, e.round ? `Round ${e.round}` : null].filter(Boolean).join("  ·  ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[9px] font-black tracking-[0.12em] text-(--color-text-muted)">{label}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-(--color-text-secondary)">{body}</p>
    </div>
  );
}
