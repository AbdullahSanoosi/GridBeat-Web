import Link from "next/link";
import { statsCategories } from "@/lib/models/stats-catalog";

export const metadata = { title: "Stats" };

export default function StatsHubPage() {
  return (
    <main className="flex-1 px-8 py-8">
      <h1 className="mb-2 font-[var(--font-f1)] text-2xl font-bold">Stats</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">Full history since 1950</p>

      <Link
        href="/stats/quali-to-race"
        className="mb-8 block rounded-2xl border border-(--color-primary)/40 bg-gradient-to-br from-(--color-primary)/20 to-(--color-primary)/5 p-5 transition-colors hover:border-(--color-primary)"
      >
        <div className="text-sm font-bold tracking-wide text-(--color-text-primary)">
          QUALI → RACE PROGRESSION
        </div>
        <div className="mt-1 text-xs text-(--color-text-secondary)">
          Pick any race, see how the grid moved
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCategories.map((category) => (
          <div key={category.label}>
            <h2 className="mb-2 text-xs font-bold tracking-widest text-(--color-text-muted)">
              {category.label.toUpperCase()}
            </h2>
            <div className="flex flex-col gap-1 rounded-xl border border-(--color-border) bg-(--color-surface) p-2">
              {category.metrics.map((m) => (
                <Link
                  key={m.metricKey}
                  href={`/stats/${m.metricKey}`}
                  className="rounded-lg px-3 py-2 text-sm text-(--color-text-secondary) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-text-primary)"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
