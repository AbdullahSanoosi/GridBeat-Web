"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface SeasonPosition {
  season: number;
  position: number;
}

/**
 * Championship-finish-by-year line chart — position on an inverted Y axis
 * (P1 at the top). Ported from the fl_chart version in
 * driver_details_screen.dart's _DriverChampionshipHistorySection (and the
 * constructor twin) using Recharts instead.
 */
export function ChampionshipChart({ seasons, accent }: { seasons: SeasonPosition[]; accent: string }) {
  const maxPos = Math.max(...seasons.map((s) => s.position));

  return (
    <div className="h-[220px] rounded-xl border border-(--color-border) bg-(--color-surface) p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={seasons} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="season"
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, maxPos + 1]}
            tickFormatter={(v: number) => `P${v}`}
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-text-primary)" }}
            formatter={(value) => [`P${value}`, "Position"]}
          />
          <Line
            type="linear"
            dataKey="position"
            stroke={accent}
            strokeWidth={2.5}
            dot={{ r: 3, fill: accent, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
