"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

export interface LapCircuit {
  d: string;
  viewBox: string;
  /** Circuit name, e.g. "Autodromo Nazionale di Monza". */
  name: string;
  /** Location line, e.g. "MONZA, ITALY". */
  label: string;
  /** Round context, e.g. "NEXT UP · ROUND 13". */
  eyebrow: string;
}

/**
 * The page's spine: one lap of whichever circuit is up next, driven by scroll.
 *
 * The racing line draws itself as you scroll, a car marker runs the real
 * circuit geometry (sampled off the live SVG path via getPointAtLength),
 * and the feature groups arrive as marshal posts at their sector. Sectors
 * are the ordering device because F1 laps genuinely have three of them —
 * this is the content's own structure, not decorative numbering bolted on.
 *
 * The outline is fetched server-side from the circuit's own SVG (see
 * lib/home/circuit-outline.ts) so this follows the calendar rather than
 * being pinned to one track.
 */

const SECTORS = [
  {
    n: 1,
    color: "var(--color-sector-green)",
    title: "The Session, Live",
    blurb: "Sub-second timing straight off the F1 feed.",
    items: [
      { href: "/live", label: "Live Timing", detail: "Tower, gaps, sector splits" },
      { href: "/live", label: "Telemetry", detail: "Speed, throttle, brake, DRS" },
      { href: "/live", label: "3D Track Map", detail: "Every car, in position" },
      { href: "/live", label: "Team Radio", detail: "Clips with transcripts" },
    ],
  },
  {
    n: 2,
    color: "var(--color-sector-purple)",
    title: "The Season",
    blurb: "Where the championship actually stands.",
    items: [
      { href: "/standings", label: "Standings", detail: "Drivers and constructors" },
      { href: "/schedule", label: "Schedule", detail: "Every session, every round" },
      { href: "/results", label: "Race Archives", detail: "Results back to 1950" },
      { href: "/stats", label: "Stats", detail: "Records and leaderboards" },
    ],
  },
  {
    n: 3,
    color: "var(--color-sector-yellow)",
    title: "The Deep End",
    blurb: "The context behind what you just watched.",
    items: [
      { href: "/circuits", label: "Circuit Guide", detail: "Every track, lap by lap" },
      { href: "/hall-of-fame", label: "Hall of Fame", detail: "Champions and legends" },
      { href: "/driver/max_verstappen", label: "Driver Profiles", detail: "Careers, form, head-to-head" },
      { href: "/news", label: "News", detail: "Straight from the paddock" },
    ],
  },
] as const;

export function TheLap({ circuit }: { circuit: LapCircuit }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  // Source circuit SVGs are square, but most tracks only fill part of that
  // box (Monza sits in the top ~60%), which left a large dead gap under the
  // outline and pushed the caption down. Measuring the path's own bounds and
  // reframing to them makes every circuit fill its frame the same way.
  const [fittedBox, setFittedBox] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth the raw scroll value so the car glides instead of jittering
  // frame-to-frame with the wheel.
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.0005 });

  const carX = useMotionValue(0);
  const carY = useMotionValue(0);

  // Source SVGs don't share a coordinate space (the baked fallback is
  // 0 0 1000 1000, the live circuit files are ~524 wide), so every stroke
  // weight and marker radius below is expressed in units of the box actually
  // being rendered — the fitted one once it's measured, or the source box
  // until then.
  const activeBox = fittedBox ?? circuit.viewBox;
  const u = (Number(activeBox.split(/\s+/)[2]) || 1000) / 1000;

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    setPathLength(path.getTotalLength());
    try {
      const b = path.getBBox();
      if (b.width > 0 && b.height > 0) {
        const pad = Math.max(b.width, b.height) * 0.08;
        setFittedBox(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
      }
    } catch {
      // getBBox throws on a detached/hidden node — keep the source viewBox.
    }
  }, [circuit.d]);

  useMotionValueEvent(progress, "change", (p) => {
    const path = pathRef.current;
    if (!path || pathLength === 0) return;
    const pt = path.getPointAtLength(Math.min(Math.max(p, 0), 1) * pathLength);
    carX.set(pt.x);
    carY.set(pt.y);
  });

  // Seed the marker at the start line so it's placed before first scroll.
  useEffect(() => {
    const path = pathRef.current;
    if (!path || pathLength === 0) return;
    const pt = path.getPointAtLength(0);
    carX.set(pt.x);
    carY.set(pt.y);
  }, [pathLength, carX, carY]);

  return (
    <section
      ref={containerRef}
      className={reduced ? "relative" : "relative h-auto lg:h-[340vh]"}
    >
      <div
        className={
          reduced
            ? "px-5 py-16 sm:px-6"
            : // Below lg this just flows: a phone can't show a circuit and
              // three cards at once, and pinning it there only produces a
              // long stretch of empty scrolling. From lg it pins to exactly
              // one viewport, with the padding scaling by viewport height so
              // all three sectors fit a short laptop screen as well as a tall
              // monitor.
              "flex items-center overflow-hidden px-5 py-16 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:py-[clamp(1.5rem,4vh,4rem)]"
        }
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          {/* Circuit */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <svg viewBox={activeBox} className="w-full overflow-visible">
              {/* Ghost outline — the full lap, always visible */}
              <path
                d={circuit.d}
                fill="none"
                stroke="rgb(255 255 255 / 0.07)"
                strokeWidth={26 * u}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={circuit.d}
                fill="none"
                stroke="rgb(255 255 255 / 0.12)"
                strokeWidth={2 * u}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Racing line — drawn by scroll. `pathLength` is Motion's own
                  SVG draw primitive (0–1); it manages stroke-dasharray and
                  -dashoffset internally, which a hand-rolled dasharray in
                  `style` can't do reliably next to a MotionValue. */}
              <motion.path
                ref={pathRef}
                d={circuit.d}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={7 * u}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  pathLength: reduced ? 1 : progress,
                  filter: "drop-shadow(0 0 14px color-mix(in srgb, var(--color-primary) 70%, transparent))",
                }}
              />
              {/* Car */}
              {!reduced && pathLength > 0 && (
                <motion.g style={{ x: carX, y: carY }}>
                  <circle r={26 * u} fill="var(--color-primary)" opacity={0.22} />
                  <circle r={13 * u} fill="var(--color-primary)" />
                  <circle r={5 * u} fill="#fff" />
                </motion.g>
              )}
            </svg>

            <div className="mt-6 text-center lg:text-left">
              <div className="text-[9px] font-bold tracking-[0.24em] text-(--color-primary) uppercase">
                {circuit.eyebrow}
              </div>
              <div className="mt-1.5 font-[var(--font-f1)] text-xl font-bold tracking-tight">{circuit.name}</div>
              <div className="text-xs tracking-[0.2em] text-(--color-text-muted)">{circuit.label}</div>
            </div>
          </div>

          {/* Sector cards */}
          <div className="flex flex-col gap-4 lg:gap-[clamp(0.6rem,1.6vh,1.25rem)]">
            {SECTORS.map((s, i) => (
              <SectorCard key={s.n} sector={s} index={i} progress={progress} reduced={!!reduced} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectorCard({
  sector,
  index,
  progress,
  reduced,
}: {
  sector: (typeof SECTORS)[number];
  index: number;
  progress: ReturnType<typeof useSpring>;
  reduced: boolean;
}) {
  // Each sector lights up as the car reaches its third of the lap.
  const start = index / SECTORS.length;
  const opacity = useTransform(progress, [start - 0.12, start + 0.04], [0.28, 1]);
  const x = useTransform(progress, [start - 0.12, start + 0.04], [24, 0]);
  const borderColor = useTransform(progress, [start - 0.12, start + 0.04], [
    "rgb(255 255 255 / 0.07)",
    "rgb(255 255 255 / 0.16)",
  ]);

  return (
    <motion.div
      style={reduced ? undefined : { opacity, x, borderColor }}
      className="rounded-2xl border border-white/10 bg-(--color-surface)/70 p-4 backdrop-blur-sm sm:p-5 lg:p-[clamp(0.85rem,1.8vh,1.5rem)]"
    >
      <div className="mb-2.5 flex items-baseline gap-3 lg:mb-[clamp(0.4rem,1vh,0.75rem)]">
        <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.22em]" style={{ color: sector.color }}>
          SECTOR {sector.n}
        </span>
        <span className="h-px flex-1" style={{ backgroundColor: sector.color, opacity: 0.35 }} />
      </div>
      <h3 className="font-[var(--font-f1)] text-lg font-bold sm:text-xl lg:text-[clamp(1.05rem,2.4vh,1.5rem)] lg:leading-tight">
        {sector.title}
      </h3>
      <p className="mt-1 text-[13px] text-(--color-text-secondary) lg:text-[clamp(0.75rem,1.5vh,0.875rem)]">
        {sector.blurb}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:mt-[clamp(0.5rem,1.4vh,1rem)]">
        {sector.items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05] lg:py-[clamp(0.25rem,0.8vh,0.5rem)]"
          >
            <span
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-[2.4]"
              style={{ backgroundColor: sector.color }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold whitespace-nowrap text-white/90">{item.label}</span>
              <span className="block text-[11px] leading-snug text-(--color-text-muted)">{item.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
