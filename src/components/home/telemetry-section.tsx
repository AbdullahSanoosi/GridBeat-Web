"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  BRAKE_PCT,
  CIRCUIT_NAME,
  CORNERS,
  LAP_LENGTH_M,
  SECTOR_BOUNDS,
  SPEED_KMH,
  THROTTLE_PCT,
} from "@/lib/home/telemetry";

/**
 * Speed / throttle / brake over one lap — the three channels the app's own
 * Telemetry Compare screen plots. Single series, so no legend: the title
 * names it (see the dataviz rule on one-series charts).
 *
 * Hand-rolled SVG rather than a chart library because the marks here are
 * bespoke — an area under a line, a two-colour pedal strip, and corner
 * annotations pinned to braking events.
 */

const W = 1000;
const H = 260;
const PAD_T = 24;
const PAD_B = 26;
const V_MIN = 120;
const V_MAX = 360;

const N = SPEED_KMH.length;
const xAt = (i: number) => (i / (N - 1)) * W;
const yAt = (v: number) => PAD_T + (1 - (v - V_MIN) / (V_MAX - V_MIN)) * (H - PAD_T - PAD_B);

const linePath = SPEED_KMH.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join("");
const areaPath = `${linePath}L${W},${H - PAD_B}L0,${H - PAD_B}Z`;

export function TelemetrySection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const idx = hover;
  const topSpeed = Math.max(...SPEED_KMH);
  const minSpeed = Math.min(...SPEED_KMH);
  const fullThrottleShare = Math.round((THROTTLE_PCT.filter((t) => t >= 85).length / N) * 100);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - box.left) / box.width;
    setHover(Math.min(N - 1, Math.max(0, Math.round(frac * (N - 1)))));
  }

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-white/10 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.26em] text-(--color-sector-green)">
              TELEMETRY
            </span>
            <h2 className="mt-3 font-[var(--font-f1)] text-3xl font-bold sm:text-5xl">One lap, every input</h2>
            <p className="mt-3 max-w-lg text-sm text-(--color-text-secondary)">
              Speed, throttle and brake across {(LAP_LENGTH_M / 1000).toFixed(3)} km of {CIRCUIT_NAME} — the same
              channels the app plots live, for any two drivers, side by side.
            </p>
          </div>
          <dl className="flex gap-7">
            <Stat label="TOP SPEED" value={`${topSpeed}`} unit="km/h" color="var(--color-sector-green)" />
            <Stat label="SLOWEST" value={`${minSpeed}`} unit="km/h" color="var(--color-sector-yellow)" />
            <Stat label="FULL THROTTLE" value={`${fullThrottleShare}`} unit="%" color="var(--color-primary)" />
          </dl>
        </div>

        <figure className="mt-10 rounded-2xl border border-white/10 bg-(--color-surface)/60 p-4 sm:p-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`Speed trace for one lap of ${CIRCUIT_NAME}, peaking at ${topSpeed} kilometres per hour`}>
            <defs>
              <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-sector-green)" stopOpacity="0.34" />
                <stop offset="100%" stopColor="var(--color-sector-green)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Sector bands — recessive, they orient rather than decorate */}
            {SECTOR_BOUNDS.slice(0, -1).map((s, i) => (
              <rect
                key={i}
                x={s * W}
                y={PAD_T}
                width={(SECTOR_BOUNDS[i + 1] - s) * W}
                height={H - PAD_T - PAD_B}
                fill={i % 2 === 0 ? "rgb(255 255 255 / 0.018)" : "transparent"}
              />
            ))}
            {SECTOR_BOUNDS.slice(1, -1).map((s, i) => (
              <line key={i} x1={s * W} y1={PAD_T} x2={s * W} y2={H - PAD_B} stroke="rgb(255 255 255 / 0.09)" strokeDasharray="3 5" />
            ))}

            {/* Speed gridlines */}
            {[150, 200, 250, 300, 350].map((v) => (
              <g key={v}>
                <line x1={0} y1={yAt(v)} x2={W} y2={yAt(v)} stroke="rgb(255 255 255 / 0.055)" />
                <text x={4} y={yAt(v) - 4} fontSize={9} fill="rgb(255 255 255 / 0.3)" className="font-[var(--font-f1)]">
                  {v}
                </text>
              </g>
            ))}

            <motion.path
              d={areaPath}
              fill="url(#speedFill)"
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
            <motion.path
              d={linePath}
              fill="none"
              stroke="var(--color-sector-green)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 1.6, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--color-sector-green) 55%, transparent))" }}
            />

            {/* Corner annotations, pinned to the braking events the model found */}
            {CORNERS.map((c) => (
              <g key={c.label} opacity={0.75}>
                <line x1={c.at * W} y1={H - PAD_B} x2={c.at * W} y2={H - PAD_B + 6} stroke="rgb(255 255 255 / 0.35)" />
                <text
                  x={c.at * W}
                  y={H - PAD_B + 17}
                  fontSize={8.5}
                  textAnchor="middle"
                  fill="rgb(255 255 255 / 0.45)"
                  className="font-[var(--font-f1)]"
                  letterSpacing="0.08em"
                >
                  {c.label}
                </text>
              </g>
            ))}

            {/* Hover crosshair */}
            {idx != null && (
              <g pointerEvents="none">
                <line x1={xAt(idx)} y1={PAD_T} x2={xAt(idx)} y2={H - PAD_B} stroke="rgb(255 255 255 / 0.5)" />
                <circle cx={xAt(idx)} cy={yAt(SPEED_KMH[idx])} r={4.5} fill="var(--color-sector-green)" stroke="#0D0D0D" strokeWidth={2} />
                <g transform={`translate(${Math.min(Math.max(xAt(idx), 54), W - 54)}, ${PAD_T + 2})`}>
                  <rect x={-50} y={-2} width={100} height={30} rx={6} fill="#000" fillOpacity={0.86} stroke="rgb(255 255 255 / 0.16)" />
                  <text x={0} y={11} fontSize={11} textAnchor="middle" fill="#fff" className="font-[var(--font-f1)]">
                    {SPEED_KMH[idx]} km/h
                  </text>
                  <text x={0} y={22} fontSize={8.5} textAnchor="middle" fill="rgb(255 255 255 / 0.55)" className="font-[var(--font-f1)]">
                    {Math.round((idx / (N - 1)) * LAP_LENGTH_M)} m
                  </text>
                </g>
              </g>
            )}

            <rect
              x={0}
              y={0}
              width={W}
              height={H}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "crosshair" }}
            />
          </svg>

          {/* Pedal strip — throttle above the line, brake below */}
          <svg viewBox={`0 0 ${W} 46`} className="mt-3 w-full" aria-hidden="true">
            {THROTTLE_PCT.map((t, i) =>
              t > 0 ? (
                <rect key={`t${i}`} x={xAt(i)} y={22 - (t / 100) * 20} width={W / N + 0.6} height={(t / 100) * 20} fill="var(--color-sector-green)" opacity={0.75} />
              ) : null,
            )}
            {BRAKE_PCT.map((b, i) =>
              b > 0 ? (
                <rect key={`b${i}`} x={xAt(i)} y={24} width={W / N + 0.6} height={(b / 100) * 20} fill="var(--color-error)" opacity={0.85} />
              ) : null,
            )}
            <line x1={0} y1={23} x2={W} y2={23} stroke="rgb(255 255 255 / 0.14)" />
          </svg>

          <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-(--color-text-muted)">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-(--color-sector-green)" /> Throttle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-(--color-error)" /> Brake
            </span>
            <span className="ml-auto">
              Modelled from {CIRCUIT_NAME}&apos;s real centreline geometry — not a captured session.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Stat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <dd className="font-[var(--font-f1)] text-2xl font-bold tabular-nums sm:text-3xl" style={{ color }}>
        {value}
        <span className="ml-1 text-xs font-medium text-(--color-text-muted)">{unit}</span>
      </dd>
      <dt className="mt-0.5 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">{label}</dt>
    </div>
  );
}
