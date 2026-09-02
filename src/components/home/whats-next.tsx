"use client";

import { motion, useReducedMotion } from "motion/react";
import { Boxes, Crosshair, MessageSquare, Repeat, Trophy, Waypoints, type LucideIcon } from "lucide-react";
import { PhoneFrame } from "@/components/home/phone-frame";

/**
 * What's being built next: the prediction game, the collectibles economy and
 * the live strategy engine.
 *
 * The phase numbering here is real information, not decoration — this ships
 * in a deliberate order (predictions before polls before collectibles before
 * trading), and each phase depends on the one before it, so the reader
 * genuinely needs the sequence. Everything is labelled as planned rather
 * than dressed up as available: the app hasn't launched yet, and a roadmap
 * that reads like a feature list is how you lose people at the App Store.
 */
const PHASES: {
  phase: string;
  title: string;
  copy: string;
  icon: LucideIcon;
  color: string;
  detail: string[];
}[] = [
  {
    phase: "01",
    title: "Predictions & XP",
    copy: "Call the podium, the winner and the pole sitter before the session locks. Accuracy is the only thing that earns XP.",
    icon: Crosshair,
    color: "#df3409",
    detail: ["75 XP all three drivers", "+10 XP exact position", "100 XP perfect podium"],
  },
  {
    phase: "02",
    title: "Community polls",
    copy: "Ace of the Race and Disgrace of the Race, voted by everyone watching, one vote each.",
    icon: MessageSquare,
    color: "#2979ff",
    detail: ["Ace of the Race", "Disgrace of the Race"],
  },
  {
    phase: "03",
    title: "Collectibles & Driver Card",
    copy: "A profile card carrying a car, a helmet and a background — the car rendered live in 3D, the same viewer Learn F1 uses.",
    icon: Boxes,
    color: "#bf00ff",
    detail: ["Participation packs", "Duplicates merge into Chrome and Gold", "Collector leaderboard"],
  },
  {
    phase: "04",
    title: "Trading",
    copy: "Move an item to another collector in a single atomic transfer. One row per item, so the ledger stays honest.",
    icon: Repeat,
    color: "#ffd600",
    detail: ["Player-to-player transfers"],
  },
];

export function WhatsNext() {
  const reduced = useReducedMotion();

  return (
    <section id="whats-next" className="relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
      <div className="pointer-events-none absolute top-0 right-[-20%] h-[40rem] w-[40rem] rounded-full bg-[#bf00ff]/8 blur-[150px]" />

      <div className="relative mx-auto max-w-[84rem]">
        {/* Strategy engine — the headline of this section, because it's the
            one that's about data rather than points. */}
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-bold tracking-[0.28em] text-[#df3409] uppercase">In development</p>
            <h2 className="mt-4 font-[var(--font-f1)] text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.92] font-bold tracking-[-0.055em] italic">
              READ THE RACE
              <br />
              BEFORE IT HAPPENS.
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-white/48 sm:text-base">
              A live strategy engine on top of the same feed that drives the timing tower: undercut windows, tyre
              deltas, pit-stop maths and where the race is actually being decided — while it&rsquo;s still running.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {["Undercut windows", "Tyre degradation", "Pit-loss maths", "Live gap projection"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[11px] font-semibold text-white/60"
                >
                  {chip}
                </span>
              ))}
            </div>

            <p className="mt-8 max-w-lg border-l-2 border-[#df3409]/60 pl-4 text-sm leading-6 text-white/40">
              The whole product points one way: data, then more data, for people who actually want it.
            </p>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="mx-auto w-[62%] max-w-[16rem] lg:w-full"
          >
            <PhoneFrame
              ariaLabel="The Learn F1 3D car viewer on iOS — the same renderer the collectible Driver Card will use"
              platform="ios"
              glow
              screenshotSrc="/app/learn-f1-evolution-cars.webp"
            />
            <p className="mt-4 text-center text-[11px] text-white/38">
              The 3D viewer that will render Driver Cards
            </p>
          </motion.div>
        </div>

        {/* Phased rollout — order carries meaning, so it's numbered. */}
        <div className="mt-20 border-t border-white/[0.08] pt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h3 className="font-[var(--font-f1)] text-2xl font-bold tracking-tight sm:text-3xl">
              Predictions, packs and a card worth keeping
            </h3>
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Rolling out in order</span>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PHASES.map((item, index) => (
              <motion.article
                key={item.phase}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="relative flex flex-col rounded-[1.5rem] border border-white/10 bg-[#0c0c0c] p-6"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl border"
                    style={{
                      color: item.color,
                      borderColor: `color-mix(in srgb, ${item.color} 32%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                    }}
                  >
                    <item.icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-white/22">
                    {item.phase}
                  </span>
                </div>

                <h4 className="mt-6 text-base font-bold text-white">{item.title}</h4>
                <p className="mt-2.5 text-[13px] leading-6 text-white/42">{item.copy}</p>

                <ul className="mt-5 space-y-1.5 border-t border-white/[0.07] pt-4">
                  {item.detail.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-[11px] leading-5 text-white/50">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>

          {/* Two leaderboards, because they measure different things. */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <LeaderboardNote
              icon={Trophy}
              color="#df3409"
              title="XP leaderboard"
              copy="Skill only. The single way to climb it is predicting correctly."
            />
            <LeaderboardNote
              icon={Waypoints}
              color="#bf00ff"
              title="Collector leaderboard"
              copy="Loyalty. Streaks, participation packs and milestones build the collection."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardNote({
  icon: Icon,
  color,
  title,
  copy,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.022] p-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border" style={{ color, borderColor: `color-mix(in srgb, ${color} 32%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </span>
      <div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="mt-1.5 text-[12.5px] leading-6 text-white/42">{copy}</p>
      </div>
    </div>
  );
}
