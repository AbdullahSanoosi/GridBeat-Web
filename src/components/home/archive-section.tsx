"use client";

import { useEffect, useRef } from "react";
import { animate, createTimeline, stagger, utils } from "animejs";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMounted } from "@/hooks/use-mounted";
import type { SeasonRaceCount } from "@/lib/home/marketing-data";

/**
 * The archive, stated as a timing readout rather than a row of feature
 * cards — every figure here is a live `count=exact` off the same database
 * the app reads, so the page can't quietly drift from the product.
 *
 * The chart is one real series: races per season, 1950 to now. Its shape is
 * the actual history of the sport (seven rounds in 1950, into the twenties
 * today), which is a better argument for "we have the whole archive" than
 * any sentence would be. Single series, so no legend — the title names it.
 * The record season is marked in F1 purple, borrowing the sport's own
 * "fastest anyone has gone" semantics instead of inventing a highlight hue.
 */
export interface ArchiveTotals {
  races: number | null;
  drivers: number | null;
  circuits: number | null;
  results: number | null;
  lapLeaders: number | null;
  pitStops: number | null;
}

const SERIES = "#df3409";
const RECORD = "#bf00ff";

export function ArchiveSection({ totals, seasons }: { totals: ArchiveTotals; seasons: SeasonRaceCount[] }) {
  const firstSeason = seasons[0]?.season;
  // >= so a tie resolves to the most recent season, which reads as current
  const peak = seasons.reduce<SeasonRaceCount | null>((best, s) => (!best || s.races >= best.races ? s : best), null);

  const figures = [
    { label: "Races on record", value: totals.races },
    { label: "Drivers", value: totals.drivers },
    { label: "Circuits", value: totals.circuits },
    { label: "Race results", value: totals.results },
    { label: "Lap-leader records", value: totals.lapLeaders },
    { label: "Pit stops timed", value: totals.pitStops },
  ].filter((f): f is { label: string; value: number } => f.value != null);

  return (
    <section id="archive" className="relative border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#df3409]/40 to-transparent" />
      <div className="mx-auto max-w-[84rem]">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold tracking-[0.28em] text-[#df3409] uppercase">Not a demo dataset</p>
          <h2 className="mt-4 font-[var(--font-f1)] text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.92] font-bold tracking-[-0.055em] italic">
            EVERY RACE
            <br />
            SINCE {firstSeason ?? 1950}.
          </h2>
          <p className="mt-6 text-sm leading-7 text-white/48 sm:text-base">
            GridBeat reads one database, and this page reads it too. The figures below are counted live, not written
            into the design.
          </p>
        </div>

        <FigureGrid figures={figures} />

        <div className="mt-14 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0b0b]">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/[0.07] px-6 py-5">
            <div>
              <h3 className="font-[var(--font-f1)] text-sm font-bold tracking-[0.1em]">RACES PER SEASON</h3>
              <p className="mt-1 text-[11px] text-white/38">
                {firstSeason}&ndash;{seasons[seasons.length - 1]?.season} &middot; {seasons.length} seasons
              </p>
            </div>
            {peak && (
              <div className="text-right">
                <div className="text-[9px] tracking-[0.2em] text-white/32 uppercase">Record season</div>
                <div className="mt-0.5 font-mono text-sm font-bold tabular-nums" style={{ color: RECORD }}>
                  {peak.season} &middot; {peak.races} rounds
                </div>
              </div>
            )}
          </div>
          <SeasonChart seasons={seasons} peak={peak} />
        </div>
      </div>
    </section>
  );
}

/**
 * anime.js drives this one: a single timeline counting every figure up from
 * zero on a stagger, which is exactly the kind of orchestrated multi-element
 * sequence its timeline API is tidier at than per-element React state.
 */
function FigureGrid({ figures }: { figures: { label: string; value: number }[] }) {
  const rootRef = useRef<HTMLDListElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (root == null || figures.length === 0) return;

    const numbers = [...root.querySelectorAll<HTMLElement>("[data-count]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const settle = () => {
      for (const el of numbers) el.textContent = Number(el.dataset.count).toLocaleString();
    };
    if (reduced) {
      settle();
      return;
    }

    const run = () => {
      if (played.current) return;
      played.current = true;
      const tl = createTimeline({ defaults: { ease: "out(3)" } });
      for (const el of numbers) {
        tl.add(
          el,
          {
            innerHTML: [0, Number(el.dataset.count)],
            duration: 1100,
            modifier: (v: number) => Math.round(v).toLocaleString(),
          },
          stagger(90),
        );
      }
      animate(root.querySelectorAll("[data-rule]"), {
        scaleX: [0, 1],
        duration: 700,
        delay: stagger(90),
        ease: "out(3)",
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) run();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      utils.remove(numbers);
    };
  }, [figures]);

  return (
    <dl ref={rootRef} className="mt-12 grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-3 sm:gap-x-12 lg:grid-cols-6 lg:gap-x-8">
      {figures.map((figure) => (
        <div key={figure.label} className="min-w-0">
          <span
            data-rule
            className="block h-px w-full origin-left bg-gradient-to-r from-[#df3409] to-transparent"
            aria-hidden="true"
          />
          <dd
            data-count={figure.value}
            className="mt-4 font-[var(--font-f1)] text-[clamp(1.6rem,2.1vw,2.4rem)] leading-none font-bold tracking-[-0.02em] tabular-nums"
          >
            {figure.value.toLocaleString()}
          </dd>
          <dt className="mt-2.5 text-[10px] leading-snug tracking-[0.14em] text-white/38 uppercase">{figure.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function SeasonChart({ seasons, peak }: { seasons: SeasonRaceCount[]; peak: SeasonRaceCount | null }) {
  // Recharts measures the DOM, so it can't render identically on the server.
  const mounted = useMounted();
  if (!mounted) return <div className="h-[19rem]" />;

  return (
    <div className="h-[19rem] px-2 pt-5 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={seasons} margin={{ top: 8, right: 22, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="archive-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.42} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(255 255 255 / 0.055)" vertical={false} />
          <XAxis
            dataKey="season"
            tick={{ fill: "rgb(255 255 255 / 0.34)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "rgb(255 255 255 / 0.09)" }}
            ticks={[1950, 1970, 1990, 2010, seasons[seasons.length - 1]?.season].filter(Boolean) as number[]}
            interval="preserveStartEnd"
          />
          <YAxis
            width={30}
            tick={{ fill: "rgb(255 255 255 / 0.34)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, "dataMax + 3"]}
          />
          <Tooltip
            cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "#111",
              border: "1px solid rgb(255 255 255 / 0.12)",
              borderRadius: 12,
              fontSize: 12,
              padding: "8px 12px",
            }}
            labelStyle={{ color: "rgb(255 255 255 / 0.55)", fontSize: 10, letterSpacing: "0.1em" }}
            itemStyle={{ color: "#fff", fontWeight: 700 }}
            formatter={(value) => [`${value} rounds`, ""] as [string, string]}
            separator=""
          />
          <Area
            type="monotone"
            dataKey="races"
            stroke={SERIES}
            strokeWidth={2}
            fill="url(#archive-fill)"
            activeDot={{ r: 4, fill: SERIES, stroke: "#0b0b0b", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={900}
          />
          {peak && (
            <ReferenceDot
              x={peak.season}
              y={peak.races}
              r={4}
              fill={RECORD}
              stroke="#0b0b0b"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
