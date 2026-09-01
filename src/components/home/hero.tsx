"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { TowerWall } from "@/components/home/live-tower";
import { SessionStrip } from "@/components/home/session-strip";
import { useLiveTimingStore } from "@/lib/live/store";
import type { UpcomingSession } from "@/lib/models/schedule";

/**
 * The hero is the product, not a picture of it: a full-bleed timing wall
 * running a live session behind the brand. Rows physically swap on an
 * overtake while you read the headline, which says "this is a live timing
 * app" faster than any sentence could.
 *
 * A scrim keeps the type legible over it — horizontal on wide screens
 * (wall reads to the right of the words), vertical on narrow ones (wall
 * reads underneath).
 */

const WORDMARK = "GRIDBEAT".split("");

export function Hero({ upcoming }: { upcoming?: UpcomingSession | null }) {
  const reduced = useReducedMotion();
  const connect = useLiveTimingStore((s) => s.connect);

  // Same singleton store /live uses, so opening the dashboard from here
  // finds the session already bootstrapped rather than reconnecting.
  useEffect(() => {
    connect();
  }, [connect]);
  const rise = (delay: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* The wall */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end">
        {/* Below lg the wall sits behind the words, so it runs quieter —
            above lg it moves to its own column and can play at full strength. */}
        <div className="h-full w-full opacity-[0.26] lg:w-[62%] lg:opacity-100">
          <TowerWall />
        </div>
      </div>

      {/* Scrim — vertical below lg so the wall sits behind/under the words,
          horizontal at lg+ where the wall lives on the right. */}
      <div
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(to bottom, rgb(0 0 0 / 0.6) 0%, rgb(0 0 0 / 0.88) 26%, rgb(0 0 0 / 0.86) 62%, rgb(0 0 0 / 0.5) 82%, rgb(0 0 0 / 0.84) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(100deg, #000 0%, #000 34%, rgb(0 0 0 / 0.86) 46%, rgb(0 0 0 / 0.35) 66%, rgb(0 0 0 / 0.72) 100%)",
        }}
      />
      {/* Red bloom + broadcast scanlines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 55% at 18% 45%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 3px)" }}
      />

      {/* Session strip — real WebSocket state, falls back to the next round */}
      <motion.div {...rise(0)} className="relative z-10">
        <SessionStrip upcoming={upcoming} />
      </motion.div>

      {/* Brand */}
      <div className="relative z-10 flex flex-1 items-center px-5 py-14 sm:px-8">
        <div className="w-full max-w-xl">
          <h1
            className="flex font-[var(--font-f1)] text-[clamp(2.9rem,13vw,7rem)] leading-[0.86] font-bold italic tracking-tight"
            aria-label="GridBeat"
          >
            {WORDMARK.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                initial={reduced ? false : { opacity: 0, x: 30, clipPath: "inset(0 100% 0 0)" }}
                animate={{ opacity: 1, x: 0, clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.042, ease: [0.22, 1, 0.36, 1] }}
                style={{ textShadow: "0 6px 34px rgb(0 0 0 / 0.85)" }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>

          <motion.p
            {...rise(0.5)}
            className="mt-4 font-[var(--font-f1)] text-[clamp(1rem,4.4vw,1.6rem)] font-bold text-white/80"
          >
            Formula 1, live and explained.
          </motion.p>

          <motion.p {...rise(0.58)} className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
            Sub-second timing off the F1 feed, the championship in full, and the context behind all of it.
          </motion.p>

          <motion.div {...rise(0.68)} className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href="/live"
              className="flex items-center justify-center gap-2 rounded-full bg-(--color-primary) px-7 py-3.5 text-sm font-bold tracking-wide text-white transition-transform duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Watch Live
            </Link>
            <Link
              href="/schedule"
              className="rounded-full border border-white/20 bg-black/40 px-7 py-3.5 text-center text-sm font-bold tracking-wide text-white/90 backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            >
              Open the Dashboard
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none relative z-10 flex justify-center pb-6"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="font-[var(--font-f1)] text-[9px] tracking-[0.24em] text-white/30">SCROLL</span>
          <span className="h-6 w-px bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

