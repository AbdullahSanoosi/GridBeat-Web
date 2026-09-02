"use client";

import { motion, useReducedMotion } from "motion/react";
import { PhoneFrame } from "@/components/home/phone-frame";

const FEATURES = [
  { eyebrow: "LIVE", title: "Timing tower", copy: "Positions, gaps, lap times, sectors, tyres and DRS as the session unfolds.", color: "#df3409" },
  { eyebrow: "TRACK", title: "3D race map", copy: "Follow every car around the circuit with a smooth, perspective track view.", color: "#2979ff" },
  { eyebrow: "CAR", title: "Driver telemetry", copy: "Speed, RPM, gear, throttle, braking and DRS for the driver you choose.", color: "#00cc00" },
  { eyebrow: "RADIO", title: "Hear the race", copy: "Team radio, live commentary, pit stops and race-control messages in one place.", color: "#ffd600" },
  { eyebrow: "SEASON", title: "The whole championship", copy: "Schedule, standings, results, driver profiles, circuit guides and the historic archive.", color: "#bf00ff" },
  { eyebrow: "CONTEXT", title: "F1, explained", copy: "Learn the car, tyres, aero, race craft and the rules—then read the FIA weekend documents.", color: "#ff8000" },
] as const;

export function AppExperience() {
  const reduced = useReducedMotion();
  return (
    <section id="mobile" className="relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#b52400]/14 blur-[140px]" />
      <div className="relative mx-auto max-w-[84rem]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#df3409]">The mobile experience</p>
          <h2 className="mt-4 font-[var(--font-f1)] text-[clamp(2.6rem,6vw,5.4rem)] font-bold italic leading-[0.92] tracking-[-0.055em]">
            THE PIT WALL,<br />WITHOUT THE PIT WALL.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/48 sm:text-base">
            The visual language comes straight from the app: pure black, fast red accents, compact data and soft
            Material 3 surfaces that stay readable when the race gets loud.
          </p>
        </div>

        <div className="relative mx-auto mt-16 flex max-w-4xl items-center justify-center gap-3 sm:mt-20 sm:gap-8">
          <motion.div initial={reduced ? false : { opacity: 0, x: 35, rotate: -2 }} whileInView={{ opacity: 1, x: 0, rotate: -7 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }} className="w-[27%] max-w-[13rem]">
            <PhoneFrame ariaLabel="GridBeat season screen">
              <SeasonScreen />
            </PhoneFrame>
          </motion.div>
          <motion.div initial={reduced ? false : { opacity: 0, y: 35 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.75, delay: 0.08 }} className="z-10 w-[34%] max-w-[17rem]">
            <PhoneFrame ariaLabel="GridBeat home screen" glow>
              <HomeScreen />
            </PhoneFrame>
          </motion.div>
          <motion.div initial={reduced ? false : { opacity: 0, x: -35, rotate: 2 }} whileInView={{ opacity: 1, x: 0, rotate: 7 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.14 }} className="w-[27%] max-w-[13rem]">
            <PhoneFrame ariaLabel="GridBeat Stewards' Room screen">
              <StewardsScreen />
            </PhoneFrame>
          </motion.div>
        </div>

        <div id="features" className="mt-20 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.045 }}
              className="min-h-56 bg-[#0d0d0d] p-7 sm:p-8"
            >
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: feature.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: feature.color }} /> {feature.eyebrow}
              </div>
              <h3 className="mt-7 font-[var(--font-f1)] text-xl font-bold text-white">{feature.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/43">{feature.copy}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScreenShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="@container flex h-full flex-col bg-black px-[5%] pb-[5%] pt-[9%]"><div className="text-center text-[5cqw] font-bold tracking-[0.09em]">{title}</div>{children}<PhoneNav /></div>;
}

function PhoneNav() {
  return <div className="mt-auto flex h-[10%] items-center justify-around rounded-full border border-[#2c2c2c] bg-black px-[3%] text-[5cqw] text-white/28"><span className="text-white">⌂</span><span>▣</span><span>⚑</span><span>◫</span><span>↕</span></div>;
}

function HomeScreen() {
  return <ScreenShell title="GRIDBEAT"><div className="mt-[6%] rounded-[5cqw] bg-[#191919] p-[5%]"><div className="text-[3cqw] font-bold tracking-[0.2em] text-[#df3409]">NEXT RACE</div><div className="mt-[3%] text-[5.5cqw] font-bold leading-tight">Your race weekend</div><div className="mt-[2%] text-[3.4cqw] text-white/42">Schedule · countdown · sessions</div></div><div className="mt-[5%] text-[3cqw] font-bold tracking-[0.2em] text-white/36">YOUR SEASON</div><div className="mt-[3%] grid grid-cols-2 gap-[3%]"><div className="rounded-[4cqw] bg-[#121212] p-[5%]"><div className="text-[3cqw] text-white/35">DRIVER</div><div className="mt-[10%] text-[4.4cqw] font-bold">Standings</div></div><div className="rounded-[4cqw] bg-[#121212] p-[5%]"><div className="text-[3cqw] text-white/35">TEAM</div><div className="mt-[10%] text-[4.4cqw] font-bold">Season</div></div></div><div className="mt-[5%] rounded-[4cqw] border border-[#b52400]/30 bg-[#b52400]/10 p-[5%]"><div className="text-[3cqw] font-bold text-[#df3409]">SEASON PULSE</div><div className="mt-[3%] h-[1.6cqw] rounded bg-white/12" /><div className="mt-[2%] h-[1.6cqw] w-2/3 rounded bg-white/12" /></div></ScreenShell>;
}

function SeasonScreen() {
  return <ScreenShell title="STANDINGS"><div className="mt-[7%] space-y-[3%]">{["DRIVERS", "CONSTRUCTORS", "RESULTS", "CIRCUITS", "ARCHIVE"].map((item, index) => <div key={item} className="flex items-center rounded-[3cqw] bg-[#151515] px-[5%] py-[5%]"><span className="mr-[4%] text-[4cqw] font-bold text-white/25">0{index + 1}</span><span className="text-[4cqw] font-bold text-white/74">{item}</span></div>)}</div></ScreenShell>;
}

function StewardsScreen() {
  return <ScreenShell title="STEWARDS"><div className="mt-[7%] flex gap-[5%] border-b border-white/10 pb-[4%] text-[3cqw] font-bold"><span className="text-[#df3409]">WEEKEND</span><span className="text-white/28">POINTS</span><span className="text-white/28">GRID</span></div><div className="mt-[5%] rounded-[4cqw] border border-[#ffd600]/25 bg-[#ffd600]/10 p-[5%]"><div className="text-[3cqw] font-bold text-[#ffd600]">RACE CONTROL</div><div className="mt-[4%] h-[1.5cqw] rounded bg-white/15" /><div className="mt-[2%] h-[1.5cqw] w-3/4 rounded bg-white/15" /></div><div className="mt-[4%] rounded-[4cqw] border border-[#2979ff]/25 bg-[#2979ff]/10 p-[5%]"><div className="text-[3cqw] font-bold text-[#2979ff]">FIA DOCUMENTS</div><div className="mt-[4%] h-[1.5cqw] rounded bg-white/15" /><div className="mt-[2%] h-[1.5cqw] w-4/5 rounded bg-white/15" /></div></ScreenShell>;
}
