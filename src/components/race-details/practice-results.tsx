"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullPracticeResults } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { practiceResultFromRow } from "@/lib/models/race-details";
import { ResultRow, Badge } from "./result-row";
import { sessionDateTime, type F1Race } from "@/lib/models/schedule";

/**
 * Ports _PracticeTabView / _PracticeResultsList / _PracticeResultRow from
 * race_details_screen.dart — the PRACTICE tab's own sub-tab bar (pill
 * TabBar in Flutter, here a plain segmented control) over FP1/FP2/FP3, or
 * FP1/SQ on a sprint weekend.
 */
export function PracticeResultsTab({ race, season, round }: { race: F1Race; season: string; round: string }) {
  const isSprint = race.sessions.sprint != null;
  const [now] = useState(() => Date.now());
  const over = (t: typeof race.sessions.fp1) => t != null && sessionDateTime(t).getTime() < now;

  const sessions = isSprint
    ? [
        over(race.sessions.fp1) && { key: "fp1", label: "FP1" },
        over(race.sessions.sprintQualifying) && { key: "sprint_qualifying", label: "SQ" },
      ].filter((s): s is { key: string; label: string } => !!s)
    : [
        over(race.sessions.fp1) && { key: "fp1", label: "FP1" },
        over(race.sessions.fp2) && { key: "fp2", label: "FP2" },
        over(race.sessions.fp3) && { key: "fp3", label: "FP3" },
      ].filter((s): s is { key: string; label: string } => !!s);

  const [active, setActive] = useState(sessions[sessions.length - 1]?.key ?? "");
  const current = sessions.find((s) => s.key === active) ?? sessions[sessions.length - 1];

  if (sessions.length === 0) {
    return <p className="py-6 text-center text-sm text-(--color-text-secondary)">Practice results not available yet</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex gap-1 rounded-full bg-(--color-surface-elevated) p-1">
        {sessions.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className="flex-1 rounded-full py-2 font-[var(--font-f1)] text-[11px] font-extrabold tracking-wider transition-colors"
            style={{
              backgroundColor: current?.key === s.key ? "var(--color-primary)" : "transparent",
              color: current?.key === s.key ? "white" : "var(--color-text-secondary)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {current && <PracticeSessionPane season={season} round={round} session={current.key} />}
    </div>
  );
}

function PracticeSessionPane({ season, round, session }: { season: string; round: string; session: string }) {
  const query = useQuery({
    queryKey: ["practice-results", season, round, session],
    queryFn: async () => (await getFullPracticeResults(Number(season), Number(round), session)).map(practiceResultFromRow),
    staleTime: staleTime.immutable,
  });

  const results = query.data ?? [];

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-(--color-surface-elevated)" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="py-6 text-center text-sm text-(--color-text-secondary)">Practice results not available yet</p>;
  }

  const fastest = results[0]?.bestLapSeconds ?? null;

  return (
    <div className="flex flex-col gap-2">
      {results.map((r, i) => {
        const pos = Number(r.position) || i + 1;
        const isFastest = i === 0;
        const gap =
          fastest != null && r.bestLapSeconds != null && i > 0 ? `+${(r.bestLapSeconds - fastest).toFixed(3)}` : null;
        return (
          <ResultRow
            key={r.driver.driverId}
            position={pos}
            driver={r.driver}
            constructor={r.constructor}
            index={i}
            highlightColor={isFastest ? "var(--color-sector-purple)" : undefined}
            badge={isFastest ? <Badge color="var(--color-sector-purple)" label="FASTEST" /> : undefined}
            right={
              <div className="shrink-0 text-right">
                <div
                  className="font-[var(--font-f1)] text-base leading-none font-black"
                  style={{ color: isFastest ? "var(--color-sector-purple)" : "var(--color-text-primary)" }}
                >
                  {r.bestLapTime ?? "—"}
                </div>
                <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">
                  {gap ?? (r.laps ? `${r.laps} LAPS` : "BEST LAP")}
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
