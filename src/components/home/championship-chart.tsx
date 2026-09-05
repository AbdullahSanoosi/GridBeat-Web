"use client";

import { useRef, useState } from "react";
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
import type { ChampionshipPoint, HomeDriverStanding } from "@/lib/home/marketing-data";

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

function teamLogo(team: string) {
  const normalized = team.toLowerCase();
  if (normalized.includes("red bull") && !normalized.includes("racing")) return "red_bull";
  if (normalized.includes("racing bulls") || normalized === "rb") return "racing_bulls";
  if (normalized.includes("aston martin")) return "aston_martin";
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function ChampionshipChart({
  drivers,
  progression,
}: {
  drivers: HomeDriverStanding[];
  progression: ChampionshipPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [focus, setFocus] = useState<string | null>(null);
  const throughRound = progression.at(-1)?.round ?? 0;

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
            {drivers.map((d) => (
              <li key={d.driverId}>
                <button
                  onMouseEnter={() => setFocus(d.driverId)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(d.driverId)}
                  onBlur={() => setFocus(null)}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  style={{ opacity: focus && focus !== d.driverId ? 0.4 : 1 }}
                >
                  <Image src={`/teams/${teamLogo(d.team)}.png`} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                  <span className="flex flex-col leading-tight">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-[var(--font-f1)] text-xs font-bold text-white">{d.code}</span>
                    </span>
                    <span className="font-[var(--font-f1)] text-[10px] tabular-nums text-(--color-text-muted)">
                      P{d.position} · {d.points} pts
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
              <LineChart data={progression} margin={{ top: 6, right: 46, bottom: 4, left: -18 }}>
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
                  formatter={(value, name) => [`${value} pts`, drivers.find((driver) => driver.driverId === name)?.code ?? name]}
                />
                {drivers.map((d) => (
                  <Line
                    key={d.driverId}
                    type="monotone"
                    dataKey={d.driverId}
                    stroke={d.color}
                    strokeWidth={focus === d.driverId ? 3 : 2}
                    strokeOpacity={focus && focus !== d.driverId ? 0.22 : 1}
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
            Cumulative race and sprint points through round {throughRound}. Source: GridBeat F1 Stats API.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
