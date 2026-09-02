"use client";

import { useRef, useState } from "react";
import { Activity, BookOpen, Gauge, Map, Radio, Trophy, type LucideIcon } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { PhoneFrame } from "@/components/home/phone-frame";

/**
 * The mobile pitch: three real device frames (iOS and Android, since the app
 * ships on both) over a feature grid.
 *
 * The grid's interaction — magnetic 3D tilt toward the cursor, a spotlight
 * that tracks it, and siblings dimming so the hovered card is the only lit
 * one — is adapted from KokonutUI's `spotlight-cards` (MIT,
 * https://kokonutui.com), retuned to GridBeat's own palette and content.
 */
const FEATURES: { eyebrow: string; title: string; copy: string; color: string; icon: LucideIcon }[] = [
  { eyebrow: "Live", title: "Timing tower", copy: "Positions, gaps, lap times, sectors, tyres and DRS as the session unfolds.", color: "#df3409", icon: Activity },
  { eyebrow: "Track", title: "3D race map", copy: "Follow every car around the circuit with a smooth, perspective track view.", color: "#2979ff", icon: Map },
  { eyebrow: "Car", title: "Driver telemetry", copy: "Speed, RPM, gear, throttle, braking and DRS for the driver you choose.", color: "#00c853", icon: Gauge },
  { eyebrow: "Radio", title: "Hear the race", copy: "Team radio, live commentary, pit stops and race-control messages in one place.", color: "#ffd600", icon: Radio },
  { eyebrow: "Season", title: "The whole championship", copy: "Schedule, standings, results, driver profiles, circuit guides and the historic archive.", color: "#bf00ff", icon: Trophy },
  { eyebrow: "Context", title: "F1, explained", copy: "Learn the car, tyres, aero and race craft — then read the FIA weekend documents.", color: "#ff8000", icon: BookOpen },
];

export function AppExperience() {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="mobile" className="relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
      <div className="pointer-events-none absolute top-[30%] left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#b52400]/14 blur-[140px]" />

      <div className="relative mx-auto max-w-[84rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-bold tracking-[0.28em] text-[#df3409] uppercase">The mobile experience</p>
          <h2 className="mt-4 font-[var(--font-f1)] text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.92] font-bold tracking-[-0.055em] italic">
            THE PIT WALL,
            <br />
            WITHOUT THE PIT WALL.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/48 sm:text-base">
            One app on both platforms, built on the same live feed as the dashboard: pure black, fast red accents and
            compact data that stays readable when the race gets loud.
          </p>
        </div>

        {/* iOS and Android, side by side — labelled, because shipping on both is the point. */}
        <div className="relative mx-auto mt-16 flex max-w-4xl items-center justify-center gap-3 sm:mt-20 sm:gap-8">
          <PhoneColumn
            platform="android"
            label="Android"
            caption="Season schedule"
            className="w-[27%] max-w-[13rem]"
            motionProps={
              reduced
                ? { initial: false }
                : {
                    initial: { opacity: 0, x: 35, rotate: -2 },
                    whileInView: { opacity: 1, x: 0, rotate: -7 },
                    viewport: { once: true, margin: "-80px" },
                    transition: { duration: 0.7 },
                  }
            }
            screenshotSrc="/app/schedule-screen.webp"
          />

          <PhoneColumn
            platform="ios"
            label="iOS"
            caption="Live timing tower"
            glow
            className="z-10 w-[34%] max-w-[17rem]"
            motionProps={
              reduced
                ? { initial: false }
                : {
                    initial: { opacity: 0, y: 35 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, margin: "-80px" },
                    transition: { duration: 0.75, delay: 0.08 },
                  }
            }
            screenshotSrc="/app/live-tower.webp"
          />

          <PhoneColumn
            platform="android"
            label="Android"
            caption="Stewards' Room"
            className="w-[27%] max-w-[13rem]"
            motionProps={
              reduced
                ? { initial: false }
                : {
                    initial: { opacity: 0, x: -35, rotate: 2 },
                    whileInView: { opacity: 1, x: 0, rotate: 7 },
                    viewport: { once: true, margin: "-80px" },
                    transition: { duration: 0.7, delay: 0.14 },
                  }
            }
            screenshotSrc="/app/stewards-room-tyres.webp"
          />
        </div>

        <div
          id="features"
          className="mt-20 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          onMouseLeave={() => setHovered(null)}
        >
          {FEATURES.map((feature, index) => (
            <SpotlightCard
              key={feature.title}
              feature={feature}
              index={index}
              dimmed={hovered !== null && hovered !== index}
              onEnter={() => setHovered(index)}
              reduced={!!reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PhoneColumn({
  platform,
  label,
  caption,
  glow,
  className,
  motionProps,
  screenshotSrc,
}: {
  platform: "ios" | "android";
  label: string;
  caption: string;
  glow?: boolean;
  className?: string;
  motionProps: Record<string, unknown>;
  screenshotSrc: string;
}) {
  return (
    <motion.div {...motionProps} className={className}>
      <PhoneFrame
        ariaLabel={`${caption}, running on ${label}`}
        platform={platform}
        glow={glow}
        screenshotSrc={screenshotSrc}
      />
      <div className="mt-4 text-center">
        <div className="text-[11px] font-bold text-white/72">{caption}</div>
        <div className="mt-1 text-[9px] font-bold tracking-[0.22em] text-white/30 uppercase">{label}</div>
      </div>
    </motion.div>
  );
}

const TILT_MAX = 8;
const TILT_SPRING = { stiffness: 300, damping: 28 } as const;

/** Adapted from KokonutUI spotlight-cards (MIT) — tilt + cursor spotlight + sibling dimming. */
function SpotlightCard({
  feature,
  index,
  dimmed,
  onEnter,
  reduced,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  dimmed: boolean;
  onEnter: () => void;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, TILT_SPRING);
  const sy = useSpring(py, TILT_SPRING);
  const rotateX = useTransform(sy, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rotateY = useTransform(sx, [0, 1], [-TILT_MAX, TILT_MAX]);
  // Hooks must run unconditionally — the `reduced` check gates rendering
  // below, never the hook call itself.
  const spotlight = useTransform(
    [px, py],
    ([x, y]: number[]) =>
      `radial-gradient(18rem circle at ${x * 100}% ${y * 100}%, color-mix(in srgb, ${feature.color} 22%, transparent), transparent 62%)`,
  );

  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const Icon = feature.icon;

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.045 }}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      className={`group relative min-h-56 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0c0c0c] p-7 transition-[opacity,border-color,transform] duration-300 sm:p-8 ${
        dimmed ? "opacity-45" : "opacity-100"
      }`}
    >
      {/* Spotlight follows the cursor; tinted with the card's own accent. */}
      {!reduced && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlight }}
        />
      )}

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={{
              color: feature.color,
              borderColor: `color-mix(in srgb, ${feature.color} 32%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${feature.color} 12%, transparent)`,
            }}
          >
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <span
            className="text-[9px] font-bold tracking-[0.24em] uppercase"
            style={{ color: feature.color }}
          >
            {feature.eyebrow}
          </span>
        </div>

        <h3 className="mt-7 font-[var(--font-f1)] text-xl font-bold text-white">{feature.title}</h3>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/43">{feature.copy}</p>
      </div>
    </motion.article>
  );
}
