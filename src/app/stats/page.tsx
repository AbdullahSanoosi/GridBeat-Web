"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getSyncStatus } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";
import { statsCategories, type StatsCategory, type StatsMetricRef } from "@/lib/models/stats-catalog";

/**
 * Ports stats_hub_screen.dart's `_QualiToRaceEntry` (a standout gradient
 * card — the progression chart is per-race, not a career leaderboard, so
 * it doesn't fit the category/metric shape everything else follows),
 * `_LastUpdatedFooter` (data-freshness card off `sync_status`, previously
 * missing entirely), and the bordered card-and-divider `_CategorySection`/
 * `_MetricRow` styling in place of a plain list (Roadmap 3.6). The catalog
 * itself (`statsCategories`, 9 categories / ~35 metrics) was already a
 * complete port — only the page rendering it was thin.
 */
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function StatsHubPage() {
  const mounted = useMounted();
  const syncQuery = useQuery({
    queryKey: ["sync-status"],
    queryFn: getSyncStatus,
    staleTime: staleTime.currentSeason,
  });

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="mb-2 font-[var(--font-f1)] text-2xl font-bold">Stats</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">Full history since 1950</p>

      <QualiToRaceEntry />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCategories.map((category) => (
          <CategorySection key={category.label} category={category} />
        ))}
      </div>

      {mounted && syncQuery.data && <LastUpdatedFooter status={syncQuery.data} />}
    </main>
  );
}

function QualiToRaceEntry() {
  return (
    <Link
      href="/stats/quali-to-race"
      className="mb-8 flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:border-(--color-primary)"
      style={{ borderColor: "color-mix(in srgb, var(--color-primary) 35%, transparent)", background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 22%, transparent), color-mix(in srgb, var(--color-primary) 6%, transparent))" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)" }}
      >
        📈
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-extrabold tracking-wide">QUALI → RACE PROGRESSION</div>
        <div className="mt-[2px] text-[11px] text-(--color-text-secondary)">Pick any race, see how the grid moved</div>
      </div>
      <span className="shrink-0 text-(--color-primary)">›</span>
    </Link>
  );
}

function CategorySection({ category }: { category: StatsCategory }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-[10px] font-extrabold tracking-[0.2em] text-(--color-primary)">
        {category.label.toUpperCase()}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-surface)">
        {category.metrics.map((m, i) => (
          <MetricRow key={m.metricKey} metric={m} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

function MetricRow({ metric, first }: { metric: StatsMetricRef; first: boolean }) {
  return (
    <Link
      href={`/stats/${metric.metricKey}`}
      className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold transition-colors hover:bg-(--color-surface-elevated) ${first ? "" : "border-t border-(--color-divider)"}`}
    >
      <span className="min-w-0 flex-1 truncate">{metric.label}</span>
      <span className="shrink-0 text-(--color-text-muted)">›</span>
    </Link>
  );
}

/** Mirrors BigDataF1's own data-freshness card — a big date, and which race the catalog is complete through. */
function LastUpdatedFooter({ status }: { status: Record<string, unknown> }) {
  const lastSyncedAt = status.last_synced_at as string | undefined;
  const season = status.season as number | undefined;
  const lastRaceName = status.last_race_name as string | null | undefined;
  if (!lastSyncedAt) return null;

  const through = lastRaceName ? `${lastRaceName} · Race` : `Season ${season}`;

  return (
    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-primary)/15 text-base">
        🔄
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold tracking-[0.16em] text-(--color-text-muted)">LAST UPDATED</div>
        <div className="mt-[2px] font-[var(--font-f1)] text-base font-black">{dateFormatter.format(new Date(lastSyncedAt))}</div>
        <div className="mt-[2px] truncate text-[11px] text-(--color-text-secondary)">Through {through}</div>
      </div>
    </div>
  );
}
