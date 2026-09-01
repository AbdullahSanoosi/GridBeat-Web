"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullQualifyingResults } from "@/lib/api/stats-api";
import { getOpenF1Sessions, getOpenF1Drivers, getOpenF1Laps } from "@/lib/api/openf1";
import { staleTime } from "@/lib/query/ttl";
import { driverCode, qualifyingResultFromRow, type QualifyingResult } from "@/lib/models/race-details";
import { ResultRow, Badge } from "./result-row";

/** Ports _QualifyingResultsList from race_details_screen.dart — the QUALIFYING tab. */
export function QualifyingResultsTab({
  season,
  round,
  qualDate,
}: {
  season: string;
  round: string;
  qualDate: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const resultsQuery = useQuery({
    queryKey: ["qualifying-results", season, round],
    queryFn: async () => (await getFullQualifyingResults(Number(season), Number(round))).map(qualifyingResultFromRow),
    staleTime: staleTime.immutable,
  });

  const results = resultsQuery.data ?? [];

  if (resultsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-(--color-surface-elevated)" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="py-6 text-center text-sm text-(--color-text-secondary)">Qualifying results not available yet</p>;
  }

  return (
    <div className="flex flex-col gap-2 pb-8">
      {results.map((r, i) => (
        <QualRow
          key={r.driver.driverId}
          result={r}
          index={i}
          isPole={i === 0}
          expanded={expanded === r.driver.driverId}
          onToggle={() => setExpanded((cur) => (cur === r.driver.driverId ? null : r.driver.driverId))}
          season={season}
          qualDate={qualDate}
        />
      ))}
    </div>
  );
}

function QualRow({
  result: r,
  index,
  isPole,
  expanded,
  onToggle,
  season,
  qualDate,
}: {
  result: QualifyingResult;
  index: number;
  isPole: boolean;
  expanded: boolean;
  onToggle: () => void;
  season: string;
  qualDate: string;
}) {
  const pos = Number(r.position) || 99;
  const best = r.q3 ?? r.q2 ?? r.q1;
  const bestLabel = r.q3 ? "Q3 BEST" : r.q2 ? "Q2 BEST" : "Q1 BEST";

  return (
    <div className="flex flex-col gap-2">
      <ResultRow
        position={pos}
        driver={r.driver}
        constructor={r.constructor}
        index={index}
        onClick={onToggle}
        highlightColor={isPole ? "var(--color-sector-purple)" : undefined}
        badge={isPole ? <Badge color="var(--color-sector-purple)" label="POLE" /> : undefined}
        right={
          <div className="shrink-0 text-right">
            <div
              className="font-[var(--font-f1)] text-base leading-none font-black"
              style={{ color: isPole ? "var(--color-sector-purple)" : "var(--color-text-primary)" }}
            >
              {best ?? "—"}
            </div>
            <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">{bestLabel}</div>
          </div>
        }
      />
      {expanded && <QualDetail result={r} isPole={isPole} season={season} qualDate={qualDate} />}
    </div>
  );
}

function QualDetail({ result: r, isPole, season, qualDate }: { result: QualifyingResult; isPole: boolean; season: string; qualDate: string }) {
  const sectorQuery = useQuery({
    queryKey: ["openf1-qualifying-sector", season, qualDate, r.driver.driverId],
    queryFn: () => fetchSectorDetail(season, qualDate, driverCode(r.driver)),
    staleTime: staleTime.immutable,
    enabled: qualDate.length > 0,
  });

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
      <div className="grid grid-cols-3 gap-2">
        <QSession label="Q1" time={r.q1} highlight={isPole && r.q2 == null && r.q3 == null} />
        <QSession label="Q2" time={r.q2} highlight={isPole && r.q3 == null && r.q2 != null} />
        <QSession label="Q3" time={r.q3} highlight={isPole && r.q3 != null} />
      </div>

      {qualDate && (
        <div className="mt-4 border-t border-(--color-divider) pt-4">
          {sectorQuery.isLoading ? (
            <p className="text-[11px] text-(--color-text-muted)">Loading sector times…</p>
          ) : sectorQuery.data ? (
            <>
              <div className="mb-2 text-[10px] font-bold tracking-[0.14em] text-(--color-text-muted)">SECTOR TIMES</div>
              <div className="grid grid-cols-3 gap-2">
                <SectorTile label="S1" value={sectorQuery.data.s1} />
                <SectorTile label="S2" value={sectorQuery.data.s2} />
                <SectorTile label="S3" value={sectorQuery.data.s3} />
              </div>
              {sectorQuery.data.speedTrap != null && (
                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <span className="font-bold text-(--color-text-muted)">SPEED TRAP</span>
                  <span className="font-bold">{sectorQuery.data.speedTrap} km/h</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function QSession({ label, time, highlight }: { label: string; time: string | null; highlight: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-(--color-surface-elevated) p-2 text-center">
      <div className="text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">{label}</div>
      <div
        className="mt-1 truncate font-[var(--font-f1)] text-sm font-black"
        style={{ color: highlight ? "var(--color-sector-purple)" : "var(--color-text-primary)" }}
      >
        {time ?? "—"}
      </div>
    </div>
  );
}

function SectorTile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-0 rounded-lg bg-(--color-surface-elevated) p-2 text-center">
      <div className="text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold">{value != null ? value.toFixed(3) : "—"}</div>
    </div>
  );
}

interface SectorDetail {
  s1: number | null;
  s2: number | null;
  s3: number | null;
  speedTrap: number | null;
}

/**
 * Ports openF1QualifyingProvider from standings_provider.dart: finds the
 * qualifying session by date, maps driver_number -> name_acronym, then
 * picks each driver's fastest flying lap (all 3 sectors valid, not a
 * pit-out lap) for its sector/speed-trap breakdown.
 */
async function fetchSectorDetail(season: string, qualDate: string, code: string): Promise<SectorDetail | null> {
  if (!qualDate) return null;
  const sessions = await getOpenF1Sessions(season);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (sessions as any[]).find((s) => String(s.date_start ?? "").startsWith(qualDate));
  if (!session) return null;
  const sessionKey = Number(session.session_key);

  const [drivers, laps] = await Promise.all([getOpenF1Drivers(sessionKey), getOpenF1Laps(sessionKey)]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const numberToCode = new Map<number, string>((drivers as any[]).map((d) => [Number(d.driver_number), String(d.name_acronym)]));

  let best: { s1: number; s2: number; s3: number; speed: number | null; duration: number } | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lap of laps as any[]) {
    if (lap.is_pit_out_lap === true) continue;
    const driverNum = Number(lap.driver_number);
    if (numberToCode.get(driverNum) !== code) continue;
    const s1 = lap.duration_sector_1 as number | null;
    const s2 = lap.duration_sector_2 as number | null;
    const s3 = lap.duration_sector_3 as number | null;
    if (s1 == null || s2 == null || s3 == null) continue;
    const duration = (lap.lap_duration as number | null) ?? s1 + s2 + s3;
    if (!best || duration < best.duration) {
      best = { s1, s2, s3, speed: (lap.st_speed as number | null) ?? null, duration };
    }
  }
  if (!best) return null;
  return { s1: best.s1, s2: best.s2, s3: best.s3, speedTrap: best.speed };
}
