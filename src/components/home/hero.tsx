"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { PhoneFrame } from "@/components/home/phone-frame";
import { BrandMark } from "@/components/home/brand-mark";
import type { HomeDriverStanding } from "@/lib/home/marketing-data";
import type { F1Race } from "@/lib/models/schedule";

const NAV_LINKS = [
  { href: "#mobile", label: "The app" },
  { href: "#features", label: "Features" },
  { href: "#dashboard", label: "Web dashboard" },
] as const;

export function Hero({ season, standings, nextRace }: { season: number; standings: HomeDriverStanding[]; nextRace: F1Race | null }) {
  const reduced = useReducedMotion();
  const reveal = (delay: number) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 marketing-grid opacity-40" />
      <div className="pointer-events-none absolute -right-[24rem] -top-[18rem] h-[70rem] w-[70rem] rounded-full bg-[#b52400]/20 blur-[150px]" />
      <div className="pointer-events-none absolute -left-[18rem] bottom-[-28rem] h-[48rem] w-[48rem] rounded-full bg-[#df3409]/10 blur-[140px]" />
      <Image
        src="/brand/logo-transparent.png"
        alt=""
        width={1536}
        height={1024}
        priority
        className="pointer-events-none absolute right-[-28rem] top-[-3rem] hidden w-[78rem] max-w-none opacity-[0.13] mix-blend-screen lg:block"
      />

      <header className="relative z-30 mx-auto flex h-20 max-w-[88rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="group transition-opacity hover:opacity-85"
          aria-label="GridBeat home"
        >
          <BrandMark height={38} />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Homepage">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs text-white/55 transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/schedule"
          className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[11px] font-bold text-white transition-colors hover:border-white/35 hover:bg-white/[0.08] sm:px-5 sm:text-xs"
        >
          Open dashboard <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-5rem)] max-w-[88rem] items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)] lg:px-12 lg:pb-10 lg:pt-0">
        <div className="max-w-3xl">
          <motion.div {...reveal(0.05)} className="mb-7 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#df3409] shadow-[0_0_18px_#df3409]" />
            <span className="font-[var(--font-f1)] text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
              Built for iOS + Android
            </span>
          </motion.div>

          <motion.h1
            {...reveal(0.12)}
            className="font-[var(--font-f1)] text-[clamp(3.4rem,8vw,7.8rem)] font-bold italic leading-[0.86] tracking-[-0.065em] text-white"
          >
            FEEL EVERY
            <br />
            <span className="text-[#df3409]">MILLISECOND.</span>
          </motion.h1>

          <motion.p {...reveal(0.22)} className="mt-7 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
            GridBeat puts live timing, telemetry, team radio, race control and the full Formula 1 season in one
            beautifully fast mobile companion.
          </motion.p>

          <motion.div {...reveal(0.31)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#mobile"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#b52400] px-7 text-sm font-bold text-white shadow-[0_18px_60px_-20px_#df3409] transition-transform hover:-translate-y-0.5"
            >
              Explore the mobile app
            </Link>
            <Link
              href="/live"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-white/[0.035] px-7 text-sm font-bold text-white transition-colors hover:border-white/35 hover:bg-white/[0.07]"
            >
              Enter live dashboard
            </Link>
          </motion.div>

          <motion.div {...reveal(0.4)} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[10px] uppercase tracking-[0.18em] text-white/34">
            <span>Live timing</span>
            <span>3D track map</span>
            <span>Telemetry</span>
            <span>Team radio</span>
          </motion.div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, x: 36, rotate: 3 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[28rem] lg:mr-6"
        >
          <div className="absolute inset-x-[12%] bottom-[-4%] h-[18%] rounded-full bg-[#df3409]/40 blur-[52px]" />
          {standings[0] && <div className="absolute -left-8 top-[15%] z-20 rounded-2xl border border-white/10 bg-[#121212]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:-left-16">
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">Championship leader</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: standings[0].color }} /> {standings[0].code} · {standings[0].points} PTS
            </div>
          </div>}
          {nextRace && <div className="absolute -right-7 bottom-[19%] z-20 max-w-36 rounded-2xl border border-white/10 bg-[#121212]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:-right-12">
            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/35">Up next · R{nextRace.round}</div>
            <div className="mt-1 truncate text-[11px] font-bold text-white">{nextRace.raceName}</div>
          </div>}
          <PhoneFrame ariaLabel="GridBeat championship standings mobile screen" glow className="mx-auto w-[72%] max-w-[17rem]">
            <HeroPhoneScreen season={season} standings={standings.slice(0, 6)} />
          </PhoneFrame>
        </motion.div>
      </div>
    </section>
  );
}

function HeroPhoneScreen({ season, standings }: { season: number; standings: HomeDriverStanding[] }) {
  return (
    <div className="@container flex h-full flex-col bg-black px-[5%] pb-[5%] pt-[9%]">
      <div className="text-center text-[5cqw] font-bold tracking-[0.1em] text-white">STANDINGS</div>
      <div className="mt-[6%] rounded-[5cqw] border border-[#b52400]/30 bg-[#b52400]/10 p-[4%]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[3cqw] font-bold tracking-[0.18em] text-[#df3409]">{season} SEASON</div>
            <div className="mt-[1%] text-[4.5cqw] font-bold text-white">Drivers&apos; Championship</div>
          </div>
          <div className="rounded-full bg-[#b52400] px-[3%] py-[1.5%] text-[3cqw] font-bold text-white">LIVE DATA</div>
        </div>
      </div>
      <div className="mt-[4%] flex-1 space-y-[2%]">
        {standings.map((row) => (
          <div key={row.driverId} className="flex items-center rounded-[3cqw] bg-[#191919] px-[4%] py-[3.2%]">
            <span className="w-[9%] text-[4.2cqw] font-bold text-white/45">{row.position}</span>
            <span className="mr-[3%] h-[7cqw] w-[1.2cqw] rounded-full" style={{ backgroundColor: row.color }} />
            <span className="flex-1 text-[4.5cqw] font-bold text-white">{row.code}</span>
            <span className="mr-[4%] text-[3cqw] text-white/35">{row.wins}W</span>
            <span className={`text-[3.7cqw] ${row.position === 1 ? "text-[#bf00ff]" : "text-white/68"}`}>{row.points} PTS</span>
          </div>
        ))}
      </div>
      <div className="mt-[4%] flex h-[12%] items-center justify-around rounded-full border border-[#2c2c2c] bg-black px-[3%] text-[5cqw] text-white/30">
        <span className="text-white">⌂</span><span>▣</span><span>⚑</span><span>◫</span><span className="flex h-[9cqw] w-[9cqw] items-center justify-center rounded-full bg-[#b52400] text-[3cqw] font-bold text-white">LIVE</span>
      </div>
    </div>
  );
}
