"use client";

import { useQuery } from "@tanstack/react-query";
import { getFullSprintResults } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { teamColor, circuitColor } from "@/lib/theme/colors";
import { driverCode, sprintResultFromRow, isFinished, type RaceResult } from "@/lib/models/race-details";
import { ResultRow, PositionChange } from "./result-row";
import { bundledCircuitImage } from "./circuit-asset";
import Image from "next/image";

/**
 * Ports _SprintResultsList / _SprintResultBanner / _SprintResultCard from
 * race_details_screen.dart — a trimmed-down version of the RACE tab's:
 * winner + podium, no fastest-lap/pit chips (sprint_results has neither
 * column — Jolpica's sprint endpoint never provided them), no interval/gap
 * tiles per row.
 */
export function SprintResultsTab({ season, round, circuitId }: { season: string; round: string; circuitId: string }) {
  const query = useQuery({
    queryKey: ["sprint-results", season, round],
    queryFn: async () => (await getFullSprintResults(Number(season), Number(round))).map(sprintResultFromRow),
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
    return <p className="py-6 text-center text-sm text-(--color-text-secondary)">Sprint results not available yet</p>;
  }

  return (
    <div className="flex flex-col gap-2 pb-8">
      <SprintBanner results={results} circuitId={circuitId} round={round} />
      {results.map((r, i) => (
        <SprintRow key={r.driver.driverId} result={r} index={i} />
      ))}
    </div>
  );
}

function SprintBanner({ results, circuitId, round }: { results: RaceResult[]; circuitId: string; round: string }) {
  const accent = circuitColor(circuitId);
  const img = bundledCircuitImage(circuitId);
  const podium = results.slice(0, 3);
  const winner = podium[0];
  const winnerColor = winner ? teamColor(winner.constructor.name) : accent;

  return (
    <div className="relative mb-2 overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-4">
      <div
        className="pointer-events-none absolute top-[-100px] right-[-80px] h-[300px] w-[300px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${winnerColor} 30%, transparent), transparent)` }}
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
          SPRINT COMPLETE
        </span>
      </div>
      {winner && (
        <>
          <div className="relative mt-4 text-[10px] font-black tracking-[0.2em]" style={{ color: winnerColor }}>
            🏆 WINNER
          </div>
          <div className="relative mt-1 truncate font-[var(--font-f1)] text-[36px] leading-none font-black">
            {winner.driver.familyName.toUpperCase()}
          </div>
          <div className="relative mt-1 text-[11px] font-extrabold tracking-[0.16em]" style={{ color: winnerColor }}>
            {winner.constructor.name.toUpperCase()}
          </div>
          {podium.length > 1 && (
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              {podium.slice(1).map((r, i) => (
                <div key={r.driver.driverId} className="flex items-center justify-between rounded-lg bg-(--color-surface) px-3 py-2">
                  <span className="text-[11px] font-extrabold tracking-wide text-(--color-text-muted)">P{i + 2}</span>
                  <span className="font-[var(--font-f1)] text-[15px] font-black tracking-wide" style={{ color: teamColor(r.constructor.name) }}>
                    {driverCode(r.driver)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SprintRow({ result: r, index }: { result: RaceResult; index: number }) {
  const pos = Number(r.position) || 99;
  let statusDisplay: string;
  let statusColor: string;
  let showPts = false;
  if (isFinished(r)) {
    statusDisplay = r.points ?? "0";
    statusColor = "var(--color-text-primary)";
    showPts = true;
  } else {
    const s = (r.status ?? "").toUpperCase();
    statusDisplay = s.includes("DISQUALIFIED") ? "DSQ" : s.includes("DID NOT START") ? "DNS" : "DNF";
    statusColor = "var(--color-error)";
  }

  return (
    <ResultRow
      position={pos}
      driver={r.driver}
      constructor={r.constructor}
      index={index}
      chevron={<PositionChange grid={r.grid} position={r.position} />}
      right={
        <div className="shrink-0 text-right">
          <div className="font-[var(--font-f1)] text-2xl leading-none font-black" style={{ color: statusColor }}>
            {statusDisplay}
          </div>
          {showPts && <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">POINTS</div>}
        </div>
      }
    />
  );
}
