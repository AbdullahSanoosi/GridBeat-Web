"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/standings/presentation/constructor_details_screen.dart.
 * Simplified vs. the Flutter version the same way the driver page is — see
 * that file's docstring. A constructor on the current grid renders in
 * "season mode" (position/points KPIs); everyone else renders in "career
 * mode".
 */
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAllCircuits, getConstructorBestCircuit, getConstructorStandings, getConstructorStandingsHistory, getEntityNames, getStatsForEntity } from "@/lib/api/stats-api";
import { getConstructorDetail, type ConstructorDetail } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { teamColor } from "@/lib/theme/colors";
import { useMounted } from "@/hooks/use-mounted";
import { constructorStandingFromRow, type ConstructorStanding } from "@/lib/models/standings";
import { fmtNum } from "@/lib/models/rank";
import type { ComputedStat, Row } from "@/lib/api/types";
import { SectionLabel } from "@/components/detail/section-label";
import { HeroKpi, StatTile, TotalTile, BioGroup } from "@/components/detail/tiles";
import { RankCard } from "@/components/detail/rank-card";
import { ChampionshipChart } from "@/components/detail/championship-chart";
import { SeasonPointsChart } from "@/components/detail/season-points-chart";
import { BestCircuitTile } from "@/components/detail/best-circuit-tile";
import { DetailPageSkeleton } from "@/components/shared/skeleton";
import { useSectionStore } from "@/lib/nav/section-store";

const CAREER_TOTAL_METRICS: [string, string][] = [
  ["gps", "GRANDS PRIX"],
  ["wins", "WINS"],
  ["podiums", "PODIUMS"],
  ["poles", "POLES"],
  ["points", "POINTS"],
  ["titles", "TITLES"],
  ["laps_led", "LAPS LED"],
  ["one_two_finishes", "ONE-TWOS"],
  ["first_row_lockouts", "FRONT ROW LOCKOUTS"],
  ["distinct_drivers", "DRIVERS"],
  ["years_active", "SEASONS ACTIVE"],
];

const ALL_TIME_METRICS: [string, string][] = [
  ["titles", "TITLES"],
  ["wins", "WINS"],
  ["podiums", "PODIUMS"],
  ["poles", "POLES"],
  ["points", "POINTS"],
  ["one_two_finishes", "ONE-TWOS"],
  ["laps_led", "LAPS LED"],
];

const BEST_CIRCUIT_METRICS: [string, string][] = [
  ["wins_circuit", "MOST WINS AT"],
  ["podiums_circuit", "MOST PODIUMS AT"],
  ["poles_circuit", "MOST POLES AT"],
];

export default function ConstructorDetailPage({ params }: { params: Promise<{ constructorId: string }> }) {
  const { constructorId } = use(params);
  const mounted = useMounted();
  const lastSection = useSectionStore((s) => s.lastSection);

  const standingsQuery = useQuery({
    queryKey: ["constructor-standings", config.currentSeason],
    queryFn: async () => (await getConstructorStandings(config.currentSeason)).map(constructorStandingFromRow),
    staleTime: staleTime.standings,
  });
  const namesQuery = useQuery({
    queryKey: ["entity-names"],
    queryFn: getEntityNames,
    staleTime: staleTime.immutable,
  });
  const detailQuery = useQuery({
    queryKey: ["constructor-detail", constructorId],
    queryFn: () => getConstructorDetail(constructorId),
    staleTime: staleTime.daily,
  });
  const statsQuery = useQuery({
    queryKey: ["entity-stats", constructorId],
    queryFn: () => getStatsForEntity(constructorId),
    staleTime: staleTime.daily,
  });
  const standingsHistoryQuery = useQuery({
    queryKey: ["constructor-standings-history", constructorId],
    queryFn: () => getConstructorStandingsHistory(constructorId),
    staleTime: staleTime.daily,
  });
  const circuitsQuery = useQuery({
    queryKey: ["all-circuits"],
    queryFn: getAllCircuits,
    staleTime: staleTime.immutable,
  });

  if (!mounted || standingsQuery.isLoading || namesQuery.isLoading) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <DetailPageSkeleton />
      </main>
    );
  }

  const standing = standingsQuery.data?.find((s) => s.constructor.constructorId === constructorId) ?? null;
  const fallbackName = namesQuery.data?.[constructorId];
  if (!standing && !fallbackName) {
    return (
      <main className="flex-1 px-8 py-8">
        <p className="text-(--color-error)">Constructor not found.</p>
      </main>
    );
  }

  const accent = teamColor(standing?.constructor.name ?? fallbackName ?? constructorId);
  const titleName = standing?.constructor.name ?? fallbackName;
  const detail = detailQuery.data;
  const isCareerMode = !standing;
  const stats = statsQuery.data ?? [];
  const names = namesQuery.data ?? {};

  const back = lastSection ?? { href: "/standings", label: "Standings" };

  return (
    <main className="flex-1 px-8 py-8">
      <Link href={back.href} className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← {back.label}
      </Link>

      <Hero titleName={titleName} standing={standing} detail={detail} accent={accent} isCareerMode={isCareerMode} />

      {detail?.carImageUrl && (
        <Section>
          <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detail.carImageUrl} alt={`${titleName} car`} className="mx-auto h-36 w-full object-contain" />
          </div>
        </Section>
      )}

      {detail?.about && (
        <Section>
          <SectionLabel label="About" />
          <p className="max-w-3xl rounded-xl border border-(--color-border) bg-(--color-surface) p-4 text-sm leading-relaxed text-(--color-text-secondary)">
            {detail.about}
          </p>
        </Section>
      )}

      {detail && (
        <Section>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <SectionLabel label="Drivers" />
              <BioGroup accent={accent} items={driverBioItems(detail)} />
            </div>
            <div>
              <SectionLabel label="Technical" />
              <BioGroup
                accent={accent}
                items={[
                  { label: "Chassis", value: detail.chassis ?? "-" },
                  { label: "Power Unit", value: detail.powerUnit ?? "-" },
                ]}
              />
            </div>
            <div>
              <SectionLabel label="Team" />
              <BioGroup
                accent={accent}
                items={[
                  { label: "Team Principal", value: detail.teamPrincipal ?? "-" },
                  { label: "First Entry", value: detail.firstEntry ?? "-" },
                  { label: "Constructors Championships", value: String(detail.wcc) },
                  { label: "Drivers Championships", value: String(detail.wdc) },
                ]}
              />
            </div>
          </div>
        </Section>
      )}

      {stats.length > 0 && (
        <Section>
          <SectionLabel label="Career Totals" />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {CAREER_TOTAL_METRICS.map(([key, label]) => (
              <TotalTile
                key={key}
                accent={accent}
                label={label}
                value={fmtNum(stats.find((s) => s.metricKey === key && s.periodFrom === null)?.value ?? 0)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionLabel label="All-Time Rankings" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ALL_TIME_METRICS.map(([key, label]) => (
            <RankCard key={key} entityId={constructorId} entityType="constructor" metricKey={key} label={label} accent={accent} names={names} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionLabel label="Circuit Performance" />
        <div className="flex flex-col gap-2">
          {BEST_CIRCUIT_METRICS.map(([metricKey, label]) => (
            <ConstructorBestCircuit
              key={metricKey}
              constructorId={constructorId}
              metricKey={metricKey}
              label={label}
              accent={accent}
              circuits={circuitsQuery.data ?? []}
            />
          ))}
        </div>
      </Section>

      <Records stats={stats} names={names} accent={accent} />

      {standingsHistoryQuery.data && standingsHistoryQuery.data.length >= 2 && (
        <Section>
          <SectionLabel label="Championship Finish by Year" />
          <ChampionshipChart
            accent={accent}
            seasons={standingsHistoryQuery.data
              .filter((r) => r.season != null && r.position != null)
              .map((r) => ({ season: Number(r.season), position: Number(r.position) }))
              .sort((a, b) => a.season - b.season)}
          />
        </Section>
      )}

      {standingsHistoryQuery.data && standingsHistoryQuery.data.length > 0 && (
        <SeasonStatsSection standings={standingsHistoryQuery.data} accent={accent} />
      )}
    </main>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 first:mt-0">{children}</div>;
}

function driverNumber(entry: string[]): string {
  const raw = entry[2]?.replace("#", "").trim();
  return raw ? `#${raw}` : "";
}

function driverBioItems(detail: ConstructorDetail) {
  const d1Name = detail.firstDriver[0] ?? "-";
  const d1Num = driverNumber(detail.firstDriver);
  const d2Name = detail.secondDriver[0] ?? "-";
  const d2Num = driverNumber(detail.secondDriver);
  return [
    { label: d1Num || "Driver", value: d1Name },
    { label: d2Num || "Driver", value: d2Name },
  ];
}

function Hero({
  titleName,
  standing,
  detail,
  accent,
  isCareerMode,
}: {
  titleName: string | undefined;
  standing: ConstructorStanding | null;
  detail: ConstructorDetail | undefined;
  accent: string;
  isCareerMode: boolean;
}) {
  const wins = detail?.totalStats[0] ?? "0";
  const podiums = detail?.totalStats[1] ?? "0";
  const poles = detail?.totalStats[2] ?? "0";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-(--color-border) p-6"
      style={{ background: `radial-gradient(circle at 100% 0%, color-mix(in srgb, ${accent} 30%, transparent), transparent 60%), var(--color-surface)` }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <span
            className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wide"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 20%, transparent)`, color: accent }}
          >
            {isCareerMode ? "CAREER" : `${config.currentSeason} SEASON`}
          </span>
          <h1 className="mt-3 font-[var(--font-f1)] text-4xl font-black tracking-tight">
            {titleName?.toUpperCase() ?? "—"}
          </h1>
          {detail?.chassis && (
            <div className="mt-1 text-sm font-extrabold tracking-wide" style={{ color: accent }}>
              {detail.chassis.toUpperCase()}
            </div>
          )}
        </div>
        {detail?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.imageUrl}
            alt={titleName ?? ""}
            className="h-16 w-16 shrink-0 rounded-xl border border-(--color-border) bg-(--color-surface-elevated) object-contain p-2"
          />
        )}
      </div>

      {!isCareerMode && standing && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-sm">
          <HeroKpi value={standing.position} label="POSITION" accent={accent} />
          <HeroKpi value={standing.points} label="POINTS" accent={accent} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
        <StatTile value={wins} label="WINS" color={accent} />
        <StatTile value={podiums} label="PODIUMS" color={accent} />
        <StatTile value={poles} label="POLES" color={accent} />
      </div>
    </div>
  );
}

function ConstructorBestCircuit({
  constructorId,
  metricKey,
  label,
  accent,
  circuits,
}: {
  constructorId: string;
  metricKey: string;
  label: string;
  accent: string;
  circuits: Row[];
}) {
  const query = useQuery({
    queryKey: ["constructor-best-circuit", constructorId, metricKey],
    queryFn: () => getConstructorBestCircuit({ constructorId, metricKey }),
    staleTime: staleTime.daily,
  });
  if (!query.data) return null;
  const circuitId = query.data.entityId.split("__").pop() ?? "";
  const circuitName = (circuits.find((c) => c.circuit_id === circuitId)?.name as string | undefined) ?? circuitId;
  return <BestCircuitTile label={label} value={fmtNum(query.data.value)} circuitId={circuitId} circuitName={circuitName} accent={accent} />;
}

function Records({ stats, names, accent }: { stats: ComputedStat[]; names: Record<string, string>; accent: string }) {
  const find = (key: string) => stats.find((s) => s.metricKey === key && s.periodFrom === null);
  const firstGp = find("first_gp");
  const lastGp = find("last_gp");
  const bestResult = find("best_result");
  const bestGrid = find("best_grid");
  const bestWcc = find("best_wcc_rank");
  const bestWdc = find("best_wdc_rank");

  const driverSuffix = (extra: Record<string, unknown> | null | undefined) => {
    const driverId = extra?.driver_id as string | undefined;
    return driverId && names[driverId] ? ` · ${names[driverId]}` : "";
  };

  const rows: { label: string; value: string }[] = [];
  if (firstGp) rows.push({ label: "First Grand Prix", value: String(Math.trunc(firstGp.value)) });
  if (lastGp) rows.push({ label: "Last Grand Prix", value: String(Math.trunc(lastGp.value)) });
  if (bestResult)
    rows.push({
      label: "Best Result",
      value: `P${Math.trunc(bestResult.value)} · ${bestResult.extra?.season ?? ""}${driverSuffix(bestResult.extra)}`,
    });
  if (bestGrid)
    rows.push({
      label: "Best Grid Position",
      value: `P${Math.trunc(bestGrid.value)} · ${bestGrid.extra?.season ?? ""}${driverSuffix(bestGrid.extra)}`,
    });
  if (bestWcc) rows.push({ label: "Best Constructors' Rank", value: `P${Math.trunc(bestWcc.value)} · ${bestWcc.extra?.season ?? ""}` });
  if (bestWdc)
    rows.push({
      label: "Best Drivers' Rank",
      value: `P${Math.trunc(bestWdc.value)} · ${bestWdc.extra?.season ?? ""}${driverSuffix(bestWdc.extra)}`,
    });
  if (rows.length === 0) return null;

  return (
    <Section>
      <SectionLabel label="Records" />
      <BioGroup accent={accent} items={rows} />
    </Section>
  );
}

function SeasonStatsSection({ standings, accent }: { standings: Row[]; accent: string }) {
  const seasons = [...standings].sort((a, b) => Number(b.season) - Number(a.season));

  return (
    <Section>
      <SectionLabel label="Season Stats" />
      <SeasonPointsChart
        accent={accent}
        seasons={[...standings]
          .sort((a, b) => Number(a.season) - Number(b.season))
          .map((r) => ({ season: Number(r.season), points: Number(r.points ?? 0) }))}
      />
      <div className="mt-3 overflow-x-auto rounded-xl border border-(--color-border) bg-(--color-surface)">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-(--color-border) text-(--color-text-muted)">
              <th className="px-3 py-2 font-bold tracking-wide">YEAR</th>
              <th className="px-3 py-2 font-bold tracking-wide">POS</th>
              <th className="px-3 py-2 font-bold tracking-wide">POINTS</th>
              <th className="px-3 py-2 font-bold tracking-wide">WINS</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((row) => (
              <tr key={Number(row.season)} className="border-b border-(--color-divider) last:border-0">
                <td className="px-3 py-2 font-bold" style={{ color: accent }}>
                  {Number(row.season)}
                </td>
                <td className="px-3 py-2">{row.position != null ? `P${row.position}` : "-"}</td>
                <td className="px-3 py-2">{fmtNum(Number(row.points ?? 0))}</td>
                <td className="px-3 py-2">{Number(row.wins ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
