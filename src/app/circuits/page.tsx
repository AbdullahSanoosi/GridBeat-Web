"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAllCircuits, getSchedule, getComputedStats } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { circuitColor } from "@/lib/theme/colors";
import { TrackImage } from "@/components/shared/track-image";
import { ALL_CIRCUIT_FACTS, forCircuit } from "@/lib/models/circuit-facts";
import { buildPastCircuits, type PastCircuit } from "@/lib/models/circuit-stats";
import { isUpcoming, raceFromRow } from "@/lib/models/schedule";
import { useMounted } from "@/hooks/use-mounted";
import type { Row } from "@/lib/api/types";

/**
 * Ports circuit_guide_screen.dart in full: `_FeaturedHero` (next race,
 * circuit facts + character tags), `_FilterRow` (character-tag filter
 * chips over the curated set), and `_PastCircuitsSection` (Roadmap 3.4,
 * extended after the user flagged the page was missing real data).
 *
 * The CALENDAR/PAST split is **curated vs. not** (in `circuit-facts.ts`'s
 * 26 circuits, or not) — not "on this season's schedule", which is what
 * this page originally used. Those aren't the same set: a curated circuit
 * can be absent from a given year's calendar (rotation, a one-off venue
 * change) without losing its hand-written facts, and the Flutter source
 * confirms this directly — `pastCircuitsProvider` filters against
 * `CircuitFacts.all`'s ids, never against the schedule.
 */
const FILTERS = [
  { key: "all", label: "ALL" },
  { key: "street", label: "STREET" },
  { key: "highSpeed", label: "HIGH-SPEED" },
  { key: "technical", label: "TECHNICAL" },
  { key: "flowing", label: "FLOWING" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(character: string[], filter: FilterKey): boolean {
  if (filter === "all") return true;
  const tags = character.map((t) => t.toUpperCase());
  switch (filter) {
    case "street":
      return tags.some((t) => t.includes("STREET"));
    case "highSpeed":
      return tags.some((t) => t.includes("HIGH-SPEED") || t.includes("ULTRA-HIGH"));
    case "technical":
      return tags.some((t) => t.includes("TECHNICAL"));
    case "flowing":
      return tags.some((t) => t.includes("FLOWING"));
  }
}

export default function CircuitGuidePage() {
  const mounted = useMounted();
  const [filter, setFilter] = useState<FilterKey>("all");

  const query = useQuery({
    queryKey: ["circuits-index-v2", config.currentSeason],
    queryFn: async () => {
      const [circuits, schedule, firstGp, lastGp, gps] = await Promise.all([
        getAllCircuits(),
        getSchedule(config.currentSeason),
        getComputedStats({ metricKey: "first_gp", entityType: "circuit", limit: 200 }),
        getComputedStats({ metricKey: "last_gp", entityType: "circuit", limit: 200 }),
        getComputedStats({ metricKey: "gps", entityType: "circuit", limit: 200 }),
      ]);
      const curatedIds = new Set(ALL_CIRCUIT_FACTS.map((f) => f.circuitId));
      const calendar = circuits.filter((c) => curatedIds.has(c.circuit_id as string));
      const past = buildPastCircuits(circuits, curatedIds, firstGp, lastGp, gps);
      const nextRace = schedule.map(raceFromRow).find(isUpcoming) ?? null;
      return { calendar, past, total: circuits.length, nextRace };
    },
    staleTime: staleTime.currentSeason,
  });

  const calendar = query.data?.calendar ?? [];
  const filtered = calendar.filter((c) => matchesFilter(forCircuit(c.circuit_id as string)?.character ?? [], filter));

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-[var(--font-f1)] text-2xl font-bold">Circuit Guide</h1>
      <p className="mb-6 text-sm text-(--color-text-secondary)">
        {mounted && query.data ? `${query.data.total} circuits` : "Every venue F1 has raced at"}
      </p>

      {!mounted || query.isLoading ? (
        <p className="text-(--color-text-secondary)">Loading circuits…</p>
      ) : query.isError ? (
        <p className="text-(--color-error)">
          Failed to load circuits: {query.error instanceof Error ? query.error.message : String(query.error)}
        </p>
      ) : (
        query.data && (
          <>
            {query.data.nextRace && <FeaturedHero race={query.data.nextRace} />}

            <div className="mb-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="rounded-full px-4 py-1.5 font-[var(--font-f1)] text-[10px] font-black tracking-[0.1em] transition-colors"
                  style={{
                    backgroundColor: filter === f.key ? "var(--color-primary)" : "var(--color-surface-elevated)",
                    color: filter === f.key ? "white" : "var(--color-text-secondary)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Section title={`${config.currentSeason} CALENDAR`} circuits={filtered} />
            {query.data.past.length > 0 && <PastSection circuits={query.data.past} />}
          </>
        )
      )}
    </main>
  );
}

function FeaturedHero({ race }: { race: ReturnType<typeof raceFromRow> }) {
  const circuitId = race.circuit.circuitId;
  const accent = circuitColor(circuitId);
  const facts = forCircuit(circuitId, race.circuit.locality, race.circuit.country);

  const circuitsQuery = useQuery({
    queryKey: ["all-circuits"],
    queryFn: getAllCircuits,
    staleTime: staleTime.immutable,
  });
  const imageUrl = circuitsQuery.data?.find((c) => c.circuit_id === circuitId)?.image_url as string | undefined;

  return (
    <Link
      href={`/circuits/${circuitId}`}
      className="relative mb-6 block h-[220px] overflow-hidden rounded-2xl bg-(--color-surface-elevated)"
      style={{ border: `1px solid color-mix(in srgb, ${accent} 32%, transparent)` }}
    >
      <div
        className="pointer-events-none absolute right-[-60px] bottom-[-60px] h-[220px] w-[220px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 50%, transparent), transparent)` }}
      />
      {imageUrl && (
        <div className="pointer-events-none absolute top-5 right-[-20px] h-[180px] w-[220px] opacity-[0.85]">
          <TrackImage url={imageUrl} color="#ffffff" className="h-full w-full" />
        </div>
      )}
      <div className="relative flex h-full flex-col p-5">
        <span
          className="inline-block w-fit rounded-full px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em] text-white"
          style={{ backgroundColor: accent }}
        >
          NEXT UP · R{race.round}
        </span>
        <div className="flex-1" />
        {facts && (
          <div className="text-[10px] font-black tracking-[0.2em]" style={{ color: accent }}>
            {facts.country.toUpperCase()}
          </div>
        )}
        <h2 className="mt-1 max-w-[70%] font-[var(--font-f1)] text-[26px] leading-tight font-black tracking-tight">
          {race.raceName.replace("Grand Prix", "GP").toUpperCase()}
        </h2>
        {facts && facts.character.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {facts.character.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[9px] font-black tracking-[0.1em]"
                style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="absolute right-4 bottom-4 text-(--color-text-primary)">→</span>
    </Link>
  );
}

function Section({ title, circuits }: { title: string; circuits: Row[] }) {
  if (circuits.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-[var(--font-f1)] text-[11px] font-black tracking-[0.16em] text-(--color-text-muted)">
        {title} · {circuits.length}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {circuits.map((circuit) => (
          <CircuitCard key={circuit.circuit_id as string} circuit={circuit} />
        ))}
      </div>
    </section>
  );
}

function CircuitCard({ circuit }: { circuit: Row }) {
  const id = circuit.circuit_id as string;
  const accent = circuitColor(id);
  const imageUrl = circuit.image_url as string | null;

  return (
    <Link
      href={`/circuits/${id}`}
      className="flex items-center gap-3 rounded-xl bg-(--color-surface-elevated) p-3 transition-colors hover:bg-(--color-surface)"
    >
      <div className="h-11 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black tracking-[0.14em]" style={{ color: accent }}>
          {(circuit.country as string)?.toUpperCase()}
        </div>
        <div className="mt-[2px] truncate font-[var(--font-f1)] text-[16px] font-extrabold tracking-tight">
          {circuit.name as string}
        </div>
        <div className="mt-[1px] truncate text-[11px] text-(--color-text-muted)">{circuit.locality as string}</div>
      </div>
      {imageUrl && (
        <div className="relative hidden h-12 w-16 shrink-0 opacity-90 sm:block">
          <TrackImage url={imageUrl} color="#ffffff" className="h-full w-full" />
        </div>
      )}
    </Link>
  );
}

function PastSection({ circuits }: { circuits: PastCircuit[] }) {
  return (
    <section className="mb-8">
      <div className="mb-1 flex items-center gap-3">
        <h2 className="font-[var(--font-f1)] text-[11px] font-black tracking-[0.2em] text-(--color-text-muted)">
          PAST CIRCUITS
        </h2>
        <div className="h-px flex-1 bg-(--color-divider)" />
      </div>
      <p className="mb-3 text-[10px] text-(--color-text-muted)">{circuits.length} venues no longer on the calendar</p>
      <div className="flex flex-col gap-2">
        {circuits.map((c) => (
          <PastCircuitRow key={c.circuitId} circuit={c} />
        ))}
      </div>
    </section>
  );
}

function PastCircuitRow({ circuit }: { circuit: PastCircuit }) {
  const accent = circuitColor(circuit.circuitId);
  return (
    <Link
      href={`/circuits/${circuit.circuitId}`}
      className="flex items-center gap-3 rounded-xl bg-(--color-surface-elevated) px-4 py-3 transition-colors hover:bg-(--color-surface)"
    >
      {circuit.imageUrl && (
        <div className="relative hidden h-10 w-12 shrink-0 opacity-90 sm:block">
          <TrackImage url={circuit.imageUrl} color="#ffffff" className="h-full w-full" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{circuit.name}</div>
        <div className="truncate text-[10px] text-(--color-text-muted)">
          {[circuit.city, circuit.country].filter(Boolean).join(", ")}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-[var(--font-f1)] text-[12px] font-extrabold" style={{ color: accent }}>
          {circuit.firstSeason === circuit.lastSeason ? circuit.firstSeason : `${circuit.firstSeason}–${circuit.lastSeason}`}
        </div>
        <div className="text-[9px] text-(--color-text-muted)">{circuit.races === 1 ? "1 race" : `${circuit.races} races`}</div>
      </div>
      <span className="shrink-0 text-(--color-text-muted)">›</span>
    </Link>
  );
}
