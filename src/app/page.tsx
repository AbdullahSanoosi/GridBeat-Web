"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { getSchedule } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { isUpcoming, nextSession, raceFromRow } from "@/lib/models/schedule";
import { useMounted } from "@/hooks/use-mounted";
import { Hero } from "@/components/home/hero";
import { RaceCountdown } from "@/components/home/race-countdown";
import { TheLap } from "@/components/home/the-lap";
import { TelemetrySection } from "@/components/home/telemetry-section";
import { ChampionshipChart } from "@/components/home/championship-chart";
import { CircuitGallery } from "@/components/home/circuit-gallery";
import { ArchiveStats } from "@/components/home/archive-stats";
import { PhoneShowcase } from "@/components/home/phone-showcase";

export default function HomePage() {
  const mounted = useMounted();
  const { data: races } = useQuery({
    queryKey: ["schedule", config.currentSeason],
    queryFn: async () => (await getSchedule(config.currentSeason)).map(raceFromRow),
    staleTime: staleTime.currentSeason,
  });

  // Gated on `mounted` because RaceCountdown renders a live clock — see
  // CLAUDE.md gotcha #4 on client-only values and hydration.
  const next = mounted ? races?.find(isUpcoming) : undefined;
  // "What's on next" is a session, not a race — on a Friday that's FP1.
  const upcoming = mounted && races ? nextSession(races) : null;

  return (
    <main className="min-h-screen overflow-x-clip">
      <Hero upcoming={upcoming} />
      {next && <RaceCountdown race={next} />}
      <TheLap />
      <TelemetrySection />
      <ArchiveStats />
      <ChampionshipChart />
      <CircuitGallery />
      <PhoneShowcase />
      <ClosingCta />
      <Footer />
    </main>
  );
}

function ClosingCta() {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-t border-white/10 px-6 py-28">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 100%, color-mix(in srgb, var(--color-primary) 30%, transparent), transparent 70%)",
        }}
      />
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <h2 className="font-[var(--font-f1)] text-4xl font-bold italic tracking-tight sm:text-6xl">
          Lights out.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-(--color-text-secondary)">
          Open the dashboard and follow the session the way the pit wall does.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/live"
            className="rounded-full bg-(--color-primary) px-8 py-3.5 text-sm font-bold tracking-wide text-white transition-transform duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
          >
            Watch Live
          </Link>
          <Link
            href="/standings"
            className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-bold tracking-wide transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
          >
            See the Standings
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

const FOOTER_LINKS = [
  { href: "/live", label: "Live Timing" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/results", label: "Race Archives" },
  { href: "/stats", label: "Stats" },
  { href: "/circuits", label: "Circuit Guide" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/news", label: "News" },
] as const;

function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-[var(--font-f1)] text-lg font-bold italic tracking-tight">GRIDBEAT</div>
          <p className="mt-1 text-xs text-(--color-text-muted)">Formula 1, live and explained.</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-4">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-(--color-text-secondary) transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-[11px] text-(--color-text-muted)">
        Unofficial. Not affiliated with Formula 1, the FIA, or any team. Timing data via the F1 live feed; circuit
        geometry via MultiViewer.
      </p>
    </footer>
  );
}
