"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDriverHallOfFame, getConstructorHallOfFame } from "@/lib/models/hall-of-fame";
import { staleTime } from "@/lib/query/ttl";
import { useMounted } from "@/hooks/use-mounted";
import type { HallOfFameDriver, HallOfFameConstructor } from "@/lib/models/hall-of-fame";

type Tab = "drivers" | "constructors";

export default function HallOfFamePage() {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("drivers");

  const drivers = useQuery({
    queryKey: ["hof-drivers"],
    queryFn: getDriverHallOfFame,
    staleTime: staleTime.currentSeason,
    enabled: tab === "drivers",
  });

  const constructors = useQuery({
    queryKey: ["hof-constructors"],
    queryFn: getConstructorHallOfFame,
    staleTime: staleTime.currentSeason,
    enabled: tab === "constructors",
  });

  const active = tab === "drivers" ? drivers : constructors;

  return (
    <main className="flex-1 px-8 py-8">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">Hall of Fame</h1>
        <div className="flex rounded-full border border-(--color-border) p-1">
          <TabButton active={tab === "drivers"} onClick={() => setTab("drivers")}>
            Drivers
          </TabButton>
          <TabButton active={tab === "constructors"} onClick={() => setTab("constructors")}>
            Constructors
          </TabButton>
        </div>
      </div>
      <p className="mb-6 text-sm text-(--color-text-secondary)">
        Every {tab === "drivers" ? "driver" : "constructor"} on record since 1950
      </p>

      {!mounted || active.isLoading ? (
        <p className="text-(--color-text-secondary)">Loading…</p>
      ) : active.isError ? (
        <p className="text-(--color-error)">
          Failed to load: {active.error instanceof Error ? active.error.message : String(active.error)}
        </p>
      ) : tab === "drivers" ? (
        <DriverTable rows={drivers.data ?? []} />
      ) : (
        <ConstructorTable rows={constructors.data ?? []} />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-(--color-primary) text-(--color-on-secondary)"
          : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
      }`}
    >
      {children}
    </button>
  );
}

function DriverTable({ rows }: { rows: HallOfFameDriver[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="px-4 py-3 font-medium">Nationality</th>
            <th className="px-4 py-3 text-right font-medium">Titles</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Podiums</th>
            <th className="px-4 py-3 text-right font-medium">Poles</th>
            <th className="px-4 py-3 text-right font-medium">DNFs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.driverId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 text-(--color-text-secondary)">{r.nationality || "—"}</td>
              <td className="px-4 py-3 text-right">{r.titles > 0 ? r.titles : "—"}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.wins}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.podiums}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.poles}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.dnfs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConstructorTable({ rows }: { rows: HallOfFameConstructor[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Constructor</th>
            <th className="px-4 py-3 text-right font-medium">Titles</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Podiums</th>
            <th className="px-4 py-3 text-right font-medium">Poles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.constructorId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3 text-right">{r.titles > 0 ? r.titles : "—"}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.wins}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.podiums}</td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{r.poles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
