"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";
import { raceFromRow, raceDateTime, sessionDateTime, type F1Race } from "@/lib/models/schedule";
import { SessionScheduleView } from "@/components/race-details/session-schedule";
import { RaceResultsTab } from "@/components/race-details/race-results";
import { QualifyingResultsTab } from "@/components/race-details/qualifying-results";
import { PracticeResultsTab } from "@/components/race-details/practice-results";
import { SprintResultsTab } from "@/components/race-details/sprint-results";
import { CircuitTab } from "@/components/race-details/circuit-tab";
import { Skeleton, SkeletonRows } from "@/components/shared/skeleton";
import { useSectionStore } from "@/lib/nav/section-store";

/**
 * Ports RaceDetailsScreen from race_details_screen.dart. `raceId` is
 * `${season}-${round}` — chosen over a raw Jolpica race id (which the
 * stats-api schema doesn't carry) since season+round is this app's own
 * primary key for a race everywhere else (getFullRaceResults etc. already
 * take them as separate params).
 */
type TabKind = "schedule" | "fp" | "sprint" | "qualifying" | "race" | "circuit";

export default function RaceDetailsPage({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = use(params);
  const mounted = useMounted();
  const match = /^(\d{4})-(\d+)$/.exec(raceId);
  const season = match?.[1] ?? "";
  const round = match?.[2] ?? "";

  const { data: races, isLoading } = useQuery({
    queryKey: ["schedule", season],
    queryFn: async () => (await getSchedule(Number(season))).map(raceFromRow),
    staleTime: staleTime.currentSeason,
    enabled: mounted && season.length > 0,
  });

  const race = races?.find((r) => r.round === round);

  if (!mounted || isLoading) {
    return (
      <main className="flex-1 px-6 py-8 md:px-8">
        <Skeleton className="mb-4 h-40 w-full" />
        <div className="mb-4 flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        <SkeletonRows count={5} className="h-16" />
      </main>
    );
  }

  if (!match || !race) {
    return (
      <main className="flex-1 px-6 py-8 md:px-8">
        <Link href="/schedule" className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
          ← Schedule
        </Link>
        <p className="text-(--color-error)">Race not found.</p>
      </main>
    );
  }

  return <RaceDetailsContent race={race} season={season} round={round} />;
}

function RaceDetailsContent({ race, season, round }: { race: F1Race; season: string; round: string }) {
  const lastSection = useSectionStore((s) => s.lastSection);
  const [now] = useState(() => Date.now());
  const over = (t: { date: string; time: string | null } | null) => t != null && sessionDateTime(t).getTime() < now;

  // Same "time passed, not data-presence" heuristic as _buildTabs() in
  // race_details_screen.dart: SCHEDULE + CIRCUIT always visible, the others
  // appear once their session has actually run.
  const tabs: { kind: TabKind; label: string }[] = [{ kind: "schedule", label: "SCHEDULE" }];
  if (over(race.sessions.fp1)) tabs.push({ kind: "fp", label: "PRACTICE" });
  if (race.sessions.sprint && over(race.sessions.sprint)) tabs.push({ kind: "sprint", label: "SPRINT" });
  if (over(race.sessions.qualifying)) tabs.push({ kind: "qualifying", label: "QUALIFYING" });
  if (raceDateTime(race).getTime() < now) tabs.push({ kind: "race", label: "RACE" });
  tabs.push({ kind: "circuit", label: "CIRCUIT" });

  const raceOver = tabs.some((t) => t.kind === "race");
  const [tab, setTab] = useState<TabKind>(raceOver ? "race" : "schedule");
  const active = tabs.some((t) => t.kind === tab) ? tab : tabs[0].kind;

  const qualDate = race.sessions.qualifying?.date ?? "";
  const back = lastSection ?? { href: "/schedule", label: "Schedule" };

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <Link href={back.href} className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← {back.label}
      </Link>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-(--color-surface-elevated) p-1">
        {tabs.map((t) => (
          <button
            key={t.kind}
            onClick={() => setTab(t.kind)}
            className="shrink-0 rounded-full px-4 py-2 font-[var(--font-f1)] text-[11px] font-extrabold tracking-wider transition-colors"
            style={{
              backgroundColor: active === t.kind ? "var(--color-primary)" : "transparent",
              color: active === t.kind ? "white" : "var(--color-text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-3xl">
        {active === "schedule" && (
          <SessionScheduleView
            race={race}
            round={round}
            onViewResults={raceOver ? () => setTab("race") : undefined}
          />
        )}
        {active === "fp" && <PracticeResultsTab race={race} season={season} round={round} />}
        {active === "sprint" && <SprintResultsTab season={season} round={round} circuitId={race.circuit.circuitId} />}
        {active === "qualifying" && <QualifyingResultsTab season={season} round={round} qualDate={qualDate} />}
        {active === "race" && (
          <RaceResultsTab season={season} round={round} circuitId={race.circuit.circuitId} />
        )}
        {active === "circuit" && (
          <CircuitTab circuitId={race.circuit.circuitId} locality={race.circuit.locality} country={race.circuit.country} />
        )}
      </div>
    </main>
  );
}
