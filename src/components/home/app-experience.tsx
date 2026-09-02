"use client";

import { useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Gauge,
  Home,
  Map,
  Radio,
  ScrollText,
  Trophy,
  type LucideIcon,
} from "lucide-react";
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
          >
            <SeasonScreen />
          </PhoneColumn>

          <PhoneColumn
            platform="ios"
            label="iOS"
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
          >
            <HomeScreen />
          </PhoneColumn>

          <PhoneColumn
            platform="android"
            label="Android"
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
          >
            <StewardsScreen />
          </PhoneColumn>
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
  glow,
  className,
  motionProps,
  children,
}: {
  platform: "ios" | "android";
  label: string;
  glow?: boolean;
  className?: string;
  motionProps: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <motion.div {...motionProps} className={className}>
      <PhoneFrame ariaLabel={`GridBeat on ${label}`} platform={platform} glow={glow}>
        {children}
      </PhoneFrame>
      <div className="mt-4 text-center text-[9px] font-bold tracking-[0.22em] text-white/32 uppercase">{label}</div>
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

function ScreenShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="@container flex h-full flex-col bg-black px-[5%] pt-[9%] pb-[5%]">
      <div className="text-center text-[5cqw] font-bold tracking-[0.09em]">{title}</div>
      {children}
      <PhoneNav />
    </div>
  );
}

function PhoneNav() {
  const items: LucideIcon[] = [Home, CalendarDays, Trophy, ScrollText, Activity];
  return (
    <div className="mt-auto flex h-[10%] items-center justify-around rounded-full border border-[#2c2c2c] bg-black px-[3%]">
      {items.map((Icon, i) => (
        <Icon
          key={i}
          className={`h-[4.4cqw] w-[4.4cqw] ${i === 0 ? "text-white" : "text-white/28"}`}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function HomeScreen() {
  return (
    <ScreenShell title="GRIDBEAT">
      <div className="mt-[6%] rounded-[5cqw] bg-[#191919] p-[5%]">
        <div className="text-[3cqw] font-bold tracking-[0.2em] text-[#df3409]">NEXT RACE</div>
        <div className="mt-[3%] text-[5.5cqw] leading-tight font-bold">Your race weekend</div>
        <div className="mt-[2%] text-[3.4cqw] text-white/42">Schedule · countdown · sessions</div>
      </div>
      <div className="mt-[5%] text-[3cqw] font-bold tracking-[0.2em] text-white/36">YOUR SEASON</div>
      <div className="mt-[3%] grid grid-cols-2 gap-[3%]">
        <div className="rounded-[4cqw] bg-[#121212] p-[5%]">
          <div className="text-[3cqw] text-white/35">DRIVER</div>
          <div className="mt-[10%] text-[4.4cqw] font-bold">Standings</div>
        </div>
        <div className="rounded-[4cqw] bg-[#121212] p-[5%]">
          <div className="text-[3cqw] text-white/35">TEAM</div>
          <div className="mt-[10%] text-[4.4cqw] font-bold">Season</div>
        </div>
      </div>
      <div className="mt-[5%] rounded-[4cqw] border border-[#b52400]/30 bg-[#b52400]/10 p-[5%]">
        <div className="text-[3cqw] font-bold text-[#df3409]">SEASON PULSE</div>
        <div className="mt-[3%] h-[1.6cqw] rounded bg-white/12" />
        <div className="mt-[2%] h-[1.6cqw] w-2/3 rounded bg-white/12" />
      </div>
    </ScreenShell>
  );
}

function SeasonScreen() {
  return (
    <ScreenShell title="STANDINGS">
      <div className="mt-[7%] space-y-[3%]">
        {["DRIVERS", "CONSTRUCTORS", "RESULTS", "CIRCUITS", "ARCHIVE"].map((item, index) => (
          <div key={item} className="flex items-center rounded-[3cqw] bg-[#151515] px-[5%] py-[5%]">
            <span className="mr-[4%] text-[4cqw] font-bold text-white/25">0{index + 1}</span>
            <span className="text-[4cqw] font-bold text-white/74">{item}</span>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

function StewardsScreen() {
  return (
    <ScreenShell title="STEWARDS">
      <div className="mt-[7%] flex gap-[5%] border-b border-white/10 pb-[4%] text-[3cqw] font-bold">
        <span className="text-[#df3409]">WEEKEND</span>
        <span className="text-white/28">POINTS</span>
        <span className="text-white/28">GRID</span>
      </div>
      <div className="mt-[5%] rounded-[4cqw] border border-[#ffd600]/25 bg-[#ffd600]/10 p-[5%]">
        <div className="text-[3cqw] font-bold text-[#ffd600]">RACE CONTROL</div>
        <div className="mt-[4%] h-[1.5cqw] rounded bg-white/15" />
        <div className="mt-[2%] h-[1.5cqw] w-3/4 rounded bg-white/15" />
      </div>
      <div className="mt-[4%] rounded-[4cqw] border border-[#2979ff]/25 bg-[#2979ff]/10 p-[5%]">
        <div className="text-[3cqw] font-bold text-[#2979ff]">FIA DOCUMENTS</div>
        <div className="mt-[4%] h-[1.5cqw] rounded bg-white/15" />
        <div className="mt-[2%] h-[1.5cqw] w-4/5 rounded bg-white/15" />
      </div>
    </ScreenShell>
  );
}
