"use client";

import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import {
  allSessions,
  hasTime,
  isUpcoming,
  raceDateTime,
  raceFromRow,
  sessionDateTime,
  type F1Race,
} from "@/lib/models/schedule";
import { useMounted } from "@/hooks/use-mounted";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

export default function SchedulePage() {
  const mounted = useMounted();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schedule", config.currentSeason],
    queryFn: async () => {
      const rows = await getSchedule(config.currentSeason);
      return rows.map(raceFromRow).sort((a, b) => Number(a.round) - Number(b.round));
    },
    staleTime: staleTime.currentSeason,
  });

  return (
    <main className="flex-1 px-8 py-8">
      <h1 className="mb-6 font-[var(--font-f1)] text-2xl font-bold">
        {config.currentSeason} Schedule
      </h1>

      {!mounted || isLoading ? (
        <p className="text-(--color-text-secondary)">Loading schedule…</p>
      ) : isError ? (
        <p className="text-(--color-error)">
          Failed to load schedule: {error instanceof Error ? error.message : String(error)}
        </p>
      ) : (
        data && (
          <>
            <NextRaceHero races={data} />
            <ScheduleTable races={data} />
          </>
        )
      )}
    </main>
  );
}

function NextRaceHero({ races }: { races: F1Race[] }) {
  const next = races.find(isUpcoming);
  if (!next) return null;

  const qualifying = next.sessions.qualifying;

  return (
    <div className="mb-8 rounded-2xl border border-(--color-primary) bg-(--color-surface) p-6">
      <div className="mb-2 text-xs font-bold tracking-widest text-(--color-primary)">
        NEXT UP — ROUND {next.round}
      </div>
      <h2 className="mb-1 font-[var(--font-f1)] text-xl font-bold">{next.raceName}</h2>
      <p className="mb-4 text-(--color-text-secondary)">
        {next.circuit.locality}, {next.circuit.country}
      </p>
      <div className="flex gap-6 text-sm">
        {qualifying && hasTime(qualifying) && (
          <div>
            <div className="text-(--color-text-muted)">Qualifying</div>
            <div>{dateFormatter.format(sessionDateTime(qualifying))}</div>
          </div>
        )}
        <div>
          <div className="text-(--color-text-muted)">Race</div>
          <div>
            {dateFormatter.format(raceDateTime(next))}
            {next.time && ` · ${timeFormatter.format(raceDateTime(next))}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleTable({ races }: { races: F1Race[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Rd</th>
            <th className="px-4 py-3 font-medium">Race</th>
            <th className="px-4 py-3 font-medium">Circuit</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Sessions</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {races.map((race) => {
            const upcoming = isUpcoming(race);
            return (
              <tr
                key={race.round}
                className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
              >
                <td className="px-4 py-3 text-(--color-text-muted)">{race.round}</td>
                <td className="px-4 py-3 font-medium">{race.raceName}</td>
                <td className="px-4 py-3 text-(--color-text-secondary)">
                  {race.circuit.locality}, {race.circuit.country}
                </td>
                <td className="px-4 py-3 text-(--color-text-secondary)">
                  {dateFormatter.format(raceDateTime(race))}
                </td>
                <td className="px-4 py-3 text-(--color-text-secondary)">
                  {allSessions(race.sessions).length + 1 /* + race itself */}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      upcoming
                        ? "bg-(--color-info)/20 text-(--color-info)"
                        : "bg-(--color-surface-elevated) text-(--color-text-muted)"
                    }`}
                  >
                    {upcoming ? "Upcoming" : "Completed"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
