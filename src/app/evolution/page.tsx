"use client";

import { useState } from "react";
import { LEGEND_CARS } from "@/lib/models/legend-cars";

/**
 * Ports evolution_screen.dart's era-by-era story — ten legend cars, scrubbed
 * chronologically. The Flutter screen renders each car as a downloaded 3D
 * model in a WebView; that infrastructure is genuinely mobile-only (see
 * GridBeat CLAUDE.md's "3D Car Viewer" note), so this renders the same
 * facts (name, year, blurb, win rate, stat chips) as a 2D scrubbable
 * timeline instead of attempting a web port of the WebView shell.
 */
export default function EvolutionPage() {
  const [index, setIndex] = useState(0);
  const car = LEGEND_CARS[index];

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[var(--font-f1)] text-2xl font-bold">Evolution</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">Ten cars that changed the sport, in order</p>

      <div
        className="relative overflow-hidden rounded-2xl border border-(--color-border) p-6 transition-colors md:p-10"
        style={{
          background: `radial-gradient(circle at 15% 0%, color-mix(in srgb, ${car.accent} 22%, transparent), transparent 60%), var(--color-surface)`,
        }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-[var(--font-f1)] text-sm font-black tracking-[0.2em]" style={{ color: car.accent }}>
            {car.year}
          </span>
          <span className="text-xs font-bold text-(--color-text-muted)">
            {index + 1} / {LEGEND_CARS.length}
          </span>
        </div>

        <h2 className="mt-2 font-[var(--font-f1)] text-3xl font-black tracking-tight md:text-5xl">{car.name}</h2>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-(--color-text-secondary) md:text-base">
          {car.blurb}
        </p>

        {car.winRate != null && (
          <div className="mt-6 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-(--color-text-muted)">
              <span>WIN RATE</span>
              <span style={{ color: car.accent }}>{Math.round(car.winRate * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-(--color-border)">
              <div
                className="h-full rounded-full"
                style={{ width: `${car.winRate * 100}%`, backgroundColor: car.accent }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {car.stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-(--color-surface-elevated) px-3.5 py-2">
              <div className="text-[9px] font-bold tracking-wide text-(--color-text-muted)">{s.label.toUpperCase()}</div>
              <div className="mt-0.5 text-sm font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) text-lg disabled:opacity-30"
            aria-label="Previous car"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(LEGEND_CARS.length - 1, i + 1))}
            disabled={index === LEGEND_CARS.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-(--color-border) text-lg disabled:opacity-30"
            aria-label="Next car"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto border-t border-(--color-border)">
        <div className="flex min-w-max items-center gap-1 px-1">
          {LEGEND_CARS.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setIndex(i)}
              className="flex flex-col items-center gap-2 px-3 pt-0 pb-2"
            >
              <span
                className="-mt-[5px] h-2.5 w-2.5 rounded-full transition-transform"
                style={{
                  backgroundColor: i === index ? c.accent : "var(--color-border)",
                  transform: i === index ? "scale(1.4)" : "scale(1)",
                }}
              />
              <span
                className={`text-[10px] font-bold whitespace-nowrap ${i === index ? "" : "text-(--color-text-muted)"}`}
                style={i === index ? { color: c.accent } : undefined}
              >
                {c.year.split("–")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
