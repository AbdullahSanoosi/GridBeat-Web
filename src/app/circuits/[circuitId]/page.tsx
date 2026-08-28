"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAllCircuits } from "@/lib/api/stats-api";
import { getCircuitDetail, circuitBasicField } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";

export default function CircuitDetailPage({
  params,
}: {
  params: Promise<{ circuitId: string }>;
}) {
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

  if (!mounted || circuitQuery.isLoading) {
    return (
      <main className="flex-1 px-8 py-8">
        <p className="text-(--color-text-secondary)">Loading circuit…</p>
      </main>
    );
  }

  const circuit = circuitQuery.data;
  if (!circuit) {
    return (
      <main className="flex-1 px-8 py-8">
        <p className="text-(--color-error)">Circuit not found.</p>
      </main>
    );
  }

  const detail = detailQuery.data;

  return (
    <main className="flex-1 px-8 py-8">
      <Link href="/circuits" className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← Circuit Guide
      </Link>
      <h1 className="mb-1 font-[var(--font-f1)] text-2xl font-bold">{circuit.name as string}</h1>
      <p className="mb-6 text-(--color-text-secondary)">
        {circuit.locality as string}, {circuit.country as string}
      </p>

      {detailQuery.isLoading && <p className="text-(--color-text-secondary)">Loading details…</p>}

      {detail ? (
        <div className="flex flex-col gap-6">
          {detail.circuitDescription && (
            <p className="max-w-3xl text-sm leading-relaxed text-(--color-text-secondary)">
              {detail.circuitDescription}
            </p>
          )}

          {detail.circuitBasicInfo.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Length" value={circuitBasicField(detail, 2)} />
              <Stat label="Laps" value={circuitBasicField(detail, 3)} />
              <Stat label="Turns" value={circuitBasicField(detail, 4)} />
              <Stat label="Top Speed" value={circuitBasicField(detail, 5)} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.fastestLaps.length > 0 && (
              <RecordCard title="Fastest Lap (All-Time)" values={detail.fastestLaps} />
            )}
            {detail.fastestPit.length > 0 && (
              <RecordCard title="Fastest Pit Stop (All-Time)" values={detail.fastestPit} />
            )}
          </div>

          {detail.circuitPodiums.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-bold tracking-widest text-(--color-text-muted)">
                RECENT PODIUMS
              </h2>
              <ul className="flex flex-col gap-1 text-sm text-(--color-text-secondary)">
                {detail.circuitPodiums.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        !detailQuery.isLoading && (
          <p className="text-(--color-text-muted)">No extended guide for this circuit yet.</p>
        )
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
      <div className="text-xs text-(--color-text-muted)">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value || "—"}</div>
    </div>
  );
}

function RecordCard({ title, values }: { title: string; values: string[] }) {
  const [name, time, season] = values;
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
      <div className="text-xs font-bold tracking-widest text-(--color-text-muted)">{title}</div>
      <div className="mt-2 text-lg font-semibold">{name}</div>
      <div className="text-sm text-(--color-text-secondary)">
        {time} {season && `· ${season}`}
      </div>
    </div>
  );
}

