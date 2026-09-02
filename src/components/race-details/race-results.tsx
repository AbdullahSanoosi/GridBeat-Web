"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag, Trophy } from "lucide-react";
import { getFullRaceResults, getPitStops, getLapLeaders } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { teamColor, circuitColor } from "@/lib/theme/colors";
import { driverCode } from "@/lib/models/race-details";
import {
  raceResultFromRow,
  pitStopFromRow,
  lapLeaderFromRow,
  isFinished,
  computeIntervals,
  raceTimeDisplay,
  fastestPitDisplay,
  type RaceResult,
} from "@/lib/models/race-details";
import { ResultRow, MetricTile, PositionChange, Badge } from "./result-row";
import { bundledCircuitImage } from "./circuit-asset";
import Image from "next/image";

/**
 * Ports _RaceResultsList / _ResultBanner / _ResultCard from
 * race_details_screen.dart — the RACE tab. Adds two things Flutter never
 * built: a full pit-stop list (the app only ever surfaces the *fastest*
 * one) and a leaders-by-lap timeline off `lap_leaders`, a 35,313-row table
 * with no UI anywhere in either app before this.
 */
export function RaceResultsTab({
  season,
  round,
  circuitId,
}: {
  season: string;
  round: string;
  circuitId: string;
}) {
  const resultsQuery = useQuery({
    queryKey: ["race-results", season, round],
    queryFn: async () => (await getFullRaceResults(Number(season), Number(round))).map(raceResultFromRow),
    staleTime: staleTime.immutable,
  });
  const pitQuery = useQuery({
    queryKey: ["race-pit-stops", season, round],
    queryFn: async () => (await getPitStops(Number(season), Number(round))).map(pitStopFromRow),
    staleTime: staleTime.immutable,
  });
  const lapLeadersQuery = useQuery({
    queryKey: ["race-lap-leaders", season, round],
    queryFn: async () => (await getLapLeaders(Number(season), Number(round))).map(lapLeaderFromRow),
    staleTime: staleTime.immutable,
  });

  const results = resultsQuery.data ?? [];
  const pitStops = pitQuery.data ?? [];
  const lapLeaders = lapLeadersQuery.data ?? [];
  const intervals = computeIntervals(results);

  if (resultsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-(--color-surface-elevated)" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="py-6 text-center text-sm text-(--color-text-secondary)">Race results not available yet</p>;
  }

  return (
    <div className="flex flex-col gap-2 pb-8">
      <ResultBanner
        results={results}
        circuitId={circuitId}
        round={round}
        fastestPit={fastestPitDisplay(pitStops, results)}
      />

      {lapLeaders.length > 0 && <LeadersByLap leaders={lapLeaders} totalLaps={Number(results[0]?.laps) || undefined} />}

      {results.map((r, i) => (
        <RaceResultRow key={r.driver.driverId} result={r} index={i} interval={intervals[i]} allResults={results} />
      ))}

      {pitStops.length > 0 && <PitStopsList pitStops={pitStops} results={results} />}
    </div>
  );
}

function ResultBanner({
  results,
  circuitId,
  round,
  fastestPit,
}: {
  results: RaceResult[];
  circuitId: string;
  round: string;
  fastestPit: string;
}) {
  const accent = circuitColor(circuitId);
  const img = bundledCircuitImage(circuitId);
  const laps = results[0]?.laps ?? "";
  const podium = results.slice(0, 3);
  const winner = podium[0];
  const winnerColor = winner ? teamColor(winner.constructor.name) : accent;

  const flResult = results.find((r) => r.fastestLapRank === "1");
  const flDisplay = flResult ? `${driverCode(flResult.driver)} (${flResult.fastestLapTime ?? "—"})` : "N/A";

  return (
    <div
      className="relative mb-2 overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-4"
    >
      <div
        className="pointer-events-none absolute top-[-100px] right-[-80px] h-[300px] w-[300px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${winnerColor} 35%, transparent), transparent)` }}
      />
      {img && (
        <div className="pointer-events-none absolute top-2 right-[-20px] bottom-2 w-40 opacity-[0.08]">
          <Image src={img} alt="" fill sizes="160px" className="object-contain" />
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-(--color-surface) px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.16em] text-(--color-text-secondary)">
          ROUND {round}
        </span>
        <span
          className="rounded-full px-3 py-1 font-[var(--font-f1)] text-[10px] font-extrabold tracking-[0.14em]"
          style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
        >
          <Flag className="mr-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />RACE COMPLETE
        </span>
        {laps && (
          <span className="ml-auto text-[10px] font-bold tracking-[0.14em] text-(--color-text-muted)">{laps} LAPS</span>
        )}
      </div>

      {winner && (
        <>
          <div className="relative mt-4 flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em]" style={{ color: winnerColor }}>
            <Trophy className="mr-1.5 inline h-3 w-3 align-[-1px]" aria-hidden="true" />WINNER
          </div>
          <div className="relative mt-1 truncate font-[var(--font-f1)] text-[40px] leading-none font-black">
            {winner.driver.familyName.toUpperCase()}
          </div>
          <div className="relative mt-1 flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-[0.16em]" style={{ color: winnerColor }}>
              {winner.constructor.name.toUpperCase()}
            </span>
            {winner.timeMillis != null && (
              <>
                <span className="h-[3px] w-[3px] rounded-full bg-(--color-text-muted)" />
                <span className="text-[11px] font-bold text-(--color-text-secondary)">
                  {raceTimeDisplay(results, winner)}
                </span>
              </>
            )}
          </div>

          {podium.length > 1 && (
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              {podium.slice(1).map((r, i) => (
                <RunnerUpChip key={r.driver.driverId} position={i + 2} result={r} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <RecordChip label="FASTEST LAP" value={flDisplay} color="var(--color-sector-purple)" />
        <RecordChip label="FASTEST PIT" value={fastestPit} color="var(--color-success)" />
      </div>
    </div>
  );
}

function RunnerUpChip({ position, result }: { position: number; result: RaceResult }) {
  const team = teamColor(result.constructor.name);
  return (
    <div className="flex items-center justify-between rounded-lg bg-(--color-surface) px-3 py-2">
      <span className="text-[11px] font-extrabold tracking-wide text-(--color-text-muted)">P{position}</span>
      <span className="font-[var(--font-f1)] text-[15px] font-black tracking-wide" style={{ color: team }}>
        {driverCode(result.driver)}
      </span>
    </div>
  );
}

function RecordChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-(--color-surface) p-2">
      <div className="truncate text-[9px] font-extrabold tracking-[0.14em]" style={{ color }}>
        {label}
      </div>
      <div className="mt-[3px] truncate text-xs font-bold">{value}</div>
    </div>
  );
}

function RaceResultRow({
  result: r,
  index,
  interval,
  allResults,
}: {
  result: RaceResult;
  index: number;
  interval: string | null;
  allResults: RaceResult[];
}) {
  const pos = Number(r.position) || 99;
  const isFastestLap = r.fastestLapRank === "1";
  const gapToLeader = raceTimeDisplay(allResults, r);
  // A DNF/DNS/DSQ/DNQ/lapped row's `time_millis` (elapsed time when they
  // stopped, or their finish time on fewer laps) isn't comparable to the
  // leader's full-race time — diffing them can go negative (confirmed: R12
  // 2026, Albon retired lap 66/72 with a *smaller* time_millis than the
  // leader's 72-lap total). Route the status word to GAP TO LEADER too in
  // that case rather than showing a nonsense numeric gap.
  const isSpecial = interval != null && (interval.includes("Lap") || ["DNF", "DNS", "DSQ", "DNQ"].includes(interval));
  const intervalDisplay = pos === 1 || isSpecial ? "—" : (interval ?? "—");
  const gapDisplay = isSpecial ? (interval ?? "—") : (gapToLeader ?? "—");
  const gapLabel = pos === 1 ? "TIME" : "GAP TO LEADER";

  let statusDisplay: string;
  let statusColor: string;
  let showPts = false;
  if (isFinished(r)) {
    statusDisplay = r.points ?? "0";
    statusColor = "var(--color-text-primary)";
    showPts = true;
  } else {
    const s = (r.status ?? "").toUpperCase();
    statusDisplay = s.includes("DISQUALIFIED")
      ? "DSQ"
      : s.includes("DID NOT START")
        ? "DNS"
        : s.includes("DID NOT QUALIFY")
          ? "DNQ"
          : "DNF";
    statusColor = "var(--color-error)";
  }

  return (
    <ResultRow
      position={pos}
      driver={r.driver}
      constructor={r.constructor}
      index={index}
      highlightColor={isFastestLap ? "var(--color-sector-purple)" : undefined}
      badge={isFastestLap ? <Badge color="var(--color-sector-purple)" label="FL" /> : undefined}
      chevron={<PositionChange grid={r.grid} position={r.position} />}
      right={
        <div className="shrink-0 text-right">
          <div className="font-[var(--font-f1)] text-2xl leading-none font-black" style={{ color: statusColor }}>
            {statusDisplay}
          </div>
          {showPts && <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">POINTS</div>}
        </div>
      }
      below={
        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="INTERVAL" value={intervalDisplay} />
          <MetricTile label={gapLabel} value={gapDisplay} />
          <MetricTile label="FASTEST LAP" value={r.fastestLapTime ?? "—"} highlight={isFastestLap} />
        </div>
      }
    />
  );
}

function PitStopsList({ pitStops, results }: { pitStops: import("@/lib/models/race-details").PitStop[]; results: RaceResult[] }) {
  const byDriver = new Map(results.map((r) => [r.driver.driverId, r]));
  return (
    <details className="mt-2 rounded-xl bg-(--color-surface) p-3">
      <summary className="cursor-pointer font-[var(--font-f1)] text-[11px] font-bold tracking-[0.14em] text-(--color-text-secondary)">
        PIT STOPS ({pitStops.length})
      </summary>
      <div className="mt-3 flex flex-col gap-1">
        {pitStops.map((p, i) => {
          const r = byDriver.get(p.driverId);
          const team = r ? teamColor(r.constructor.name) : "var(--color-text-muted)";
          return (
            <div key={i} className="flex items-center justify-between rounded-lg bg-(--color-surface-elevated) px-3 py-2 text-xs">
              <span className="font-bold" style={{ color: team }}>
                {r ? driverCode(r.driver) : p.driverId}
              </span>
              <span className="text-(--color-text-muted)">LAP {p.lap ?? "—"}</span>
              <span className="text-(--color-text-muted)">STOP {p.stopNumber}</span>
              <span className="font-mono font-bold">{p.duration ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

/** Merges consecutive same-driver laps into stints for a compact timeline — lap_leaders has no UI in either app before this. */
function LeadersByLap({
  leaders,
  totalLaps,
}: {
  leaders: import("@/lib/models/race-details").LapLeader[];
  totalLaps?: number;
}) {
  const laps = totalLaps ?? leaders[leaders.length - 1]?.lap ?? leaders.length;
  const segments: { start: number; end: number; code: string; color: string }[] = [];
  for (const l of leaders) {
    const last = segments[segments.length - 1];
    if (last && last.code === l.driverCode) {
      last.end = l.lap;
    } else {
      segments.push({ start: l.lap, end: l.lap, code: l.driverCode, color: teamColor(l.constructorName) });
    }
  }

  return (
    <div className="mb-2 rounded-xl bg-(--color-surface) p-3">
      <div className="mb-2 font-[var(--font-f1)] text-[11px] font-bold tracking-[0.14em] text-(--color-text-secondary)">
        RACE LEADERS BY LAP
      </div>
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {segments.map((seg, i) => {
          const width = ((seg.end - seg.start + 1) / laps) * 100;
          return (
            <div
              key={i}
              className="group relative flex items-center justify-center border-r border-(--color-background) last:border-r-0"
              style={{ width: `${width}%`, backgroundColor: seg.color }}
              title={`${seg.code} — laps ${seg.start}–${seg.end}`}
            >
              {width > 6 && (
                <span className="truncate px-1 font-[var(--font-f1)] text-[10px] font-black text-white/90">{seg.code}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] font-bold text-(--color-text-muted)">
        <span>LAP 1</span>
        <span>LAP {laps}</span>
      </div>
    </div>
  );
}
