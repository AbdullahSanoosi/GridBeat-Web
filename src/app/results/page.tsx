"use client";

import { useState } from "react";
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
  year: "numeric",
});

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
    <main className="flex-1 px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
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
          <div className="flex rounded-full border border-(--color-border) p-1">
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

      {!mounted ? (
        <p className="text-(--color-text-secondary)">Loading…</p>
      ) : tab === "races" ? (
        <QueryState query={racesQuery}>
          {(races) => <RacesTable races={races} />}
        </QueryState>
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

function RacesTable({ races }: { races: ArchiveRace[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Rd</th>
            <th className="px-4 py-3 font-medium">Race</th>
            <th className="px-4 py-3 font-medium">Circuit</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Winner</th>
          </tr>
        </thead>
        <tbody>
          {races.map((race) => (
            <tr
              key={race.round}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{race.round}</td>
              <td className="px-4 py-3 font-medium">{race.raceName}</td>
              <td className="px-4 py-3 text-(--color-text-secondary)">
                {race.locality}, {race.country}
              </td>
              <td className="px-4 py-3 text-(--color-text-secondary)">
                {race.date ? dateFormatter.format(new Date(race.date)) : "—"}
              </td>
              <td className="px-4 py-3">
                {race.winnerName ? (
                  <>
                    <span className="font-medium">{race.winnerName}</span>
                    {race.winnerTeam && (
                      <span className="text-(--color-text-muted)"> · {race.winnerTeam}</span>
                    )}
                  </>
                ) : (
                  <span className="text-(--color-text-muted)">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
