"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { teamColor } from "@/lib/theme/colors";
import { PhoneFrame } from "@/components/home/phone-frame";

/**
 * The mobile app, shown as three devices that drift at different rates as
 * the section scrolls past, so the group reads as depth rather than a flat
 * row. Each frame is `screenshotSrc`-ready; until real captures land, the
 * fallback is a CSS recreation of the same screen with copy taken from the
 * Flutter source (lib/features/{live_timing,learn,fia_docs}), not invented.
 */

const MOBILE_FEATURES = [
  { title: "Learn F1", detail: "Seven chapters: anatomy, tyres, aero, evolution, penalties, race day.", color: "#DF3409" },
  { title: "Stewards' Room", detail: "Penalty points, the confirmed grid, tyre notices and upgrades — parsed from the FIA's own PDFs.", color: "#FFD600" },
  { title: "3D Car Viewer", detail: "Assemble, orbit and inspect the car, with an airflow mode.", color: "#2979FF" },
  { title: "Tyre Sets", detail: "Every compound tracked against the weekend's allocation.", color: "#00CC00" },
  { title: "Race Alerts", detail: "Session reminders and this-day-in-F1, on your lock screen.", color: "#BF00FF" },
] as const;

export function PhoneShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const outer = useTransform(scrollYProgress, [0, 1], [64, -64]);
  const centre = useTransform(scrollYProgress, [0, 1], [-34, 34]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-white/10 px-4 py-20 sm:px-6 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.26em] text-(--color-primary)">
            IOS &amp; ANDROID
          </span>
          <h2 className="mt-3 font-[var(--font-f1)] text-[clamp(1.7rem,6vw,3rem)] font-bold">
            Everything, in your pocket
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-(--color-text-secondary)">
            The mobile app carries the whole dashboard — plus the parts that only make sense with a phone in your hand.
          </p>
        </div>

        <div className="mt-14 flex items-center justify-center gap-3 sm:mt-20 sm:gap-8">
          <motion.div style={reduced ? undefined : { y: outer }} className="w-[26%] max-w-[190px] rotate-[-8deg]">
            <PhoneFrame ariaLabel="Learn F1 screen">
              <LearnMock />
            </PhoneFrame>
          </motion.div>
          <motion.div style={reduced ? undefined : { y: centre }} className="z-10 w-[30%] max-w-[225px]">
            <PhoneFrame ariaLabel="Live Timing screen" glow>
              <LiveTimingMock />
            </PhoneFrame>
          </motion.div>
          <motion.div style={reduced ? undefined : { y: outer }} className="w-[26%] max-w-[190px] rotate-[8deg]">
            <PhoneFrame ariaLabel="Stewards' Room screen">
              <StewardsMock />
            </PhoneFrame>
          </motion.div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-px sm:mt-20 sm:grid-cols-2">
          {MOBILE_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-baseline gap-3 border-t border-white/10 py-5"
            >
              <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full" style={{ backgroundColor: f.color }} />
              <div>
                <div className="font-[var(--font-f1)] text-base font-bold" style={{ color: f.color }}>
                  {f.title}
                </div>
                <p className="mt-1 text-sm text-(--color-text-secondary)">{f.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Screen recreations. Sized in cqw (container query units) so the type
      scales with the phone rather than snapping at a breakpoint. ─────── */

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="@container flex h-full flex-col bg-(--color-background)">
      <div className="border-b border-white/10 px-[6%] pb-[3%] pt-[9%] text-center text-[5.5cqw] font-black tracking-[0.12em] text-white">
        {title}
      </div>
      {children}
    </div>
  );
}

function LiveTimingMock() {
  const rows = [
    { pos: 1, code: "NOR", team: "McLaren", time: "1:15.265" },
    { pos: 2, code: "VER", team: "Red Bull Racing", time: "1:15.331" },
    { pos: 3, code: "PIA", team: "McLaren", time: "1:15.440" },
    { pos: 4, code: "LEC", team: "Ferrari", time: "1:15.612" },
    { pos: 5, code: "RUS", team: "Mercedes", time: "1:15.708" },
    { pos: 6, code: "HAM", team: "Ferrari", time: "1:15.889" },
  ];
  return (
    <Screen title="LIVE TIMING">
      <div className="flex flex-1 flex-col gap-[1.5%] p-[4%]">
        {rows.map((r) => (
          <div key={r.pos} className="flex items-center gap-[3%] rounded bg-white/[0.07] px-[3%] py-[2.2%]">
            <span className="w-[7%] text-[4.4cqw] font-bold text-white/55">{r.pos}</span>
            <span className="h-[3.4cqw] w-[1.6cqw] shrink-0 rounded-full" style={{ backgroundColor: teamColor(r.team) }} />
            <span className="flex-1 text-[4.6cqw] font-bold text-white">{r.code}</span>
            <span className="text-[4cqw] text-(--color-sector-green)">{r.time}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function LearnMock() {
  const chapters = [
    { n: 1, title: "Anatomy", sub: "What am I looking at?" },
    { n: 2, title: "Rubber", sub: "Why tyres decide races" },
    { n: 3, title: "Airflow", sub: "Why the car is shaped like that" },
    { n: 4, title: "Evolution", sub: "How we got here" },
  ];
  return (
    <Screen title="LEARN F1">
      <div className="flex flex-1 flex-col gap-[2%] p-[4%]">
        {chapters.map((c) => (
          <div key={c.n} className="rounded bg-white/[0.07] px-[4%] py-[3%]">
            <div className="flex items-center gap-[3%]">
              <span className="text-[4.4cqw] font-black text-(--color-primary)">0{c.n}</span>
              <span className="text-[4.4cqw] font-bold text-white">{c.title}</span>
            </div>
            <div className="mt-[1.5%] text-[3.6cqw] leading-tight text-(--color-text-muted)">{c.sub}</div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function StewardsMock() {
  return (
    <Screen title="STEWARDS' ROOM">
      <div className="flex gap-[4%] border-b border-white/10 px-[4%] py-[2.5%]">
        {["WEEKEND", "POINTS", "GRID"].map((t, i) => (
          <span key={t} className={`text-[3.2cqw] font-bold ${i === 0 ? "text-(--color-primary)" : "text-(--color-text-muted)"}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex-1 p-[4%]">
        <div className="rounded border border-(--color-warning)/40 bg-(--color-warning)/10 p-[4%]">
          <div className="text-[3.6cqw] font-black tracking-wide text-(--color-warning)">UNDER INVESTIGATION</div>
          <div className="mt-[4%] h-[1.4cqw] w-full rounded bg-white/15" />
          <div className="mt-[2.5%] h-[1.4cqw] w-3/4 rounded bg-white/15" />
        </div>
        <div className="mt-[5%] rounded border border-(--color-error)/40 bg-(--color-error)/10 p-[4%]">
          <div className="text-[3.6cqw] font-black tracking-wide text-(--color-error)">5-SEC PENALTY</div>
          <div className="mt-[4%] h-[1.4cqw] w-5/6 rounded bg-white/15" />
        </div>
      </div>
    </Screen>
  );
}
