"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getSeasonRacesWithCircuit,
  getSeasonWinners,
  getAllDriverChampions,
  getAllConstructorChampions,
  getEntityNames,
} from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { useMounted } from "@/hooks/use-mounted";
import { circuitColor } from "@/lib/theme/colors";
import {
  archiveRacesFromRows,
  archiveSeasons,
  driverChampionsFromRows,
  constructorChampionsFromRows,
  type ArchiveRace,
  type ChampionEntry,
} from "@/lib/models/archive";

type Tab = "races" | "drivers" | "constructors";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/**
 * Ported verbatim from results_screen.dart's `_archiveFacts` — real F1
 * trivia, not fabricated. Rotates deterministically by the current minute,
 * same as the Flutter `_ArchiveHero`.
 */
const ARCHIVE_FACTS: { icon: string; color: string; fact: string }[] = [
  { icon: "🏁", color: "#E80020", fact: "The first F1 World Championship race was held at Silverstone on 13 May 1950." },
  { icon: "⚡", color: "#06B6D4", fact: "Michael Schumacher won 7 consecutive races in 2004 — a streak that took 19 years to beat." },
  { icon: "🏆", color: "#FFD700", fact: "Juan Manuel Fangio won 5 World Championships in 8 seasons — a record that stood for 46 years." },
  { icon: "🔥", color: "#FF8000", fact: "The closest F1 finish ever was 0.010s — Peter Gethin won the 1971 Italian GP at 242 km/h." },
  { icon: "💫", color: "#8B5CF6", fact: "Ayrton Senna's 65 pole positions were earned in an era with no power steering or traction control." },
  { icon: "📈", color: "#10B981", fact: "Ferrari has competed in every single F1 World Championship season since the very first in 1950." },
];

export default function ResultsPage() {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("races");
  const [season, setSeason] = useState(String(config.currentSeason));
  const seasons = archiveSeasons();

  const racesQuery = useQuery({
    queryKey: ["archive-races", season],
    queryFn: async () => {
      const [races, winners, names] = await Promise.all([
        getSeasonRacesWithCircuit(Number(season)),
        getSeasonWinners(Number(season)),
        getEntityNames(),
      ]);
      return archiveRacesFromRows(season, races, winners, names);
    },
    staleTime: season === String(config.currentSeason) ? staleTime.currentSeason : staleTime.immutable,
    enabled: tab === "races",
  });

  const driverChampionsQuery = useQuery({
    queryKey: ["driver-champions"],
    queryFn: async () => driverChampionsFromRows(await getAllDriverChampions()),
    staleTime: staleTime.weekly,
    enabled: tab === "drivers",
  });

  const constructorChampionsQuery = useQuery({
    queryKey: ["constructor-champions"],
    queryFn: async () => constructorChampionsFromRows(await getAllConstructorChampions()),
    staleTime: staleTime.weekly,
    enabled: tab === "constructors",
  });

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">Race Archives</h1>
        <div className="flex items-center gap-3">
          {tab === "races" && (
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-full bg-(--color-surface-elevated) p-1">
            <TabButton active={tab === "races"} onClick={() => setTab("races")}>
              Races
            </TabButton>
            <TabButton active={tab === "drivers"} onClick={() => setTab("drivers")}>
              WDC
            </TabButton>
            <TabButton active={tab === "constructors"} onClick={() => setTab("constructors")}>
              WCC
            </TabButton>
          </div>
        </div>
      </div>

      {mounted && <ArchiveHero />}

      {!mounted ? (
        <p className="text-(--color-text-secondary)">Loading…</p>
      ) : tab === "races" ? (
        <QueryState query={racesQuery}>{(races) => <RaceCardList races={races} />}</QueryState>
      ) : tab === "drivers" ? (
        <QueryState query={driverChampionsQuery}>
          {(champions) => <ChampionsTable champions={champions} />}
        </QueryState>
      ) : (
        <QueryState query={constructorChampionsQuery}>
          {(champions) => <ChampionsTable champions={champions} />}
        </QueryState>
      )}
    </main>
  );
}

function QueryState<T>({
  query,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined };
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <p className="text-(--color-text-secondary)">Loading…</p>;
  if (query.isError) {
    return (
      <p className="text-(--color-error)">
        Failed to load: {query.error instanceof Error ? query.error.message : String(query.error)}
      </p>
    );
  }
  return query.data ? <>{children(query.data)}</> : null;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-(--color-primary) text-(--color-on-secondary)"
          : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
      }`}
    >
      {children}
    </button>
  );
}

/** Ports _ArchiveHero — a rotating real F1 trivia fact, deterministic by the current minute. */
function ArchiveHero() {
  const [factIndex] = useState(() => new Date().getMinutes() % ARCHIVE_FACTS.length);
  const f = ARCHIVE_FACTS[factIndex];
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl bg-(--color-surface-elevated) p-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg"
        style={{ color: f.color, borderColor: `color-mix(in srgb, ${f.color} 40%, transparent)`, backgroundColor: `color-mix(in srgb, ${f.color} 18%, transparent)` }}
      >
        {f.icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black tracking-[0.16em]" style={{ color: f.color }}>
          FROM THE VAULT
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-(--color-text-primary)">{f.fact}</p>
      </div>
    </div>
  );
}

/** Ports _RaceCard — circuit-color accent bar, round badge, and a gold P1 winner badge. */
function RaceCardList({ races }: { races: ArchiveRace[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      {races.map((race) => {
        const hasWinner = !!race.winnerName?.trim();
        const accent = circuitColor(race.circuitId);
        return (
          <div
            key={race.round}
            onClick={() => router.push(`/race-details/${race.season}-${race.round}`)}
            className="flex cursor-pointer items-center gap-3 rounded-xl bg-(--color-surface-elevated) p-3 transition-colors hover:bg-(--color-surface)"
          >
            <div className="w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: accent }} />
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-[var(--font-f1)] text-[11px] font-black"
              style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
            >
              R{race.round}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-extrabold">{race.raceName.replace("Grand Prix", "GP")}</div>
              <div className="mt-[3px] flex items-center gap-1.5 text-[10px]">
                <span className="font-bold tracking-[0.1em]" style={{ color: accent }}>
                  {race.locality.toUpperCase()}
                </span>
                <span className="h-[3px] w-[3px] rounded-full bg-(--color-text-muted)" />
                <span className="text-(--color-text-muted)">
                  {race.date ? dateFormatter.format(new Date(race.date)) : "—"}
                </span>
              </div>
              {hasWinner && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded px-1.5 py-[1px] font-[var(--font-f1)] text-[9px] font-black text-[#FFD700]" style={{ backgroundColor: "color-mix(in srgb, #FFD700 18%, transparent)" }}>
                    P1
                  </span>
                  <span className="truncate text-[10px] text-(--color-text-secondary)">
                    {race.winnerName}
                    {race.winnerTeam && ` · ${race.winnerTeam}`}
                  </span>
                </div>
              )}
            </div>
            <span className="shrink-0 text-(--color-text-muted)">›</span>
          </div>
        );
      })}
    </div>
  );
}

function ChampionsTable({ champions }: { champions: ChampionEntry[] }) {
  const hasTeams = champions.some((c) => c.team);

  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Season</th>
            <th className="px-4 py-3 font-medium">Champion</th>
            {hasTeams && <th className="px-4 py-3 font-medium">Team</th>}
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {champions.map((c) => (
            <tr
              key={c.season}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{c.season}</td>
              <td className="px-4 py-3 font-medium">{c.name}</td>
              {hasTeams && (
                <td className="px-4 py-3 text-(--color-text-secondary)">{c.team ?? "—"}</td>
              )}
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{c.wins}</td>
              <td className="px-4 py-3 text-right font-semibold">{c.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
