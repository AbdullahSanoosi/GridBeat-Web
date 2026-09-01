"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { raceDateTime, type F1Race } from "@/lib/models/schedule";

/**
 * Live countdown to lights out for the next round — real schedule data,
 * ticking every second. Rendered only after mount (the parent gates on
 * `useMounted`), so the server never emits a time that's already stale by
 * the time it reaches the browser.
 */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function parts(ms: number) {
  const clamped = Math.max(0, ms);
  return {
    d: Math.floor(clamped / 86_400_000),
    h: Math.floor(clamped / 3_600_000) % 24,
    m: Math.floor(clamped / 60_000) % 60,
    s: Math.floor(clamped / 1000) % 60,
  };
}

export function RaceCountdown({ race }: { race: F1Race }) {
  const target = raceDateTime(race).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = parts(target - now);
  const lightsOut = target - now <= 0;

  return (
    <section className="border-y border-white/10 bg-(--color-surface)">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-(--color-primary)" />
            <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.24em] text-(--color-primary)">
              NEXT RACE · ROUND {race.round}
            </span>
          </div>
          <h2 className="mt-1.5 truncate font-[var(--font-f1)] text-2xl font-bold sm:text-3xl">{race.raceName}</h2>
          <p className="mt-0.5 text-sm text-(--color-text-secondary)">
            {race.circuit.locality}, {race.circuit.country} · {dateFormatter.format(raceDateTime(race))}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {lightsOut ? (
            <span className="font-[var(--font-f1)] text-xl font-bold text-(--color-sector-green)">LIGHTS OUT</span>
          ) : (
            <>
              <Unit value={t.d} label="DAYS" />
              <Colon />
              <Unit value={t.h} label="HRS" />
              <Colon />
              <Unit value={t.m} label="MIN" />
              <Colon />
              <Unit value={t.s} label="SEC" accent />
            </>
          )}
          <Link
            href="/schedule"
            className="ml-1 hidden shrink-0 rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wide transition-colors hover:border-white/40 hover:bg-white/5 sm:inline-block"
          >
            Full calendar
          </Link>
        </div>
      </div>
    </section>
  );
}

function Unit({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div
        className="font-[var(--font-f1)] text-2xl font-bold tabular-nums sm:text-4xl"
        style={{ color: accent ? "var(--color-primary)" : "var(--color-text-primary)" }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-0.5 font-[var(--font-f1)] text-[8px] tracking-[0.18em] text-(--color-text-muted) sm:text-[9px]">
        {label}
      </div>
    </div>
  );
}

function Colon() {
  return <span className="-mt-3 font-[var(--font-f1)] text-xl text-white/20 sm:text-2xl">:</span>;
}
