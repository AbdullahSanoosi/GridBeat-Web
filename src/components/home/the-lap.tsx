"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** False for track-outline paths, where a car marker would reverse direction. */
  isCentreline?: boolean;
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

/** Rendered length of the car in viewBox units at u=1, and the render's own w/h. */
const CAR_LENGTH = 78;
const CAR_ASPECT = 2.987;

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
  // The car is a top-view render whose nose points +X, so it has to be
  // rotated to the path's heading or it drives sideways round the lap.
  const carAngle = useMotionValue(0);

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

  // Position + heading share one routine so the seed and the scroll updates
  // can't drift apart. Heading comes from sampling a little way ahead along
  // the path and taking the angle between the two points; the modulo keeps
  // that sample on-track when the car is at the very end of a closed lap.
  const placeCar = useCallback(
    (p: number) => {
      const path = pathRef.current;
      if (!path || pathLength === 0) return;
      const at = Math.min(Math.max(p, 0), 1) * pathLength;
      const pt = path.getPointAtLength(at);
      const ahead = path.getPointAtLength((at + pathLength * 0.004) % pathLength);
      carX.set(pt.x);
      carY.set(pt.y);
      carAngle.set((Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI);
    },
    [pathLength, carX, carY, carAngle],
  );

  useMotionValueEvent(progress, "change", placeCar);

  // Seed at the start line so the car is placed before the first scroll.
  useEffect(() => {
    placeCar(0);
  }, [placeCar]);

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
              {/* Racing line, drawn in the lap's own three sector colours.
                  `pathLength`/`pathOffset` are Motion's SVG draw primitives
                  (both normalised 0–1); it manages stroke-dasharray and
                  -dashoffset internally, which a hand-rolled dasharray in
                  `style` can't do reliably next to a MotionValue. Each
                  segment starts at its own third of the lap and grows only
                  within it, so the line changes colour exactly where the
                  real sector boundaries are. */}
              {SECTORS.map((sector, i) => (
                <SectorTrace
                  key={sector.n}
                  d={circuit.d}
                  index={i}
                  color={sector.color}
                  width={7 * u}
                  progress={progress}
                  reduced={!!reduced}
                  pathRef={i === 0 ? pathRef : undefined}
                />
              ))}

              {/* Car — the RB22 from above, turned to the racing line's
                  heading. Nested groups keep translate and rotate in a fixed
                  order; composing both on one element leaves the order up to
                  however the transform string is assembled. */}
              {!reduced && pathLength > 0 && circuit.isCentreline !== false && (
                <motion.g style={{ x: carX, y: carY }}>
                  <motion.g style={{ rotate: carAngle }}>
                    <ellipse
                      rx={CAR_LENGTH * u * 0.62}
                      ry={CAR_LENGTH * u * 0.3}
                      fill="var(--color-primary)"
                      opacity={0.2}
                      style={{ filter: `blur(${5 * u}px)` }}
                    />
                    <image
                      href="/app/rb22-top.webp"
                      x={(-CAR_LENGTH / 2) * u}
                      y={(-CAR_LENGTH / CAR_ASPECT / 2) * u}
                      width={CAR_LENGTH * u}
                      height={(CAR_LENGTH / CAR_ASPECT) * u}
                    />
                  </motion.g>
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

/**
 * One third of the racing line, in that sector's colour, revealed as the car
 * drives through it.
 */
function SectorTrace({
  d,
  index,
  color,
  width,
  progress,
  reduced,
  pathRef,
}: {
  d: string;
  index: number;
  color: string;
  width: number;
  progress: ReturnType<typeof useSpring>;
  reduced: boolean;
  pathRef?: React.RefObject<SVGPathElement | null>;
}) {
  const span = 1 / SECTORS.length;
  const start = index * span;
  // Visible length within this segment only: 0 before the car arrives, its
  // full third once the car has left it.
  const drawn = useTransform(progress, (p) =>
    reduced ? span : Math.min(Math.max(p - start, 0), span),
  );
  // Where this segment starts along the lap. This *must* be a MotionValue:
  // Motion only converts pathOffset into stroke-dashoffset inside
  // `addSVGPathValue` (motion-dom's SVG effect), which is MotionValue-only —
  // a plain number in `style` is dropped without warning, which left all
  // three sectors drawing from the start line stacked on top of each other.
  // Same trap as the hand-rolled strokeDasharray one, one layer down.
  const offset = useMotionValue(start);

  return (
    <motion.path
      ref={pathRef}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        pathLength: drawn,
        pathOffset: offset,
        filter: `drop-shadow(0 0 14px color-mix(in srgb, ${color} 70%, transparent))`,
      }}
    />
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
  const span = 1 / SECTORS.length;
  const start = index * span;
  const end = start + span;
  const opacity = useTransform(progress, [start - 0.12, start + 0.04], [0.28, 1]);
  const x = useTransform(progress, [start - 0.12, start + 0.04], [24, 0]);

  // "Live" while the car is actually inside this sector — ramps up as it
  // crosses the line and back down as it leaves, so exactly one card is lit
  // at a time, the way a timing screen highlights the sector being set.
  const live = useTransform(progress, [start - 0.03, start + 0.03, end - 0.03, end + 0.03], [0, 1, 1, 0]);
  const borderColor = useTransform(live, (v) => `color-mix(in srgb, ${sector.color} ${8 + v * 46}%, rgb(255 255 255 / 0.07))`);
  const boxShadow = useTransform(live, (v) => `0 22px 60px -30px color-mix(in srgb, ${sector.color} ${Math.round(v * 95)}%, transparent)`);
  const railScale = useTransform(live, [0, 1], [0, 1]);
  const badgeOpacity = useTransform(live, [0, 1], [0, 1]);

  return (
    <motion.div
      style={reduced ? undefined : { opacity, x, borderColor, boxShadow }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-(--color-surface)/70 p-4 backdrop-blur-sm sm:p-5 lg:p-[clamp(0.85rem,1.8vh,1.5rem)]"
    >
      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-[3px] origin-center rounded-full"
          style={{ backgroundColor: sector.color, scaleY: railScale }}
        />
      )}

      <div className="mb-2.5 flex items-baseline gap-3 lg:mb-[clamp(0.4rem,1vh,0.75rem)]">
        <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.22em]" style={{ color: sector.color }}>
          SECTOR {sector.n}
        </span>
        <span className="h-px flex-1" style={{ backgroundColor: sector.color, opacity: 0.35 }} />
        {!reduced && (
          <motion.span
            className="font-[var(--font-f1)] text-[9px] font-black tracking-[0.18em]"
            style={{ color: sector.color, opacity: badgeOpacity }}
          >
            ON TRACK
          </motion.span>
        )}
      </div>
      <h3 className="font-[var(--font-f1)] text-lg font-bold sm:text-xl lg:text-[clamp(1.05rem,2.4vh,1.5rem)] lg:leading-tight">
        {sector.title}
      </h3>
      <p className="mt-1 text-[13px] text-(--color-text-secondary) lg:text-[clamp(0.75rem,1.5vh,0.875rem)]">
        {sector.blurb}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:mt-[clamp(0.5rem,1.4vh,1rem)]">
        {/* Plain descriptive rows, not links — the dashboard they'd point to
            isn't public yet (see src/middleware.ts's Basic Auth gate). */}
        {sector.items.map((item) => (
          <div key={item.label} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5">
            <span
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: sector.color }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold whitespace-nowrap text-white/90">{item.label}</span>
              <span className="block text-[11px] leading-snug text-(--color-text-muted)">{item.detail}</span>
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
