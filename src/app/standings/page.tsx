"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/stats-api";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { teamColor } from "@/lib/theme/colors";
import { useMounted } from "@/hooks/use-mounted";
import {
  driverFullName,
  driverStandingFromRow,
  constructorStandingFromRow,
  type DriverStanding,
  type ConstructorStanding,
} from "@/lib/models/standings";

type Tab = "drivers" | "constructors";

export default function StandingsPage() {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("drivers");

  const drivers = useQuery({
    queryKey: ["driver-standings", config.currentSeason],
    queryFn: async () => (await getDriverStandings(config.currentSeason)).map(driverStandingFromRow),
    staleTime: staleTime.standings,
  });

  const constructors = useQuery({
    queryKey: ["constructor-standings", config.currentSeason],
    queryFn: async () =>
      (await getConstructorStandings(config.currentSeason)).map(constructorStandingFromRow),
    staleTime: staleTime.standings,
  });

  const active = tab === "drivers" ? drivers : constructors;

  return (
    <main className="flex-1 px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">
          {config.currentSeason} Standings
        </h1>
        <div className="flex rounded-full border border-(--color-border) p-1">
          <TabButton active={tab === "drivers"} onClick={() => setTab("drivers")}>
            Drivers
          </TabButton>
          <TabButton active={tab === "constructors"} onClick={() => setTab("constructors")}>
            Constructors
          </TabButton>
        </div>
      </div>

      {!mounted || active.isLoading ? (
        <p className="text-(--color-text-secondary)">Loading standings…</p>
      ) : active.isError ? (
        <p className="text-(--color-error)">
          Failed to load standings:{" "}
          {active.error instanceof Error ? active.error.message : String(active.error)}
        </p>
      ) : tab === "drivers" ? (
        <DriverStandingsTable rows={drivers.data ?? []} />
      ) : (
        <ConstructorStandingsTable rows={constructors.data ?? []} />
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

function DriverStandingsTable({ rows }: { rows: DriverStanding[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.driver.driverId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{row.position}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/driver/${row.driver.driverId}`} className="hover:text-(--color-primary)">
                  {driverFullName(row.driver)}
                </Link>
              </td>
              <td className="px-4 py-3">
                {row.constructor && (
                  <Link href={`/constructor/${row.constructor.constructorId}`} className="inline-flex items-center gap-2 hover:text-(--color-primary)">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: teamColor(row.constructor.name) }}
                    />
                    <span className="text-(--color-text-secondary)">{row.constructor.name}</span>
                  </Link>
                )}
              </td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{row.wins}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConstructorStandingsTable({ rows }: { rows: ConstructorStanding[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">Pos</th>
            <th className="px-4 py-3 font-medium">Team</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.constructor.constructorId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{row.position}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/constructor/${row.constructor.constructorId}`} className="inline-flex items-center gap-2 hover:text-(--color-primary)">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: teamColor(row.constructor.name) }}
                  />
                  {row.constructor.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-(--color-text-secondary)">{row.wins}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
