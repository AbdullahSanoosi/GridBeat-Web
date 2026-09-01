"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/stats-api";
import { getDriverDetail, getConstructorDetail } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { teamColor } from "@/lib/theme/colors";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton, SkeletonRows } from "@/components/shared/skeleton";
import {
  driverStandingFromRow,
  constructorStandingFromRow,
  type DriverStanding,
  type ConstructorStanding,
} from "@/lib/models/standings";

/**
 * Ports standings_screen.dart's leader banner (_DriverBanner/
 * _ConstructorBanner — team-color glow, floated headshot/logo,
 * CHAMPIONSHIP LEADER pill) and the shared `_StandingRow` card list
 * (position tile, team accent bar, title/subtitle, points), replacing the
 * plain bordered box + HTML table this page had (Roadmap 3.2). No season
 * selector in the Flutter source either — always the current season.
 */
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
    queryFn: async () => (await getConstructorStandings(config.currentSeason)).map(constructorStandingFromRow),
    staleTime: staleTime.standings,
  });

  const active = tab === "drivers" ? drivers : constructors;

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">{config.currentSeason} Standings</h1>
        <div className="flex rounded-full bg-(--color-surface-elevated) p-1">
          <TabButton active={tab === "drivers"} onClick={() => setTab("drivers")}>
            Drivers
          </TabButton>
          <TabButton active={tab === "constructors"} onClick={() => setTab("constructors")}>
            Teams
          </TabButton>
        </div>
      </div>

      {!mounted || active.isLoading ? (
        <>
          <Skeleton className="mb-6 h-32 w-full" />
          <SkeletonRows count={10} className="h-14" />
        </>
      ) : active.isError ? (
        <p className="text-(--color-error)">
          Failed to load standings: {active.error instanceof Error ? active.error.message : String(active.error)}
        </p>
      ) : tab === "drivers" ? (
        <DriverStandingsView rows={drivers.data ?? []} />
      ) : (
        <ConstructorStandingsView rows={constructors.data ?? []} />
      )}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 font-[var(--font-f1)] text-[11px] font-extrabold tracking-wider transition-colors"
      style={{
        backgroundColor: active ? "var(--color-primary)" : "transparent",
        color: active ? "white" : "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

function DriverStandingsView({ rows }: { rows: DriverStanding[] }) {
  const leader = rows[0];
  return (
    <div className="flex flex-col gap-2">
      {leader && <DriverBanner leader={leader} />}
      {rows.map((row, i) => (
        <StandingRow
          key={row.driver.driverId}
          position={Number(row.position) || 0}
          accent={teamColor(row.constructor?.name ?? "")}
          title={row.driver.familyName.toUpperCase()}
          subtitle={row.constructor?.name.toUpperCase() ?? ""}
          points={row.points}
          href={`/driver/${row.driver.driverId}`}
          index={i}
        />
      ))}
    </div>
  );
}

function ConstructorStandingsView({ rows }: { rows: ConstructorStanding[] }) {
  const leader = rows[0];
  return (
    <div className="flex flex-col gap-2">
      {leader && <ConstructorBanner leader={leader} />}
      {rows.map((row, i) => (
        <StandingRow
          key={row.constructor.constructorId}
          position={Number(row.position) || 0}
          accent={teamColor(row.constructor.name)}
          title={row.constructor.name.toUpperCase()}
          subtitle={(row.constructor.nationality ?? "").toUpperCase()}
          points={row.points}
          href={`/constructor/${row.constructor.constructorId}`}
          index={i}
        />
      ))}
    </div>
  );
}

function DriverBanner({ leader }: { leader: DriverStanding }) {
  const accent = teamColor(leader.constructor?.name ?? "");
  const detailQuery = useQuery({
    queryKey: ["driver-detail", leader.driver.driverId],
    queryFn: () => getDriverDetail(leader.driver.driverId),
    staleTime: staleTime.daily,
  });
  const imageUrl = detailQuery.data?.imageUrl ?? null;

  return (
    <Link
      href={`/driver/${leader.driver.driverId}`}
      className="relative mb-2 block overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-5 transition-opacity hover:opacity-95"
    >
      <div
        className="pointer-events-none absolute top-[-80px] right-[-80px] h-[240px] w-[240px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 32%, transparent), transparent)` }}
      />
      {imageUrl && (
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 hidden w-[180px] overflow-hidden sm:block">
          {/* Remote headshot — plain <img>, matches the /driver/[driverId] page's own convention (not next/image, host not in remotePatterns). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute top-0 left-0 w-full object-cover object-top" style={{ height: "62%" }} />
        </div>
      )}
      <div className="relative max-w-[70%] sm:max-w-[60%]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em]"
          style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
        >
          🏆 CHAMPIONSHIP LEADER
        </span>
        <div className="mt-4 text-[11px] font-bold tracking-[0.2em] text-(--color-text-muted)">
          {leader.driver.givenName.toUpperCase()}
        </div>
        <div className="truncate font-[var(--font-f1)] text-[34px] leading-none font-black tracking-tight">
          {leader.driver.familyName.toUpperCase()}
        </div>
        <div className="mt-1 text-[11px] font-bold tracking-[0.14em]" style={{ color: accent }}>
          {leader.constructor?.name.toUpperCase() ?? ""}
        </div>
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-lg bg-(--color-surface) px-3 py-2">
          <span className="font-[var(--font-f1)] text-[28px] leading-none font-black" style={{ color: accent }}>
            {leader.points}
          </span>
          <span className="text-[9px] font-bold tracking-[0.16em] text-(--color-text-muted)">POINTS</span>
        </div>
      </div>
    </Link>
  );
}

function ConstructorBanner({ leader }: { leader: ConstructorStanding }) {
  const accent = teamColor(leader.constructor.name);
  const detailQuery = useQuery({
    queryKey: ["constructor-detail", leader.constructor.constructorId],
    queryFn: () => getConstructorDetail(leader.constructor.constructorId),
    staleTime: staleTime.daily,
  });
  const logoUrl = detailQuery.data?.imageUrl ?? null;

  return (
    <Link
      href={`/constructor/${leader.constructor.constructorId}`}
      className="relative mb-2 block overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-5 transition-opacity hover:opacity-95"
    >
      <div
        className="pointer-events-none absolute top-[-80px] right-[-80px] h-[240px] w-[240px] rounded-full"
        style={{ background: `radial-gradient(circle, color-mix(in srgb, ${accent} 32%, transparent), transparent)` }}
      />
      {logoUrl && (
        <div className="pointer-events-none absolute top-5 right-4 bottom-5 hidden w-[130px] sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="h-full w-full object-contain" />
        </div>
      )}
      <div className="relative max-w-[70%] sm:max-w-[60%]">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em]"
          style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` }}
        >
          🏆 CHAMPIONSHIP LEADER
        </span>
        <div className="mt-4 truncate font-[var(--font-f1)] text-[30px] leading-none font-black tracking-tight">
          {leader.constructor.name.toUpperCase()}
        </div>
        {leader.constructor.nationality && (
          <div className="mt-1.5 text-[11px] font-bold tracking-[0.14em]" style={{ color: accent }}>
            {leader.constructor.nationality.toUpperCase()}
          </div>
        )}
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-lg bg-(--color-surface) px-3 py-2">
          <span className="font-[var(--font-f1)] text-[28px] leading-none font-black" style={{ color: accent }}>
            {leader.points}
          </span>
          <span className="text-[9px] font-bold tracking-[0.16em] text-(--color-text-muted)">POINTS</span>
        </div>
      </div>
    </Link>
  );
}

function StandingRow({
  position,
  accent,
  title,
  subtitle,
  points,
  href,
  index,
}: {
  position: number;
  accent: string;
  title: string;
  subtitle: string;
  points: string;
  href: string;
  index: number;
}) {
  const podium = position <= 3;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-(--color-surface)"
      style={{ backgroundColor: podium ? `color-mix(in srgb, ${accent} 6%, var(--color-surface-elevated))` : "var(--color-surface-elevated)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-[var(--font-f1)] text-base font-black"
        style={{
          color: podium ? accent : "var(--color-text-primary)",
          backgroundColor: podium ? `color-mix(in srgb, ${accent} 22%, transparent)` : "var(--color-surface)",
          border: podium ? `1px solid color-mix(in srgb, ${accent} 50%, transparent)` : undefined,
        }}
      >
        {position || index + 1}
      </div>
      <div className="h-10 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-[var(--font-f1)] text-[15px] font-bold tracking-tight">{title}</div>
        {subtitle && (
          <div className="mt-[3px] truncate text-[10px] font-bold tracking-[0.12em]" style={{ color: accent }}>
            {subtitle}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-[var(--font-f1)] text-2xl leading-none font-black" style={{ color: accent }}>
          {points}
        </div>
        <div className="mt-1 text-[9px] font-bold tracking-[0.14em] text-(--color-text-muted)">POINTS</div>
      </div>
    </Link>
  );
}
