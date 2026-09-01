"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/stats/presentation/race_progression_screen.dart.
 * Season/race pickers are native <select> elements instead of the Flutter
 * version's modal bottom sheets — a sheet is a mobile picker pattern; a
 * dropdown is the desktop equivalent and needs no extra chrome.
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSyncStatus } from "@/lib/api/stats-api";
import { getRacesForSeason, getRaceProgressionEntries } from "@/lib/api/race-progression";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { useMounted } from "@/hooks/use-mounted";
import { RaceProgressionChart } from "@/components/stats/race-progression-chart";
import { Skeleton } from "@/components/shared/skeleton";

const FIRST_SEASON = 1950;

export default function RaceProgressionPage() {
  const mounted = useMounted();
  const [season, setSeason] = useState(config.currentSeason);
  const [round, setRound] = useState<number | null>(null);

  const syncStatusQuery = useQuery({
    queryKey: ["sync-status"],
    queryFn: getSyncStatus,
    staleTime: staleTime.syncStatus,
  });
  const racesQuery = useQuery({
    queryKey: ["races-for-season", season],
    queryFn: () => getRacesForSeason(season),
    staleTime: season === config.currentSeason ? staleTime.currentSeason : staleTime.immutable,
  });

  // Defaults to the most recently-synced race the first time this loads,
  // without forcing a pick first — same idea as the Home screen's last-podium card.
  const syncStatus = syncStatusQuery.data;
  const effectiveRound =
    round ?? (syncStatus && Number(syncStatus.season) === season ? Number(syncStatus.last_race_round) : null);

  const progressionQuery = useQuery({
    queryKey: ["race-progression", season, effectiveRound],
    queryFn: () => getRaceProgressionEntries(season, effectiveRound as number),
    staleTime: staleTime.immutable,
    enabled: effectiveRound != null,
  });

  const seasons = Array.from(
    { length: config.currentSeason - FIRST_SEASON + 1 },
    (_, i) => config.currentSeason - i,
  );

  return (
    <main className="flex-1 px-8 py-8">
      <Link href="/stats" className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← Stats
      </Link>
      <h1 className="mb-1 font-[var(--font-f1)] text-2xl font-bold">Quali → Race</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">Position progression, race by race</p>

      {!mounted ? (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-56" />
          </div>
          <Skeleton className="h-96 w-full" />
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={season}
              onChange={(e) => {
                setSeason(Number(e.target.value));
                setRound(null);
              }}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-medium"
            >
              {seasons.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={effectiveRound ?? ""}
              onChange={(e) => setRound(e.target.value ? Number(e.target.value) : null)}
              disabled={racesQuery.isLoading || (racesQuery.data?.length ?? 0) === 0}
              className="min-w-[220px] rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              <option value="">{racesQuery.isLoading ? "Loading races…" : "Pick a race"}</option>
              {racesQuery.data?.map((r) => (
                <option key={r.round} value={r.round}>
                  Round {r.round} — {r.raceName}
                </option>
              ))}
            </select>
          </div>

          {effectiveRound == null ? (
            <p className="text-(--color-text-secondary)">Pick a race to see its progression.</p>
          ) : (
            <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
              <Legend />
              <div className="mt-4">
                {progressionQuery.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : progressionQuery.isError ? (
                  <p className="p-8 text-center text-sm text-(--color-error)">Could not load this race&rsquo;s results.</p>
                ) : (
                  <RaceProgressionChart entries={progressionQuery.data ?? []} />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold tracking-wide text-(--color-text-muted)">
      <span>POSITION CHANGE</span>
      <LegendItem label="Gain" color="var(--color-success)" />
      <LegendItem label="Loss" color="var(--color-error)" />
      <LegendItem label="Hold" color="var(--color-border)" />
    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-0.5 w-2.5" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
