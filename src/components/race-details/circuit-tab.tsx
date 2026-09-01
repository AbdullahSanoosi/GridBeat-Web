"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAllCircuits } from "@/lib/api/stats-api";
import { getCircuitDetail, circuitBasicField } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { circuitColor } from "@/lib/theme/colors";
import { TrackImage } from "@/components/shared/track-image";

/**
 * Ports _CircuitDetailView from race_details_screen.dart — a compact
 * preview (network SVG, name, spec chips) linking out to the full Circuit
 * Guide at /circuits/:circuitId, rather than duplicating that page's own
 * long scroll here. This is the one tab that intentionally uses the
 * network SVG (image_url) instead of the bundled banner artwork — see
 * ../gridbeat/CLAUDE.md's "durable boundary" note.
 */
export function CircuitTab({ circuitId, locality, country }: { circuitId: string; locality: string; country: string }) {
  const accent = circuitColor(circuitId);

  const circuitsQuery = useQuery({
    queryKey: ["all-circuits"],
    queryFn: getAllCircuits,
    staleTime: staleTime.immutable,
  });
  const detailQuery = useQuery({
    queryKey: ["circuit-detail", circuitId],
    queryFn: () => getCircuitDetail(circuitId),
    staleTime: staleTime.daily,
  });

  const circuitRow = circuitsQuery.data?.find((c) => c.circuit_id === circuitId);
  const imageUrl = (circuitRow?.image_url as string | null) ?? null;
  const detail = detailQuery.data;

  const name = (circuitRow?.name as string | undefined) || locality;
  const specs: [string, string][] = [];
  if (country) specs.push(["COUNTRY", country]);
  if (locality) specs.push(["CITY", locality]);
  if (detail) {
    const km = circuitBasicField(detail, 2);
    const laps = circuitBasicField(detail, 3);
    const turns = circuitBasicField(detail, 4);
    const topSpeed = circuitBasicField(detail, 5);
    if (km) specs.push(["LENGTH", `${km} km`]);
    if (laps) specs.push(["RACE LAPS", laps]);
    if (turns) specs.push(["TURNS", turns]);
    if (topSpeed) specs.push(["TOP SPEED", `${topSpeed} km/h`]);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-(--color-surface-elevated)">
      {imageUrl && (
        <div
          className="relative flex h-[180px] w-full items-center justify-center overflow-hidden p-6"
          style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${accent} 22%, transparent), var(--color-surface-elevated))` }}
        >
          <TrackImage url={imageUrl} color="#ffffff" glow={accent} className="h-full w-full" />
        </div>
      )}
      <div className="p-5">
        <h2 className="font-[var(--font-f1)] text-xl font-black">{name.toUpperCase()}</h2>
        {country && (
          <p className="mt-[2px] text-[11px] font-extrabold tracking-wide" style={{ color: accent }}>
            {country}
          </p>
        )}
        {specs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {specs.slice(0, 4).map(([label, value]) => (
              <span
                key={label}
                className="rounded-md bg-(--color-surface) px-3 py-1.5 text-[10px] font-bold text-(--color-text-secondary)"
              >
                {label}: {value}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/circuits/${circuitId}`}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-[var(--font-f1)] text-[11px] font-extrabold tracking-[0.14em] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          OPEN CIRCUIT GUIDE
        </Link>
      </div>
    </div>
  );
}
