"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "motion/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Cumulative championship points by round — the same shape as the app's
 * own championship-history chart on a driver's detail screen
 * (driver_details_screen.dart, fl_chart there / Recharts here).
 *
 * Series colour follows the entity (the constructor's real livery colour),
 * never the rank, so a leader change never repaints the field. Four series,
 * each also carrying a direct end-label, so identity is never colour-alone —
 * McLaren papaya and Mercedes petronas sit brighter than an ideal dark-mode
 * band, and the labels are what make that safe.
 */

const DRIVERS = [
  { code: "NOR", name: "Norris", team: "McLaren", color: "#FF8000", logo: "mclaren" },
  { code: "VER", name: "Verstappen", team: "Red Bull", color: "#3671C6", logo: "red_bull" },
  { code: "LEC", name: "Leclerc", team: "Ferrari", color: "#E80020", logo: "ferrari" },
  { code: "RUS", name: "Russell", team: "Mercedes", color: "#27F4D2", logo: "mercedes" },
] as const;

/** Points per round, in calendar order — cumulated below. */
const PER_ROUND: Record<string, number[]> = {
  NOR: [25, 18, 25, 12, 25, 18, 15, 25, 10, 25, 18, 25],
  VER: [18, 25, 12, 25, 18, 25, 25, 12, 25, 18, 25, 15],
  LEC: [15, 12, 18, 18, 10, 15, 12, 18, 18, 12, 15, 18],
  RUS: [12, 15, 15, 15, 15, 12, 18, 15, 12, 15, 12, 12],
};

const ROUNDS = PER_ROUND.NOR.length;

const DATA = Array.from({ length: ROUNDS }, (_, i) => {
  const row: Record<string, number> = { round: i + 1 };
  for (const d of DRIVERS) {
    row[d.code] = PER_ROUND[d.code].slice(0, i + 1).reduce((a, b) => a + b, 0);
  }
  return row;
});

const FINAL = DATA[DATA.length - 1];
const STANDINGS = [...DRIVERS].sort((a, b) => (FINAL[b.code] as number) - (FINAL[a.code] as number));

export function ChampionshipChart() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [focus, setFocus] = useState<string | null>(null);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-white/10 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-lg">
            <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.26em] text-(--color-sector-purple)">
              STANDINGS
            </span>
            <h2 className="mt-3 font-[var(--font-f1)] text-3xl font-bold sm:text-5xl">The title race, plotted</h2>
            <p className="mt-3 text-sm text-(--color-text-secondary)">
              Points don&apos;t tell you who&apos;s in form — the gradient does. Every driver and constructor gets this
              chart across their whole career.
            </p>
          </div>

          {/* Legend — always present for 2+ series, and doubles as a filter */}
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {STANDINGS.map((d, i) => (
              <li key={d.code}>
                <button
                  onMouseEnter={() => setFocus(d.code)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(d.code)}
                  onBlur={() => setFocus(null)}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  style={{ opacity: focus && focus !== d.code ? 0.4 : 1 }}
                >
                  <Image src={`/teams/${d.logo}.png`} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                  <span className="flex flex-col leading-tight">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-[var(--font-f1)] text-xs font-bold text-white">{d.code}</span>
                    </span>
                    <span className="font-[var(--font-f1)] text-[10px] tabular-nums text-(--color-text-muted)">
                      P{i + 1} · {FINAL[d.code]} pts
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <figure className="mt-10 rounded-2xl border border-white/10 bg-(--color-surface)/60 p-4 pt-6 sm:p-6">
          <div className="h-[300px] w-full sm:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DATA} margin={{ top: 6, right: 46, bottom: 4, left: -18 }}>
                <CartesianGrid stroke="rgb(255 255 255 / 0.055)" vertical={false} />
                <XAxis
                  dataKey="round"
                  tick={{ fill: "rgb(255 255 255 / 0.38)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(255 255 255 / 0.1)" }}
                  label={{
                    value: "ROUND",
                    position: "insideBottomRight",
                    offset: -2,
                    fill: "rgb(255 255 255 / 0.3)",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                  }}
                />
                <YAxis
                  tick={{ fill: "rgb(255 255 255 / 0.38)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  cursor={{ stroke: "rgb(255 255 255 / 0.28)" }}
                  contentStyle={{
                    background: "rgb(0 0 0 / 0.9)",
                    border: "1px solid rgb(255 255 255 / 0.16)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "rgb(255 255 255 / 0.6)", fontSize: 11 }}
                  labelFormatter={(v) => `Round ${v}`}
                  formatter={(value, name) => [`${value} pts`, name]}
                />
                {DRIVERS.map((d) => (
                  <Line
                    key={d.code}
                    type="monotone"
                    dataKey={d.code}
                    stroke={d.color}
                    strokeWidth={focus === d.code ? 3 : 2}
                    strokeOpacity={focus && focus !== d.code ? 0.22 : 1}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#0D0D0D" }}
                    isAnimationActive={inView}
                    animationDuration={1200}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <figcaption className="mt-3 text-[11px] text-(--color-text-muted)">
            Cumulative points across {ROUNDS} rounds. Illustrative season data — the live chart in the app is built from
            the real classification.
          </figcaption>
        </figure>

        <Link
          href="/standings"
          className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-white/40 hover:bg-white/5"
        >
          See full standings
        </Link>
      </div>
    </section>
  );
}
