import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { AppExperience } from "@/components/home/app-experience";
import { ApiAccessSection } from "@/components/home/api-access-section";
import { TheLap } from "@/components/home/the-lap";
import { ChampionshipChart } from "@/components/home/championship-chart";
import { ArchiveSection } from "@/components/home/archive-section";
import { WhatsNext } from "@/components/home/whats-next";
import { ScreenGallery } from "@/components/home/screen-gallery";
import { BrandMark } from "@/components/home/brand-mark";
import {
  getAllRaceSeasons,
  getDriverStandings,
  getSchedule,
  getSeasonRacePoints,
  getSeasonSprintPoints,
  getTableCount,
} from "@/lib/api/stats-api";
import { config } from "@/lib/config";
import { isUpcoming, raceFromRow } from "@/lib/models/schedule";
import { fetchCircuitOutline } from "@/lib/home/circuit-outline";
import {
  buildChampionshipProgression,
  buildSeasonRaceCounts,
  homeDriverStandingFromRow,
} from "@/lib/home/marketing-data";

// Visible by default so the section can be reviewed; set this to "true" to
// hide the developer-access pitch for the consumer launch.
const apiAccessVisible = process.env.NEXT_PUBLIC_API_ACCESS_HIDDEN !== "true";
export const revalidate = 900;

export default async function HomePage() {
  const [
    scheduleRows,
    driverRows,
    racePointRows,
    sprintPointRows,
    seasonRows,
    raceCount,
    driverCount,
    circuitCount,
    resultCount,
    lapLeaderCount,
    pitStopCount,
  ] = await Promise.all([
    getSchedule(config.currentSeason).catch(() => []),
    getDriverStandings(config.currentSeason).catch(() => []),
    getSeasonRacePoints(config.currentSeason).catch(() => []),
    getSeasonSprintPoints(config.currentSeason).catch(() => []),
    getAllRaceSeasons().catch(() => []),
    getTableCount("races").catch(() => null),
    getTableCount("drivers").catch(() => null),
    getTableCount("circuits").catch(() => null),
    getTableCount("race_results").catch(() => null),
    getTableCount("lap_leaders").catch(() => null),
    getTableCount("pit_stops").catch(() => null),
  ]);

  const races = scheduleRows.map(raceFromRow);
  const nextRace = races.find(isUpcoming) ?? null;
  const allDrivers = driverRows.map(homeDriverStandingFromRow);
  const chartDrivers = allDrivers.slice(0, 4);
  const progression = buildChampionshipProgression(chartDrivers, racePointRows, sprintPointRows);
  const seasons = buildSeasonRaceCounts(seasonRows);

  const totals = {
    races: raceCount,
    drivers: driverCount,
    circuits: circuitCount,
    results: resultCount,
    lapLeaders: lapLeaderCount,
    pitStops: pitStopCount,
  };

  // The lap section follows the calendar: the next race's own circuit SVG,
  // fetched server-side, with baked geometry as the fallback.
  const outline = await fetchCircuitOutline(nextRace?.circuit.imageUrl, nextRace?.circuit.circuitId);
  const lapCircuit = {
    ...outline,
    name: nextRace?.circuit.circuitName || "The next lap",
    label: [nextRace?.circuit.locality, nextRace?.circuit.country].filter(Boolean).join(", ").toUpperCase(),
    eyebrow: nextRace ? `NEXT UP · ROUND ${nextRace.round}` : "THE SEASON",
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-black">
      <Hero standings={allDrivers} nextRace={nextRace} />
      <TheLap circuit={lapCircuit} />
      {chartDrivers.length > 0 && progression.length > 0 && (
        <ChampionshipChart drivers={chartDrivers} progression={progression} />
      )}
      {seasons.length > 0 && <ArchiveSection totals={totals} seasons={seasons} />}
      <AppExperience />
      <ScreenGallery />
      <WhatsNext />
      {apiAccessVisible && (
        <ApiAccessSection enrollmentUrl={process.env.NEXT_PUBLIC_API_ENROLLMENT_URL} totals={totals} />
      )}
      <DownloadSection />
      <Footer />
    </main>
  );
}

function DownloadSection() {
  return (
    <section id="download" className="relative overflow-hidden border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_75%_at_50%_100%,rgba(181,36,0,0.28),transparent_72%)]" />
      <Image
        src="/brand/logo-transparent.png"
        alt=""
        width={1536}
        height={1024}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[56rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.09] mix-blend-screen"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#df3409]">The grid is forming</p>
        <h2 className="mt-5 font-[var(--font-f1)] text-[clamp(2.7rem,7vw,5.8rem)] font-bold italic leading-[0.9] tracking-[-0.055em]">
          YOUR RACE WEEKEND.<br />IN YOUR POCKET.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/52 sm:text-base">
          GridBeat is preparing for launch on iOS and Android. Store links and release updates will appear here when
          the builds are ready.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span className="inline-flex min-h-12 min-w-52 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-6 text-xs font-bold text-white/58">
            Apple App Store · soon
          </span>
          <span className="inline-flex min-h-12 min-w-52 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-6 text-xs font-bold text-white/58">
            Google Play · soon
          </span>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS = [
  { href: "#mobile", label: "Mobile app" },
  { href: "#features", label: "Features" },
  { href: "#whats-next", label: "What's next" },
  { href: "#api-access", label: "Developer access" },
] as const;

function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-[84rem] flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <Link href="/" className="inline-flex flex-col gap-2" aria-label="GridBeat home">
          <BrandMark height={30} wordmarkClass="text-base" />
          <span className="text-[10px] text-white/35">Formula 1, live and explained.</span>
        </Link>
        <nav className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3" aria-label="Footer">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[11px] text-white/45 transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-[84rem] flex-col gap-2 border-t border-white/[0.07] pt-6 text-[9px] leading-relaxed text-white/28 sm:flex-row sm:justify-between">
        <p>Unofficial. Not affiliated with Formula 1, the FIA, or any team.</p>
        <p>© {new Date().getFullYear()} GridBeat</p>
      </div>
    </footer>
  );
}
