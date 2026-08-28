"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export interface SeasonPoints {
  season: number;
  points: number;
}

/**
 * Points-per-season bar chart — reads as "how much" vs the championship
 * line chart's "trend/rank over time". Ported from _SeasonPointsBarChart /
 * _ConstructorSeasonPointsBarChart using Recharts instead of fl_chart.
 */
export function SeasonPointsChart({ seasons, accent }: { seasons: SeasonPoints[]; accent: string }) {
  return (
    <div className="h-[120px] rounded-xl border border-(--color-border) bg-(--color-surface) p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={seasons} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="season"
            tick={{ fill: "var(--color-text-muted)", fontSize: 8 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-text-primary)" }}
            formatter={(value) => [`${value} pts`, "Points"]}
            cursor={{ fill: "var(--color-surface-elevated)" }}
          />
          <Bar dataKey="points" fill={accent} radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
