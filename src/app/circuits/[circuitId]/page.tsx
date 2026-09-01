"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAllCircuits, getStatsForEntity, getEntityNames } from "@/lib/api/stats-api";
import { getCircuitDetail, circuitBasicField } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { circuitColor } from "@/lib/theme/colors";
import { TrackImage } from "@/components/shared/track-image";
import { forCircuit, type CircuitFacts } from "@/lib/models/circuit-facts";
import { circuitLiveStats } from "@/lib/models/circuit-stats";
import { CircuitRecords } from "@/components/circuits/circuit-records";
import { CareerFirstsCard, WinningGridSlotCard } from "@/components/circuits/circuit-firsts";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton } from "@/components/shared/skeleton";

/**
 * Ports circuit_guide_detail_screen.dart's `_Hero`/`_CharacterStrip`/
 * `_SpecsGrid`/`_LapRecordCard`/`_HistoryCard`/`_MomentTile`/`_AboutCard`
 * AND, for the ~52 circuits with no curated facts, `_PastCircuitScreen`
 * (Roadmap 3.5, extended after the user flagged real data was missing).
 *
 * The circuit's own live stats (`getStatsForEntity(circuitId)` —
 * fastest-lap/pit records, first/last season raced, race count, maiden
 * win/pole/podiums, winning-grid-slot distribution, and the Circuit
 * Records mini-leaderboards) are fetched **independently of Supabase**,
 * matching the Flutter architecture exactly: `entityStatsProvider` has no
 * Supabase dependency at all. The original web port had accidentally
 * coupled them — `getCircuitDetail()` returned `null` (and every caller
 * stopped there) the instant Supabase had no bio row, before it ever got
 * to computing lap/pit records from `computed_stats`. That silently
 * dropped real, live data behind an unrelated failure — worse, it was
 * *stale* data being dropped in favor of *older* curated-facts fallback
 * text (confirmed live: Monza's real fastest-lap-alltime is Norris,
 * 1:20.901, 2025 — newer than the curated fallback's Barrichello 2004
 * figure, which is what the coupled version was showing instead).
 *
 * `facts` (curated, current-era only) still layers under Supabase for
 * description/character tags/notable moments — that part's fine to keep
 * coupled, since neither source is "live" in the same sense.
 */
export default function CircuitDetailPage({ params }: { params: Promise<{ circuitId: string }> }) {
  const { circuitId } = use(params);
  const mounted = useMounted();

  const circuitQuery = useQuery({
    queryKey: ["circuit", circuitId],
    queryFn: async () => {
      const circuits = await getAllCircuits();
      return circuits.find((c) => c.circuit_id === circuitId) ?? null;
    },
    staleTime: staleTime.immutable,
  });

  const detailQuery = useQuery({
    queryKey: ["circuit-detail", circuitId],
    queryFn: () => getCircuitDetail(circuitId),
    staleTime: staleTime.daily,
  });

  const statsQuery = useQuery({
    queryKey: ["circuit-stats", circuitId],
    queryFn: () => getStatsForEntity(circuitId),
    staleTime: staleTime.immutable,
  });

  const namesQuery = useQuery({ queryKey: ["entity-names"], queryFn: getEntityNames, staleTime: staleTime.immutable });

  if (!mounted || circuitQuery.isLoading) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="h-[260px] w-full" />
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      </main>
    );
  }

  const circuit = circuitQuery.data;
  if (!circuit) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <p className="text-(--color-error)">Circuit not found.</p>
      </main>
    );
  }

  const detail = detailQuery.data;
  const rawStats = statsQuery.data ?? [];
  const names = namesQuery.data ?? {};
  const live = circuitLiveStats(rawStats, names);
  const locality = circuit.locality as string;
  const country = circuit.country as string;
  const facts = forCircuit(circuitId, locality, country);
  const accent = circuitColor(circuitId);
  const imageUrl = circuit.image_url as string | null;
  const isPastCircuit = !facts;

  const pick = (remote: string, local: string | undefined) => (remote ? remote : (local ?? ""));
  const km = pick(detail ? circuitBasicField(detail, 2) : "", facts?.lengthKm);
  const laps = pick(detail ? circuitBasicField(detail, 3) : "", facts?.laps);
  const turns = pick(detail ? circuitBasicField(detail, 4) : "", facts?.turns);
  const topSpeed = pick(detail ? circuitBasicField(detail, 5) : "", facts?.topSpeedKmh);
  const description = detail?.circuitDescription || facts?.description || "";

  const specs: [string, string][] = [];
  if (km) specs.push(["LENGTH", `${km} km`]);
  if (laps) specs.push(["RACE LAPS", laps]);
  if (turns) specs.push(["TURNS", turns]);
  if (topSpeed) specs.push(["TOP SPEED", `${topSpeed} km/h`]);

  // Live computed stats win — they're the freshest source. Curated facts
  // and Supabase are both static-content fallbacks behind them.
  const lapRecord = live.lapRecord ?? (detail && detail.fastestLaps.length > 0 ? detail.fastestLaps : facts?.lapRecord);
  const pitRecord = live.pitRecord ?? (detail && detail.fastestPit.length > 0 ? detail.fastestPit : undefined);

  const hasRecords = !!(rawStats.length || detail || facts);
  const statsLoaded = !statsQuery.isLoading;

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <Link href="/circuits" className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← Circuit Guide
      </Link>

      <div className="mx-auto max-w-3xl">
        <div
          className="relative overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-6"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 30%, transparent), var(--color-surface-elevated) 65%)` }}
        >
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 35%, transparent), transparent 70%)` }}
          />
          {imageUrl && (
            <div className="relative flex h-[260px] w-full items-center justify-center p-4">
              <TrackImage url={imageUrl} color="#ffffff" glow={accent} className="h-full w-full" />
            </div>
          )}
          {isPastCircuit && (
            <span
              className="relative inline-block rounded-full px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em] text-white"
              style={{ backgroundColor: accent }}
            >
              PAST CIRCUIT
            </span>
          )}
          <h1 className="relative mt-4 font-[var(--font-f1)] text-3xl font-black tracking-tight">{circuit.name as string}</h1>
          <p className="relative mt-1 text-[12px] font-bold tracking-[0.2em]" style={{ color: accent }}>
            {locality?.toUpperCase()}, {country?.toUpperCase()}
          </p>
          {facts && facts.character.length > 0 && (
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              {facts.character.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 text-[9px] font-black tracking-[0.1em]"
                  style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* Past circuits get no curated spec grid, so the season range + race
              count (from computed_stats, same as the Flutter _PastCircuitScreen
              hero) is the headline stat instead. */}
          {isPastCircuit && (live.firstGp || live.races != null) && (
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              {live.firstGp != null && (
                <div className="rounded-lg bg-(--color-surface) px-3 py-2">
                  <div className="font-[var(--font-f1)] text-lg font-black" style={{ color: accent }}>
                    {live.firstGp === live.lastGp ? live.firstGp : `${live.firstGp}–${live.lastGp}`}
                  </div>
                  <div className="text-[9px] font-bold tracking-[0.12em] text-(--color-text-muted)">ACTIVE YEARS</div>
                </div>
              )}
              {live.races != null && (
                <div className="rounded-lg bg-(--color-surface) px-3 py-2">
                  <div className="font-[var(--font-f1)] text-lg font-black" style={{ color: accent }}>
                    {live.races}
                  </div>
                  <div className="text-[9px] font-bold tracking-[0.12em] text-(--color-text-muted)">
                    {live.races === 1 ? "RACE HELD" : "RACES HELD"}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {(detailQuery.isLoading || statsQuery.isLoading) && (
          <div className="mt-6 flex flex-col gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}

        {hasRecords ? (
          <div className="mt-6 flex flex-col gap-6">
            {description && <p className="text-sm leading-relaxed text-(--color-text-secondary)">{description}</p>}

            {specs.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specs.map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-(--color-surface-elevated) p-4">
                    <div className="text-[9px] font-black tracking-[0.14em] text-(--color-text-muted)">{label}</div>
                    <div className="mt-1 font-[var(--font-f1)] text-xl font-black">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {(lapRecord || pitRecord) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lapRecord && <RecordCard title="LAP RECORD" values={lapRecord} accent="var(--color-sector-purple)" />}
                {pitRecord && <RecordCard title="FASTEST PIT · ALL-TIME" values={pitRecord} accent="var(--color-success)" />}
              </div>
            )}

            {facts && <CircuitNotes facts={facts} accent={accent} />}

            {statsLoaded && rawStats.length > 0 && (
              <div>
                <h2 className="mb-2 text-[10px] font-black tracking-[0.16em] text-(--color-text-muted)">CIRCUIT RECORDS</h2>
                <CircuitRecords circuitId={circuitId} accent={accent} names={names} />
              </div>
            )}

            {statsLoaded && <CareerFirstsCard stats={rawStats} accent={accent} names={names} />}
            {statsLoaded && <WinningGridSlotCard stats={rawStats} accent={accent} />}

            {facts && facts.notableMoments.length > 0 && (
              <div>
                <h2 className="mb-2 text-[10px] font-black tracking-[0.16em] text-(--color-text-muted)">NOTABLE MOMENTS</h2>
                <div className="flex flex-col gap-1.5">
                  {facts.notableMoments.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-(--color-surface-elevated) px-3 py-2.5 text-sm text-(--color-text-secondary)">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail && detail.circuitPodiums.length > 0 && (
              <div>
                <h2 className="mb-2 text-[10px] font-black tracking-[0.16em] text-(--color-text-muted)">RECENT PODIUMS</h2>
                <div className="flex flex-col gap-1">
                  {detail.circuitPodiums.map((p, i) => (
                    <div key={i} className="rounded-lg bg-(--color-surface-elevated) px-3 py-2 text-sm text-(--color-text-secondary)">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !detailQuery.isLoading &&
          !statsQuery.isLoading && <p className="mt-6 text-(--color-text-muted)">No extended guide for this circuit yet.</p>
        )}
      </div>
    </main>
  );
}

function RecordCard({ title, values, accent }: { title: string; values: [string, string, string] | string[]; accent: string }) {
  const [name, time, season] = values;
  return (
    <div className="rounded-xl bg-(--color-surface-elevated) p-4">
      <div className="text-[9px] font-black tracking-[0.14em]" style={{ color: accent }}>
        {title}
      </div>
      <div className="mt-2 font-[var(--font-f1)] text-lg font-bold">{name}</div>
      <div className="text-sm text-(--color-text-secondary)">
        {time} {season && season !== "-" && `· ${season}`}
      </div>
    </div>
  );
}

/** Ports the direction/type/designer/most-wins/overtaking-rating/best-sector strip. */
function CircuitNotes({ facts, accent }: { facts: CircuitFacts; accent: string }) {
  const notes: [string, string][] = [
    ["DIRECTION", facts.direction],
    ["TYPE", facts.type],
    ["BEST SECTOR", facts.bestSector],
    ["MOST WINS", facts.mostWins],
    ["DESIGNER", facts.designer],
    ["FIRST GP", String(facts.firstGp)],
  ];
  return (
    <div className="rounded-xl bg-(--color-surface-elevated) p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-black tracking-[0.16em] text-(--color-text-muted)">CIRCUIT NOTES</h2>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold tracking-[0.1em] text-(--color-text-muted)">OVERTAKING</span>
          <div className="flex gap-[3px]">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: n <= facts.overtakingRating ? accent : "var(--color-surface)" }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {notes.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[9px] font-bold tracking-[0.1em] text-(--color-text-muted)">{label}</div>
            <div className="truncate text-[13px] font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
