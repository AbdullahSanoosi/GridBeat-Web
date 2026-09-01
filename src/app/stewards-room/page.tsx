"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getActivePenaltyPoints,
  getCarUpgrades,
  getFiaDecisions,
  getFiaRounds,
  getGridEntries,
  getLatestFiaRound,
  getTyreNotice,
} from "@/lib/api/fia-docs";
import {
  buildWeekendDays,
  carUpgradeFromRow,
  fiaDecisionFromRow,
  gridEntryFromRow,
  penaltyEntriesFromRows,
  tyreNoticeFromRow,
} from "@/lib/models/fia-docs";
import { config } from "@/lib/config";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";
import { WeekendTab } from "@/components/stewards/weekend-tab";
import { PointsTab } from "@/components/stewards/points-tab";
import { GridTab } from "@/components/stewards/grid-tab";
import { TyresTab } from "@/components/stewards/tyres-tab";
import { UpgradesTab } from "@/components/stewards/upgrades-tab";

/**
 * Stewards' Room — ports fia_docs_screen.dart. Everything the FIA published
 * for the weekend, parsed into its own fields and rendered natively; the
 * app never hands the user off to fia.com.
 *
 * WEEKEND is season-wide (the decision timeline); GRID, TYRES and UPGRADES
 * are round-scoped and follow the latest round with documents on file.
 */

const TABS = ["WEEKEND", "PENALTY POINTS", "GRID", "TYRES", "UPGRADES"] as const;
type Tab = (typeof TABS)[number];

export default function StewardsRoomPage() {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("WEEKEND");
  const season = config.currentSeason;

  const [pickedRound, setPickedRound] = useState<number | null>(null);

  const round = useQuery({
    queryKey: ["fia-latest-round", season],
    queryFn: () => getLatestFiaRound(season),
    staleTime: staleTime.currentSeason,
  });

  const rounds = useQuery({
    queryKey: ["fia-rounds", season],
    queryFn: () => getFiaRounds(season),
    staleTime: staleTime.currentSeason,
  });

  const decisions = useQuery({
    queryKey: ["fia-decisions", season],
    queryFn: async () => (await getFiaDecisions(season)).map(fiaDecisionFromRow),
    staleTime: staleTime.currentSeason,
  });

  const points = useQuery({
    queryKey: ["fia-penalty-points"],
    queryFn: async () => penaltyEntriesFromRows(await getActivePenaltyPoints()),
    staleTime: staleTime.currentSeason,
  });

  // Every tab here is weekend-scoped — a season's 900 documents shown as one
  // timeline would be meaningless. Defaults to the latest round with
  // documents; the selector lets you walk back through the season.
  const activeRound = pickedRound ?? round.data ?? null;

  const grid = useQuery({
    queryKey: ["fia-grid", season, activeRound],
    queryFn: async () => (await getGridEntries(season, activeRound!)).map(gridEntryFromRow),
    enabled: activeRound != null,
    staleTime: staleTime.currentSeason,
  });

  const tyres = useQuery({
    queryKey: ["fia-tyres", season, activeRound],
    queryFn: async () => {
      const row = await getTyreNotice(season, activeRound!);
      return row ? tyreNoticeFromRow(row) : null;
    },
    enabled: activeRound != null,
    staleTime: staleTime.currentSeason,
  });

  const upgrades = useQuery({
    queryKey: ["fia-upgrades", season, activeRound],
    queryFn: async () => (await getCarUpgrades(season, activeRound!)).map(carUpgradeFromRow),
    enabled: activeRound != null,
    staleTime: staleTime.currentSeason,
  });

  const roundDocs = (decisions.data ?? []).filter((d) => d.round === activeRound);
  const weekendName =
    rounds.data?.find((r) => r.round === activeRound)?.raceName ??
    (activeRound != null ? `Round ${activeRound}` : "");

  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-f1)] text-2xl font-bold sm:text-3xl">Stewards&apos; Room</h1>
          <p className="mt-1 max-w-xl text-sm text-(--color-text-secondary)">
            Every document the FIA published for the weekend — decisions, penalty points, the confirmed grid, tyre
            compliance and car upgrades.
          </p>
        </div>

        {mounted && rounds.data && rounds.data.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">
              WEEKEND
            </span>
            <select
              value={activeRound ?? ""}
              onChange={(e) => setPickedRound(Number(e.target.value))}
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm"
            >
              {rounds.data.map((r) => (
                <option key={r.round} value={r.round}>
                  R{r.round} · {r.raceName}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <div className="mb-6 min-w-0 overflow-x-auto">
        <div className="flex w-fit gap-1 rounded-full border border-(--color-border) p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`shrink-0 rounded-full px-4 py-1.5 font-[var(--font-f1)] text-xs font-bold tracking-wider whitespace-nowrap transition-colors ${
                tab === t
                  ? "bg-(--color-primary) text-white"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {!mounted ? (
        <Loading />
      ) : tab === "WEEKEND" ? (
        <Guard q={decisions} pending={activeRound == null && round.isLoading}>
          {() => (
            <WeekendTab
              days={buildWeekendDays(roundDocs)}
              totalDocs={roundDocs.length}
              season={season}
              weekend={weekendName}
            />
          )}
        </Guard>
      ) : tab === "PENALTY POINTS" ? (
        <Guard q={points}>{(data) => <PointsTab entries={data} />}</Guard>
      ) : tab === "GRID" ? (
        <Guard q={grid} pending={activeRound == null}>
          {(data) => <GridTab docs={roundDocs} entries={data} weekend={weekendName} />}
        </Guard>
      ) : tab === "TYRES" ? (
        <Guard q={tyres} pending={activeRound == null}>
          {(data) => <TyresTab notice={data} weekend={weekendName} />}
        </Guard>
      ) : (
        <Guard q={upgrades} pending={activeRound == null}>
          {(data) => <UpgradesTab upgrades={data} weekend={weekendName} />}
        </Guard>
      )}
    </main>
  );
}

/** One place for the loading/error/empty triad so no tab invents its own. */
function Guard<T>({
  q,
  pending,
  children,
}: {
  q: { data?: T; isLoading: boolean; isError: boolean; error: unknown };
  pending?: boolean;
  children: (data: T) => React.ReactNode;
}) {
  if (pending || q.isLoading) return <Loading />;
  if (q.isError) {
    return (
      <p className="text-(--color-error)">
        Couldn&apos;t load documents: {q.error instanceof Error ? q.error.message : String(q.error)}
      </p>
    );
  }
  if (q.data === undefined) return <Loading />;
  return <>{children(q.data)}</>;
}

function Loading() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-(--color-surface)"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
