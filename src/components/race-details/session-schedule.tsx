"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCircuitDetail, circuitBasicField } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { circuitColor } from "@/lib/theme/colors";
import { bundledCircuitImage } from "./circuit-asset";
import { hasTime, raceDateTime, sessionDateTime, type F1Race } from "@/lib/models/schedule";

/**
 * Ports _RaceDetailsBanner (350dp banner: round/date pills, race name,
 * circuit name, 4 circuit stats) + _SessionScheduleView's session list
 * (_SessionRow) from race_details_screen.dart. The SCHEDULE tab.
 */
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
const dateNumFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

export function RaceBanner({ race, round, onViewResults }: { race: F1Race; round: string; onViewResults?: () => void }) {
  const accent = circuitColor(race.circuit.circuitId);
  const img = bundledCircuitImage(race.circuit.circuitId);

  const detailQuery = useQuery({
    queryKey: ["circuit-detail", race.circuit.circuitId],
    queryFn: () => getCircuitDetail(race.circuit.circuitId),
    staleTime: staleTime.daily,
  });
  const detail = detailQuery.data;

  const fp1 = race.sessions.fp1 ? sessionDateTime(race.sessions.fp1) : null;
  const raceDate = raceDateTime(race);
  const dateStr = fp1 ? `${dayFmt.format(fp1)} - ${dayMonthFmt.format(raceDate)}` : dayMonthFmt.format(raceDate);

  const circuitName =
    race.circuit.circuitName && race.circuit.circuitName !== race.circuit.circuitId
      ? race.circuit.circuitName
      : race.circuit.locality;

  const stats: [string, string][] = [];
  if (detail) {
    const km = circuitBasicField(detail, 2);
    const laps = circuitBasicField(detail, 3);
    const turns = circuitBasicField(detail, 4);
    const topSpeed = circuitBasicField(detail, 5);
    if (km) stats.push([km, "KM"]);
    if (laps) stats.push([laps, "LAPS"]);
    if (turns) stats.push([turns, "TURNS"]);
    if (topSpeed) stats.push([topSpeed, "TOP SPEED"]);
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background: `linear-gradient(to bottom, var(--color-background), color-mix(in srgb, ${accent} 35%, transparent), var(--color-background))`,
      }}
    >
      {img && (
        <div className="pointer-events-none absolute top-0 right-[-20px] bottom-[60px] w-[200px] opacity-[0.28]">
          <Image src={img} alt="" fill sizes="200px" className="object-contain" />
        </div>
      )}
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-(--color-surface-elevated) px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.16em] text-(--color-text-secondary)">
          ROUND {round}
        </span>
        <span
          className="rounded-full px-3 py-1 font-[var(--font-f1)] text-[10px] font-extrabold tracking-[0.14em]"
          style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
        >
          {dateStr.toUpperCase()}
        </span>
      </div>

      <h1 className="relative mt-3 truncate font-[var(--font-f1)] text-3xl leading-none font-bold tracking-tight">
        {race.raceName.replace("Grand Prix", "GP")}
      </h1>
      <p
        className="relative mt-[3px] truncate text-[11px] font-bold tracking-[0.2em]"
        style={{ color: accent }}
      >
        {circuitName.toUpperCase()}
      </p>

      {stats.length > 0 && (
        <div className="relative mt-3 grid grid-cols-4 gap-2">
          {stats.map(([value, label]) => (
            <div key={label} className="min-w-0 rounded-lg bg-(--color-surface-elevated) px-2 py-2">
              <div className="truncate font-[var(--font-f1)] text-lg leading-none font-black">{value}</div>
              <div className="mt-[3px] truncate text-[9px] font-extrabold tracking-[0.14em]" style={{ color: accent }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {onViewResults && (
        <div className="relative mt-3 flex justify-end">
          <button
            onClick={onViewResults}
            className="rounded-full px-4 py-2 font-[var(--font-f1)] text-[11px] font-bold tracking-wider text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            VIEW RESULTS
          </button>
        </div>
      )}
    </div>
  );
}

export function SessionScheduleView({
  race,
  round,
  onViewResults,
}: {
  race: F1Race;
  round: string;
  onViewResults?: () => void;
}) {
  const s = race.sessions;
  const isSprint = s.sprint != null;

  // Session order matches Oversteer's CalendarListItem.kt: sprint weekends
  // run FP1 -> Sprint Qualifying -> Sprint -> Qualifying -> Race; normal
  // weekends run FP1 -> FP2 -> FP3 -> Qualifying -> Race.
  const sessions: { name: string; at: Date; timed: boolean }[] = [];
  if (s.fp1) sessions.push({ name: "Practice 1", at: sessionDateTime(s.fp1), timed: hasTime(s.fp1) });
  if (isSprint) {
    if (s.sprintQualifying)
      sessions.push({ name: "Sprint Qualifying", at: sessionDateTime(s.sprintQualifying), timed: hasTime(s.sprintQualifying) });
    if (s.sprint) sessions.push({ name: "Sprint Race", at: sessionDateTime(s.sprint), timed: hasTime(s.sprint) });
  } else {
    if (s.fp2) sessions.push({ name: "Practice 2", at: sessionDateTime(s.fp2), timed: hasTime(s.fp2) });
    if (s.fp3) sessions.push({ name: "Practice 3", at: sessionDateTime(s.fp3), timed: hasTime(s.fp3) });
  }
  if (s.qualifying) sessions.push({ name: "Qualifying", at: sessionDateTime(s.qualifying), timed: hasTime(s.qualifying) });
  sessions.push({ name: "Race", at: raceDateTime(race), timed: !!race.time });

  const [now] = useState(() => Date.now());

  return (
    <div className="flex flex-col gap-4">
      <RaceBanner race={race} round={round} onViewResults={onViewResults} />
      {sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-(--color-text-secondary)">Session times not yet available</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((sess) => {
            const past = sess.at.getTime() < now;
            return (
              <div
                key={sess.name}
                className="flex items-center gap-3 rounded-xl bg-(--color-surface-elevated) px-4 py-3"
                style={{ opacity: past ? 0.55 : 1 }}
              >
                <div className="w-11 shrink-0">
                  <div className="font-[var(--font-f1)] text-[22px] leading-none font-black">
                    {dateNumFmt.format(sess.at)}
                  </div>
                  <div className="mt-[1px] text-[10px] font-bold tracking-[0.16em] text-(--color-text-muted)">
                    {monthFmt.format(sess.at).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1 truncate text-[16px] font-semibold tracking-tight">{sess.name}</div>
                <div
                  className="shrink-0 font-[var(--font-f1)] text-lg leading-none font-extrabold"
                  style={{ color: past ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
                >
                  {sess.timed ? timeFmt.format(sess.at) : "TBD"}
                </div>
                {past && <Check className="h-3.5 w-3.5 shrink-0 text-(--color-text-muted)" aria-label="Completed" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
