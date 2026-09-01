"use client";

import { useState } from "react";
import Link from "next/link";
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
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">Hall of Fame</h1>
        <div className="flex rounded-full bg-(--color-surface-elevated) p-1">
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
        <>
          {drivers.data?.[0] && <DriverHero driver={drivers.data[0]} />}
          <DriverTable rows={drivers.data?.slice(1) ?? []} startRank={2} />
        </>
      ) : (
        <>
          {constructors.data?.[0] && <ConstructorHero constructor={constructors.data[0]} />}
          <ConstructorTable rows={constructors.data?.slice(1) ?? []} startRank={2} />
        </>
      )}
    </main>
  );
}

/** Ports _HeroChampion — the #1 all-time driver, gold-themed with their archive photo faded in from the right. */
function DriverHero({ driver }: { driver: HallOfFameDriver }) {
  const [firstName, ...rest] = driver.name.split(" ");
  const lastName = rest.join(" ") || firstName;

  return (
    <Link
      href={`/driver/${driver.driverId}`}
      className="relative mb-6 block overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-5"
    >
      <div className="pointer-events-none absolute top-[-80px] right-[-80px] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.28),transparent_70%)]" />
      {driver.imageUrl && (
        <div
          className="pointer-events-none absolute top-0 right-[-10px] bottom-0 hidden w-[200px] sm:block"
          style={{ maskImage: "linear-gradient(to right, transparent, black 45%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 45%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={driver.imageUrl} alt="" className="h-full w-full object-contain object-[right_bottom]" />
        </div>
      )}
      <div className="relative max-w-[75%] sm:max-w-[55%]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD700]/50 bg-[#FFD700]/18 px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em] text-[#FFD700]">
          🏆 {driver.titles > 0 ? `${driver.titles}× WORLD CHAMPION` : "TOP OF THE HALL"}
        </span>
        <div className="mt-4 text-[11px] font-bold tracking-[0.2em] text-(--color-text-muted)">
          {firstName.toUpperCase()}
        </div>
        <div className="truncate font-[var(--font-f1)] text-[34px] leading-none font-black tracking-tight" style={{ textShadow: "0 0 18px rgba(255,215,0,0.5)" }}>
          {lastName.toUpperCase()}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <HeroStat label="WINS" value={driver.wins} color="#FFD700" />
          <HeroStat label="PODIUMS" value={driver.podiums} />
          <HeroStat label="POLES" value={driver.poles} />
          <HeroStat label="DNFS" value={driver.dnfs} color="var(--color-error)" />
        </div>
      </div>
    </Link>
  );
}

/** Ports the constructor-hall-of-fame equivalent of _HeroChampion — same shape, WCC titles instead of WDC, no DNFs stat. */
function ConstructorHero({ constructor: c }: { constructor: HallOfFameConstructor }) {
  return (
    <Link
      href={`/constructor/${c.constructorId}`}
      className="relative mb-6 block overflow-hidden rounded-2xl bg-(--color-surface-elevated) p-5"
    >
      <div className="pointer-events-none absolute top-[-80px] right-[-80px] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.28),transparent_70%)]" />
      {c.imageUrl && (
        <div className="pointer-events-none absolute top-4 right-4 bottom-4 hidden w-[130px] sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.imageUrl} alt="" className="h-full w-full object-contain" />
        </div>
      )}
      <div className="relative max-w-[75%] sm:max-w-[60%]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD700]/50 bg-[#FFD700]/18 px-2.5 py-1 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em] text-[#FFD700]">
          🏆 {c.titles > 0 ? `${c.titles}× CONSTRUCTORS' CHAMPION` : "TOP OF THE HALL"}
        </span>
        <div className="mt-4 truncate font-[var(--font-f1)] text-[30px] leading-none font-black tracking-tight" style={{ textShadow: "0 0 18px rgba(255,215,0,0.5)" }}>
          {c.name.toUpperCase()}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <HeroStat label="WINS" value={c.wins} color="#FFD700" />
          <HeroStat label="PODIUMS" value={c.podiums} />
          <HeroStat label="POLES" value={c.poles} />
        </div>
      </div>
    </Link>
  );
}

function HeroStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg bg-(--color-surface) px-2 py-2 text-center">
      <div className="font-[var(--font-f1)] text-xl leading-none font-black" style={{ color: color ?? "var(--color-text-primary)" }}>
        {value}
      </div>
      <div className="mt-1 text-[9px] font-extrabold tracking-[0.1em] text-(--color-text-muted)">{label}</div>
    </div>
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

function DriverTable({ rows, startRank }: { rows: HallOfFameDriver[]; startRank: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">#</th>
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
          {rows.map((r, i) => (
            <tr
              key={r.driverId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{startRank + i}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/driver/${r.driverId}`} className="hover:text-(--color-primary)">
                  {r.name}
                </Link>
              </td>
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

function ConstructorTable({ rows, startRank }: { rows: HallOfFameConstructor[]; startRank: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Constructor</th>
            <th className="px-4 py-3 text-right font-medium">Titles</th>
            <th className="px-4 py-3 text-right font-medium">Wins</th>
            <th className="px-4 py-3 text-right font-medium">Podiums</th>
            <th className="px-4 py-3 text-right font-medium">Poles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.constructorId}
              className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)"
            >
              <td className="px-4 py-3 text-(--color-text-muted)">{startRank + i}</td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/constructor/${r.constructorId}`} className="hover:text-(--color-primary)">
                  {r.name}
                </Link>
              </td>
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
