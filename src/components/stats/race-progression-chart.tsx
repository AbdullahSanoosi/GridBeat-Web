"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/stats/presentation/widgets/race_progression_chart.dart.
 * A bump/slope chart with curved ribbons connecting QUALI -> GRID -> RACE
 * columns. The Flutter version used a CustomPainter (Canvas); this is a
 * direct port to plain SVG instead — the content (curves, dots, text) maps
 * onto SVG primitives naturally, and SVG sidesteps the canvas+ResizeObserver
 * feedback-loop pitfall documented in the track map (gotcha #5 in this
 * repo's CLAUDE.md): the chart's width comes from observing the container,
 * and nothing here writes back into that container's own size.
 */
import { useEffect, useRef, useState } from "react";
import type { RaceProgressionEntry } from "@/lib/api/race-progression";

const ROW_HEIGHT = 26;

export function RaceProgressionChart({ entries }: { entries: RaceProgressionEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure synchronously up front — don't rely solely on the observer's
    // first callback for the initial paint, since that leaves the chart
    // blank for a frame (or indefinitely in a context where ResizeObserver
    // is throttled/inert). Same idiom as the track map's synchronous first
    // paint before its rAF loop (see this repo's CLAUDE.md gotcha #6).
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((observed) => {
      const w = observed[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (entries.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-(--color-text-secondary)">
        No qualifying/race data for this race yet.
      </p>
    );
  }

  const quali = entries.filter((e) => e.qualiPos != null).sort((a, b) => a.qualiPos! - b.qualiPos!);
  const grid = entries.filter((e) => e.gridPos != null).sort((a, b) => a.gridPos! - b.gridPos!);
  const classified = entries.filter((e) => e.racePos != null).sort((a, b) => a.racePos! - b.racePos!);
  const unclassified = entries
    .filter((e) => e.racePos == null && e.gridPos != null)
    .sort((a, b) => a.gridPos! - b.gridPos!);
  const race = [...classified, ...unclassified];

  const rowCount = Math.max(quali.length, grid.length, race.length, 1);
  const chartHeight = rowCount * ROW_HEIGHT;
  const leftLabelW = width > 0 ? Math.min(92, Math.max(56, width * 0.16)) : 72;
  const plotW = Math.max(width - leftLabelW * 2, 0);
  const colX = [leftLabelW, leftLabelW + plotW / 2, leftLabelW + plotW];

  const yFor = (i: number) => i * ROW_HEIGHT + ROW_HEIGHT / 2;
  const qualiY = new Map(quali.map((e, i) => [e.driverId, yFor(i)]));
  const gridY = new Map(grid.map((e, i) => [e.driverId, yFor(i)]));
  const raceY = new Map(race.map((e, i) => [e.driverId, yFor(i)]));

  function hopColor(from: number | null, to: number | null): string {
    if (from == null || to == null) return "color-mix(in srgb, var(--color-border) 35%, transparent)";
    if (to === from) return "color-mix(in srgb, var(--color-border) 60%, transparent)";
    return to < from
      ? "color-mix(in srgb, var(--color-success) 65%, transparent)"
      : "color-mix(in srgb, var(--color-error) 65%, transparent)";
  }

  const strokeWidth = Math.min(8, Math.max(2, ROW_HEIGHT * 0.3));
  const dotR = Math.min(8, Math.max(4, ROW_HEIGHT * 0.26));
  const fontSize = Math.min(11, Math.max(8, ROW_HEIGHT * 0.4));

  function ribbonPath(x1: number, y1: number, x2: number, y2: number): string {
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  return (
    <div>
      <div className="flex" style={{ paddingLeft: leftLabelW, paddingRight: leftLabelW }}>
        <div className="flex-1 text-left text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">QUALI</div>
        <div className="flex-1 text-center text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">GRID</div>
        <div className="flex-1 text-right text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">RACE</div>
      </div>
      <div ref={containerRef} className="mt-3">
        {width > 0 && (
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`}>
            {entries.map((e) => {
              const qy = qualiY.get(e.driverId);
              const gy = gridY.get(e.driverId);
              const ry = raceY.get(e.driverId);
              return (
                <g key={e.driverId}>
                  {qy != null && gy != null && (
                    <path
                      d={ribbonPath(colX[0], qy, colX[1], gy)}
                      stroke={hopColor(e.qualiPos, e.gridPos)}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                  {gy != null && ry != null && (
                    <path
                      d={ribbonPath(colX[1], gy, colX[2], ry)}
                      stroke={hopColor(e.gridPos, e.racePos)}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
            {quali.map((e, i) => {
              const y = yFor(i);
              return (
                <g key={`q-${e.driverId}`}>
                  <circle cx={colX[0]} cy={y} r={dotR} fill={e.teamColor} />
                  <text
                    x={colX[0] - 12}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={800}
                    fill="var(--color-text-primary)"
                  >
                    {e.qualiPos} {e.code}
                  </text>
                </g>
              );
            })}
            {grid.map((e, i) => (
              <circle key={`g-${e.driverId}`} cx={colX[1]} cy={yFor(i)} r={dotR} fill={e.teamColor} />
            ))}
            {race.map((e, i) => {
              const y = yFor(i);
              const dnf = e.racePos == null;
              return (
                <g key={`r-${e.driverId}`}>
                  <circle cx={colX[2]} cy={y} r={dotR} fill={dnf ? "var(--color-text-muted)" : e.teamColor} />
                  <text
                    x={colX[2] + 12}
                    y={y}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={800}
                    fill={dnf ? "var(--color-text-muted)" : "var(--color-text-primary)"}
                  >
                    {dnf ? (e.raceStatus ?? "DNF") : `${e.code} ${e.racePos}`}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
