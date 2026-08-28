"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/standings/presentation/driver_details_screen.dart.
 * Simplified vs. the Flutter version: no go_router `extra` state to carry a
 * DriverStanding across navigation, so this page fetches the current
 * season's standings itself and matches on driverId — a driver on the
 * current grid renders in "season mode" (position/points KPIs, season
 * stats), everyone else (retired/historical drivers, entries from Hall of
 * Fame or a leaderboard) renders in "career mode", same behavior as the
 * Flutter app's entry points that don't carry a live standing.
 */
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAllCircuits, getDriverCareerResults, getDriverStandings, getDriverStandingsHistory, getEntityNames, getStatsForEntity, getTeamLeaderboard } from "@/lib/api/stats-api";
import { getDriverDetail, type DriverDetail } from "@/lib/api/enrichment";
import { staleTime } from "@/lib/query/ttl";
import { config } from "@/lib/config";
import { colors, teamColor } from "@/lib/theme/colors";
import { useMounted } from "@/hooks/use-mounted";
import { driverFullName, driverStandingFromRow, type DriverStanding } from "@/lib/models/standings";
import { findRank, fmtNum } from "@/lib/models/rank";
import type { ComputedStat, Row } from "@/lib/api/types";
import { SectionLabel } from "@/components/detail/section-label";
import { HeroKpi, StatTile, TotalTile, BioGroup } from "@/components/detail/tiles";
import { RankCard } from "@/components/detail/rank-card";
import { ChampionshipChart } from "@/components/detail/championship-chart";
import { SeasonPointsChart } from "@/components/detail/season-points-chart";
import { BestCircuitTile } from "@/components/detail/best-circuit-tile";
import { ResultChip } from "@/components/detail/result-chip";

const CAREER_TOTAL_METRICS: [string, string][] = [
  ["gps", "GRANDS PRIX"],
  ["wins", "WINS"],
  ["podiums", "PODIUMS"],
  ["poles", "POLES"],
  ["points", "POINTS"],
  ["fastest_laps", "FASTEST LAPS"],
  ["laps_led", "LAPS LED"],
  ["dnfs", "DNFS"],
  ["dsqs", "DSQS"],
  ["distinct_teams", "TEAMS"],
  ["distinct_teammates", "TEAMMATES"],
];

const ALL_TIME_METRICS: [string, string][] = [
  ["titles", "TITLES"],
  ["wins", "WINS"],
  ["podiums", "PODIUMS"],
  ["poles", "POLES"],
  ["points", "POINTS"],
  ["gps", "GRANDS PRIX"],
  ["fastest_laps", "FASTEST LAPS"],
  ["laps_led", "LAPS LED"],
];

const TEAM_METRICS: [string, string][] = [
  ["gps_per_team", "GPS"],
  ["wins_per_team", "WINS"],
  ["podiums_per_team", "PODIUMS"],
  ["poles_per_team", "POLES"],
];

export default function DriverDetailPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const mounted = useMounted();

  const standingsQuery = useQuery({
    queryKey: ["driver-standings", config.currentSeason],
    queryFn: async () => (await getDriverStandings(config.currentSeason)).map(driverStandingFromRow),
    staleTime: staleTime.standings,
  });
  const namesQuery = useQuery({
    queryKey: ["entity-names"],
    queryFn: getEntityNames,
    staleTime: staleTime.immutable,
  });
  const detailQuery = useQuery({
    queryKey: ["driver-detail", driverId],
    queryFn: () => getDriverDetail(driverId),
    staleTime: staleTime.daily,
  });
  const statsQuery = useQuery({
    queryKey: ["entity-stats", driverId],
    queryFn: () => getStatsForEntity(driverId),
    staleTime: staleTime.daily,
  });
  const careerResultsQuery = useQuery({
    queryKey: ["driver-career-results", driverId],
    queryFn: () => getDriverCareerResults(driverId),
    staleTime: staleTime.daily,
  });
  const standingsHistoryQuery = useQuery({
    queryKey: ["driver-standings-history", driverId],
    queryFn: () => getDriverStandingsHistory(driverId),
    staleTime: staleTime.daily,
  });
  const circuitsQuery = useQuery({
    queryKey: ["all-circuits"],
    queryFn: getAllCircuits,
    staleTime: staleTime.immutable,
  });

  if (!mounted || standingsQuery.isLoading || namesQuery.isLoading) {
    return (
      <main className="flex-1 px-8 py-8">
        <p className="text-(--color-text-secondary)">Loading driver…</p>
      </main>
    );
  }

  const standing = standingsQuery.data?.find((s) => s.driver.driverId === driverId) ?? null;
  const fallbackName = namesQuery.data?.[driverId];
  if (!standing && !fallbackName) {
    return (
      <main className="flex-1 px-8 py-8">
        <p className="text-(--color-error)">Driver not found.</p>
      </main>
    );
  }

  const accent = standing?.constructor ? teamColor(standing.constructor.name) : colors.primary;
  const titleName = standing ? driverFullName(standing.driver) : fallbackName;
  const detail = detailQuery.data;
  const isCareerMode = !standing;

  const wins = isCareerMode ? (detail?.careerStats[0] ?? "0") : (detail?.seasonStats[0] ?? "0");
  const podiums = isCareerMode ? (detail?.careerStats[1] ?? "0") : (detail?.seasonStats[1] ?? "0");
  const poles = isCareerMode ? (detail?.careerStats[2] ?? "0") : (detail?.seasonStats[2] ?? "0");
  const dnfs = isCareerMode ? (detail?.careerStats[3] ?? "0") : (detail?.seasonStats[3] ?? "0");

  const stats = statsQuery.data ?? [];
  const names = namesQuery.data ?? {};
  const circuits = circuitsQuery.data ?? [];
  const careerResults = careerResultsQuery.data ?? [];

  return (
    <main className="flex-1 px-8 py-8">
      <Link href="/standings" className="mb-4 inline-block text-sm text-(--color-text-muted) hover:text-(--color-text-primary)">
        ← Standings
      </Link>

      <Hero
        titleName={titleName}
        standing={standing}
        detail={detail}
        accent={accent}
        isCareerMode={isCareerMode}
        wins={wins}
        podiums={podiums}
        poles={poles}
        dnfs={dnfs}
      />

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <SectionLabel label="Personal" />
              <BioGroup
                accent={accent}
                items={[
                  { label: "Driver Code", value: standing?.driver.code ?? (detail.carNumber || "-") },
                  { label: "Nationality", value: detail.nationality || standing?.driver.nationality || "-" },
                  { label: "Date of Birth", value: detail.dateOfBirth || standing?.driver.dateOfBirth || "-" },
                ]}
              />
            </div>
            <div>
              <SectionLabel label="Career" />
              <BioGroup
                accent={accent}
                items={[
                  { label: "Current Team", value: standing?.constructor?.name ?? "-" },
                  { label: "First Entry", value: detail.firstEntry ?? "-" },
                  detail.firstWin
                    ? { label: "First Win", value: detail.firstWin }
                    : { label: "First Podium", value: detail.firstPodium ?? "-" },
                  { label: "World Championships", value: String(detail.wdc) },
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
            <RankCard key={key} entityId={driverId} entityType="driver" metricKey={key} label={label} accent={accent} names={names} />
          ))}
        </div>
      </Section>

      {careerResults.length > 0 && (
        <Section>
          <SectionLabel label="Rankings by Team" />
          <div className="flex flex-col gap-2">
            {teamsFromResults(careerResults).map((constructorId) => (
              <TeamRankCard
                key={constructorId}
                driverId={driverId}
                constructorId={constructorId}
                teamName={names[constructorId] ?? constructorId}
                accent={accent}
              />
            ))}
          </div>
        </Section>
      )}

      <CircuitPerformance stats={stats} circuits={circuits} accent={accent} />
      <H2HSummary stats={stats} accent={accent} />
      <QualifyingGap stats={stats} />

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
        <SeasonStatsSection standings={standingsHistoryQuery.data} stats={stats} accent={accent} />
      )}

      {careerResults.length > 0 && <ResultsByYear results={careerResults} accent={accent} />}
    </main>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 first:mt-0">{children}</div>;
}

function Hero({
  titleName,
  standing,
  detail,
  accent,
  isCareerMode,
  wins,
  podiums,
  poles,
  dnfs,
}: {
  titleName: string | undefined;
  standing: DriverStanding | null;
  detail: DriverDetail | undefined;
  accent: string;
  isCareerMode: boolean;
  wins: string;
  podiums: string;
  poles: string;
  dnfs: string;
}) {
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
          {standing?.constructor && (
            <div className="mt-1 text-sm font-extrabold tracking-wide" style={{ color: accent }}>
              {standing.constructor.name.toUpperCase()}
            </div>
          )}
        </div>
        {detail?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.imageUrl}
            alt={titleName ?? ""}
            className="h-36 w-36 shrink-0 rounded-2xl border border-(--color-border) object-cover"
          />
        )}
      </div>

      {!isCareerMode && standing && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-sm">
          <HeroKpi value={standing.position} label="POSITION" accent={accent} />
          <HeroKpi value={standing.points} label="POINTS" accent={accent} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:max-w-2xl">
        <StatTile value={wins} label={wins === "1" ? "WIN" : "WINS"} color={accent} />
        <StatTile value={podiums} label={podiums === "1" ? "PODIUM" : "PODIUMS"} color={accent} />
        <StatTile value={poles} label={poles === "1" ? "POLE" : "POLES"} color={accent} />
        <StatTile value={dnfs} label={dnfs === "1" ? "DNF" : "DNFS"} color="var(--color-error)" />
      </div>
    </div>
  );
}

function teamsFromResults(results: Row[]): string[] {
  const lastSeason = new Map<string, number>();
  for (const r of results) {
    const c = r.constructor_id as string | undefined;
    const s = r.season as number | undefined;
    if (!c || s == null) continue;
    if (!lastSeason.has(c) || s > lastSeason.get(c)!) lastSeason.set(c, s);
  }
  return [...lastSeason.keys()].sort((a, b) => lastSeason.get(b)! - lastSeason.get(a)!);
}

function TeamRankCard({
  driverId,
  constructorId,
  teamName,
  accent,
}: {
  driverId: string;
  constructorId: string;
  teamName: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
      <div className="mb-2 truncate text-sm font-semibold">{teamName.toUpperCase()}</div>
      <div className="grid grid-cols-4 gap-2">
        {TEAM_METRICS.map(([metricKey, label]) => (
          <TeamRankChip key={metricKey} driverId={driverId} constructorId={constructorId} metricKey={metricKey} label={label} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function TeamRankChip({
  driverId,
  constructorId,
  metricKey,
  label,
  accent,
}: {
  driverId: string;
  constructorId: string;
  metricKey: string;
  label: string;
  accent: string;
}) {
  const query = useQuery({
    queryKey: ["team-leaderboard", constructorId, metricKey],
    queryFn: () => getTeamLeaderboard({ constructorId, metricKey }),
    staleTime: staleTime.daily,
  });
  const rank = query.data ? findRank(query.data, `${driverId}__${constructorId}`) : null;

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-(--color-surface-elevated) py-2">
      <span className="text-sm font-black" style={{ color: accent }}>
        {rank ? `#${rank.rank}/${rank.total}` : "-"}
      </span>
      <span className="text-[8px] font-bold tracking-wide text-(--color-text-muted)">{label}</span>
    </div>
  );
}

function CircuitPerformance({ stats, circuits, accent }: { stats: ComputedStat[]; circuits: Row[]; accent: string }) {
  const find = (key: string) => stats.find((s) => s.metricKey === key && s.periodFrom === null);
  const entries: [string, ComputedStat][] = [];
  const wins = find("wins_best_circuit");
  const podiums = find("podiums_best_circuit");
  const poles = find("poles_best_circuit");
  if (wins) entries.push(["MOST WINS AT", wins]);
  if (podiums) entries.push(["MOST PODIUMS AT", podiums]);
  if (poles) entries.push(["MOST POLES AT", poles]);
  if (entries.length === 0) return null;

  return (
    <Section>
      <SectionLabel label="Circuit Performance" />
      <div className="flex flex-col gap-2">
        {entries.map(([label, stat]) => {
          const circuitId = (stat.extra?.circuit_id as string | undefined) ?? "";
          const circuitName = circuits.find((c) => c.circuit_id === circuitId)?.name as string | undefined;
          return (
            <BestCircuitTile
              key={label}
              label={label}
              value={fmtNum(stat.value)}
              circuitId={circuitId}
              circuitName={circuitName ?? circuitId}
              accent={accent}
            />
          );
        })}
      </div>
    </Section>
  );
}

function H2HSummary({ stats, accent }: { stats: ComputedStat[]; accent: string }) {
  const race = stats.find((s) => s.metricKey === "h2h_race_aggregate" && s.periodFrom === null);
  const quali = stats.find((s) => s.metricKey === "h2h_qualifying_aggregate" && s.periodFrom === null);
  if (!race && !quali) return null;

  return (
    <Section>
      <SectionLabel label="Head-to-Head vs Teammates" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {race && (
          <H2HCard
            title="RACE"
            wins={Number(race.extra?.wins ?? race.value)}
            losses={Number(race.extra?.losses ?? 0)}
            together={Number(race.extra?.races_together ?? 0)}
            teammates={Number(race.extra?.distinct_teammates ?? 0)}
            accent={accent}
          />
        )}
        {quali && (
          <H2HCard
            title="QUALIFYING"
            wins={Number(quali.extra?.wins ?? quali.value)}
            losses={Number(quali.extra?.losses ?? 0)}
            together={Number(quali.extra?.sessions_together ?? 0)}
            teammates={Number(quali.extra?.distinct_teammates ?? 0)}
            accent={accent}
          />
        )}
      </div>
    </Section>
  );
}

function H2HCard({
  title,
  wins,
  losses,
  together,
  teammates,
  accent,
}: {
  title: string;
  wins: number;
  losses: number;
  together: number;
  teammates: number;
  accent: string;
}) {
  const total = wins + losses;
  const winFrac = total > 0 ? wins / total : 0;
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
      <div className="text-[9px] font-extrabold tracking-wide text-(--color-text-muted)">{title}</div>
      <div className="mt-2 text-2xl font-black" style={{ color: accent }}>
        {wins}–{losses}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-error) 30%, transparent)" }}>
        <div className="h-full rounded-full" style={{ width: `${winFrac * 100}%`, backgroundColor: accent }} />
      </div>
      <div className="mt-2 text-[9.5px] text-(--color-text-muted)">
        {together} together · {teammates} teammates
      </div>
    </div>
  );
}

function QualifyingGap({ stats }: { stats: ComputedStat[] }) {
  const gap = stats.find((s) => s.metricKey === "qualifying_gap_mean_delta_pct" && s.periodFrom === null);
  if (!gap) return null;
  const delta = gap.value;
  const faster = delta < 0;
  const fasterPct = Number(gap.extra?.sessions_faster_pct ?? 0);
  const compared = Number(gap.extra?.sessions_compared ?? 0);

  return (
    <Section>
      <SectionLabel label="Qualifying Gap vs Teammates" />
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black" style={{ color: faster ? "var(--color-success)" : "var(--color-error)" }}>
            {Math.abs(delta).toFixed(2)}%
          </span>
          <span className="text-[9px] font-bold tracking-wide text-(--color-text-muted)">
            {faster ? "FASTER ON AVERAGE" : "SLOWER ON AVERAGE"}
          </span>
        </div>
        <div className="mt-1 text-xs text-(--color-text-muted)">
          Faster in {fasterPct.toFixed(0)}% of {compared} shared sessions
        </div>
      </div>
    </Section>
  );
}

function SeasonStatsSection({ standings, stats, accent }: { standings: Row[]; stats: ComputedStat[]; accent: string }) {
  const avgQuali = new Map<number, number>();
  const avgRace = new Map<number, number>();
  for (const s of stats) {
    if (s.periodFrom == null) continue;
    if (s.metricKey === "avg_quali_position_season") avgQuali.set(s.periodFrom, s.value);
    if (s.metricKey === "avg_race_position_season") avgRace.set(s.periodFrom, s.value);
  }
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
              <th className="px-3 py-2 font-bold tracking-wide">AVG Q</th>
              <th className="px-3 py-2 font-bold tracking-wide">AVG R</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((row) => {
              const season = Number(row.season);
              return (
                <tr key={season} className="border-b border-(--color-divider) last:border-0">
                  <td className="px-3 py-2 font-bold" style={{ color: accent }}>
                    {season}
                  </td>
                  <td className="px-3 py-2">{row.position != null ? `P${row.position}` : "-"}</td>
                  <td className="px-3 py-2">{fmtNum(Number(row.points ?? 0))}</td>
                  <td className="px-3 py-2">{Number(row.wins ?? 0)}</td>
                  <td className="px-3 py-2">{avgQuali.has(season) ? avgQuali.get(season)!.toFixed(1) : "-"}</td>
                  <td className="px-3 py-2">{avgRace.has(season) ? avgRace.get(season)!.toFixed(1) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function ResultsByYear({ results, accent }: { results: Row[]; accent: string }) {
  const bySeason = new Map<number, Row[]>();
  for (const r of results) {
    const s = r.season as number | undefined;
    if (s == null) continue;
    if (!bySeason.has(s)) bySeason.set(s, []);
    bySeason.get(s)!.push(r);
  }
  const seasons = [...bySeason.keys()].sort((a, b) => b - a);
  for (const s of seasons) bySeason.get(s)!.sort((a, b) => Number(a.round) - Number(b.round));

  return (
    <Section>
      <SectionLabel label="Results by Season" />
      <div className="flex flex-col gap-2">
        {seasons.map((season) => (
          <div key={season} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3">
            <div className="mb-2 text-sm font-extrabold" style={{ color: accent }}>
              {season}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {bySeason.get(season)!.map((race, i) => (
                <ResultChip key={i} race={race} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

