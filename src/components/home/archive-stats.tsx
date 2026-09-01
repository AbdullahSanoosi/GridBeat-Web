"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { getTableCount } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";

/**
 * The size of the archive, counted live off the stats API rather than
 * written into the page — every figure here is a `count=exact` on the real
 * table, so it can't drift from what the app actually serves.
 */

const TABLES = [
  { table: "races", label: "GRANDS PRIX", href: "/results", sub: "1950 → today" },
  { table: "race_results", label: "RACE RESULTS", href: "/results", sub: "Every classification" },
  { table: "drivers", label: "DRIVERS", href: "/hall-of-fame", sub: "Every entrant" },
  { table: "circuits", label: "CIRCUITS", href: "/circuits", sub: "Every venue" },
  { table: "computed_stats", label: "COMPUTED STATS", href: "/stats", sub: "114 metrics, daily refresh" },
] as const;

export function ArchiveStats() {
  const results = useQueries({
    queries: TABLES.map((t) => ({
      queryKey: ["table-count", t.table],
      queryFn: () => getTableCount(t.table),
      staleTime: staleTime.currentSeason,
    })),
  });

  return (
    <section className="relative overflow-hidden border-t border-white/10 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-lg">
          <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.26em] text-(--color-info)">
            THE ARCHIVE
          </span>
          <h2 className="mt-3 font-[var(--font-f1)] text-[clamp(1.7rem,6vw,3rem)] font-bold">
            Seventy-six seasons, indexed
          </h2>
          <p className="mt-3 text-sm text-(--color-text-secondary)">
            Not a feed wrapper — a mirror of the whole sport, from the 1950 British Grand Prix to this weekend, rebuilt
            nightly.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {TABLES.map((t, i) => (
            <Link key={t.table} href={t.href} className="group">
              <dd className="font-[var(--font-f1)] text-[clamp(1.9rem,6vw,3.2rem)] leading-none font-bold tabular-nums text-white transition-colors group-hover:text-(--color-primary)">
                <CountUp value={results[i].data ?? null} />
              </dd>
              <dt className="mt-2 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted) sm:text-[10px]">
                {t.label}
              </dt>
              <p className="mt-0.5 text-[11px] text-(--color-text-muted)/70">{t.sub}</p>
            </Link>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Counts up once, when the figure scrolls into view and its value lands. */
function CountUp({ value }: { value: number | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState<number | null>(null);

  useEffect(() => {
    // Only the animated path touches state, and only from Motion's own
    // update callback — never synchronously in the effect body.
    if (value == null || reduced || !inView) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, inView, reduced]);

  if (value == null) return <span ref={ref} className="text-white/25">—</span>;
  const shown = reduced ? value : (animated ?? 0);
  return <span ref={ref}>{shown.toLocaleString("en-GB")}</span>;
}
