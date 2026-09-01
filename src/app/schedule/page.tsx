"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSchedule, getAllCircuits } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { circuitColor } from "@/lib/theme/colors";
import { bundledCircuitImage } from "@/components/race-details/circuit-asset";
import {
  allSessions,
  isUpcoming,
  nextSession,
  raceDateTime,
  raceFromRow,
  sessionDateTime,
  type F1Race,
} from "@/lib/models/schedule";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Ports schedule_screen.dart's _NextRaceHero (round/date pill, live
 * countdown, circuit backdrop) + _CalendarTile (circuit-color accent,
 * date column, round/COMPLETED/SPRINT badges, circuit thumbnail) — this
 * page was previously a generic bordered box and a plain HTML table with
 * none of that (Roadmap 3.1).
 */
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });

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
  const circuitsQuery = useQuery({
    queryKey: ["all-circuits"],
    queryFn: getAllCircuits,
    staleTime: staleTime.immutable,
  });
  const circuitImages = new Map(
    (circuitsQuery.data ?? []).map((c) => [c.circuit_id as string, c.image_url as string | null]),
  );

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="mb-6 font-[var(--font-f1)] text-2xl font-bold">{config.currentSeason} Schedule</h1>

      {!mounted || isLoading ? (
        <p className="text-(--color-text-secondary)">Loading schedule…</p>
      ) : isError ? (
        <p className="text-(--color-error)">
          Failed to load schedule: {error instanceof Error ? error.message : String(error)}
        </p>
      ) : (
        data && (
          <>
            <NextRaceHero races={data} circuitImages={circuitImages} />
            <CalendarList races={data} circuitImages={circuitImages} />
          </>
        )
      )}
    </main>
  );
}

function parts(ms: number) {
  const clamped = Math.max(0, ms);
  return {
    d: Math.floor(clamped / 86_400_000),
    h: Math.floor(clamped / 3_600_000) % 24,
    m: Math.floor(clamped / 60_000) % 60,
    s: Math.floor(clamped / 1000) % 60,
  };
}

function NextRaceHero({ races, circuitImages }: { races: F1Race[]; circuitImages: Map<string, string | null> }) {
  const next = races.find(isUpcoming);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!next) return null;

  const accent = circuitColor(next.circuit.circuitId);
  const bundled = bundledCircuitImage(next.circuit.circuitId);
  const networkImg = bundled ? null : (circuitImages.get(next.circuit.circuitId) ?? null);
  const isSprint = next.sessions.sprint != null;

  // Counts down to the next SESSION on the calendar, not just Sunday's
  // race — through a Friday, FP1 is what's actually next, matching
  // nextSession()'s own doc comment.
  const upcoming = nextSession(races, new Date(now));
  const t = upcoming ? parts(upcoming.at.getTime() - now) : null;

  const fp1 = next.sessions.fp1 ? sessionDateTime(next.sessions.fp1) : null;
  const raceDate = raceDateTime(next);
  const dateRange = fp1 ? `${dayFmt.format(fp1)} - ${dayMonthFmt.format(raceDate)}` : dayMonthFmt.format(raceDate);

  return (
    <Link
      href={`/race-details/${next.season}-${next.round}`}
      className="relative mb-8 block overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-6 transition-colors hover:bg-(--color-surface)"
    >
      <div
        className="pointer-events-none absolute top-[-80px] right-[-80px] h-[240px] w-[240px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 30%, transparent), transparent)` }}
      />
      {(bundled || networkImg) && (
        <div className="pointer-events-none absolute top-5 right-[-30px] bottom-5 w-[220px] opacity-[0.08]">
          {bundled ? (
            <Image src={bundled} alt="" fill sizes="220px" className="object-contain" />
          ) : (
            // Remote SVG — plain <img>, see circuit-tab.tsx's note on why next/image can't be used here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={networkImg!} alt="" className="h-full w-full object-contain" />
          )}
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-(--color-surface) px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.16em] text-(--color-text-secondary)">
          ROUND {next.round}
        </span>
        <span className="rounded-full bg-(--color-surface) px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.14em] text-(--color-text-secondary)">
          {dateRange.toUpperCase()}
        </span>
        {isSprint && (
          <span
            className="rounded-full px-3 py-1 font-[var(--font-f1)] text-[10px] font-extrabold tracking-[0.14em]"
            style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
          >
            SPRINT WEEKEND
          </span>
        )}
      </div>

      <h2 className="relative mt-4 max-w-2xl truncate font-[var(--font-f1)] text-3xl leading-none font-bold tracking-tight sm:text-[32px]">
        {next.raceName.replace("Grand Prix", "GP")}
      </h2>
      <p className="relative mt-1.5 text-[12px] font-bold tracking-[0.24em]" style={{ color: accent }}>
        {next.circuit.locality.toUpperCase()}
      </p>

      {upcoming && t ? (
        <div className="relative mt-5">
          <div className="flex items-center gap-2">
            <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.16em] text-(--color-text-muted)">
              NEXT SESSION
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-(--color-text-muted)" />
            <span
              className="font-[var(--font-f1)] text-[11px] font-extrabold tracking-[0.14em]"
              style={{ color: accent }}
            >
              {upcoming.name.toUpperCase()}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <CdUnit value={t.d} label="DAYS" color={accent} />
            <CdUnit value={t.h} label="HOURS" color={accent} />
            <CdUnit value={t.m} label="MIN" color={accent} />
            <CdUnit value={t.s} label="SEC" color={accent} />
          </div>
        </div>
      ) : (
        <p className="relative mt-5 font-[var(--font-f1)] text-xs font-black tracking-[0.14em]" style={{ color: accent }}>
          RACE COMPLETED
        </p>
      )}

      <div className="relative mt-5 flex justify-end">
        <span
          className="flex items-center gap-1 rounded-full px-4 py-2 font-[var(--font-f1)] text-[11px] font-extrabold tracking-[0.12em]"
          style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 22%, transparent)` }}
        >
          VIEW SCHEDULE →
        </span>
      </div>
    </Link>
  );
}

function CdUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-(--color-surface) px-2 py-2 text-center">
      <div className="font-[var(--font-f1)] text-xl leading-none font-black tabular-nums" style={{ color }}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">{label}</div>
    </div>
  );
}

function CalendarList({ races, circuitImages }: { races: F1Race[]; circuitImages: Map<string, string | null> }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      {races.map((race) => {
        const upcoming = isUpcoming(race);
        const isSprint = race.sessions.sprint != null;
        const accent = circuitColor(race.circuit.circuitId);
        const bundled = bundledCircuitImage(race.circuit.circuitId);
        const networkImg = bundled ? null : (circuitImages.get(race.circuit.circuitId) ?? null);
        const date = raceDateTime(race);

        return (
          <div
            key={race.round}
            onClick={() => router.push(`/race-details/${race.season}-${race.round}`)}
            className="flex cursor-pointer items-center gap-3 rounded-xl bg-(--color-surface-elevated) p-3 transition-colors hover:bg-(--color-surface)"
            style={{ opacity: upcoming ? 1 : 0.6 }}
          >
            <div className="h-14 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
            <div className="w-10 shrink-0 text-center">
              <div className="font-[var(--font-f1)] text-xl leading-none font-black">{dayFmt.format(date)}</div>
              <div className="mt-1 text-[9px] font-bold tracking-[0.14em]" style={{ color: accent }}>
                {monthFmt.format(date).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-[0.1em] text-(--color-text-muted)">
                  R{race.round}
                </span>
                {!upcoming && (
                  <>
                    <span className="h-[3px] w-[3px] rounded-full bg-(--color-text-muted)" />
                    <span className="text-[9px] font-bold tracking-[0.1em] text-(--color-text-muted)">
                      COMPLETED
                    </span>
                  </>
                )}
                {isSprint && (
                  <span
                    className="rounded px-1.5 py-[1px] text-[8px] font-black tracking-wide"
                    style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
                  >
                    SPRINT
                  </span>
                )}
              </div>
              <div className="truncate text-[15px] font-semibold tracking-tight">
                {race.raceName.replace("Grand Prix", "GP")}
              </div>
              <div className="truncate text-[11px] text-(--color-text-muted)">
                {race.circuit.locality}, {race.circuit.country} · {allSessions(race.sessions).length + 1} sessions
              </div>
            </div>
            {(bundled || networkImg) && (
              <div className="relative hidden h-12 w-12 shrink-0 sm:block">
                {bundled ? (
                  <Image src={bundled} alt="" fill sizes="48px" className="object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={networkImg!} alt="" className="h-full w-full object-contain" />
                )}
              </div>
            )}
            <span className="shrink-0 text-(--color-text-muted)">›</span>
          </div>
        );
      })}
    </div>
  );
}
