/**
 * Ported from the FIA-document methods of GridBeat (Flutter)
 * lib/services/stats_api_service.dart — same tables, same select lists,
 * same ordering.
 *
 * Backs the Stewards' Room: steward decisions, the Super Licence
 * penalty-points ledger, the confirmed grid, tyre notices and car upgrades.
 */
import { config } from "@/lib/config";
import type { Row } from "./types";

async function get(path: string, query: Record<string, string | number | undefined>): Promise<Row[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const url = `${config.statsApiBaseUrl}${path}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`stats-api ${path} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as Row[];
}

/**
 * Every steward decision for a season, newest first.
 *
 * `id.desc` is a deliberate tiebreak, not decoration: several documents
 * share an identical `published_at`, and without a unique sort key Postgres
 * can return a different order — or, combined with `limit`, a different row
 * set — across otherwise identical requests. One weekend alone runs to 70+
 * documents, so the limit is high enough to hold a full season.
 */
export function getFiaDecisions(season: number, limit = 2000): Promise<Row[]> {
  return get("/fia_decisions", {
    season: `eq.${season}`,
    order: "published_at.desc,id.desc",
    limit,
    select:
      "round,document_no,title,driver_number,driver_name,session,fact,decision," +
      "reason,raw_text,content_rows,issuer,content_image_urls,content_data,published_at,pdf_url",
  });
}

/**
 * Every not-yet-expired penalty-points row, driver embedded. Each award
 * expires 365 days after its own incident, independently, so filtering on
 * `expiry_date` is what makes the client-side sum a true rolling
 * 12-month total (see penaltyEntriesFromRows).
 */
export function getActivePenaltyPoints(): Promise<Row[]> {
  const today = new Date().toISOString().split("T")[0];
  return get("/penalty_points", {
    expiry_date: `gt.${today}`,
    select:
      "driver_id,points_awarded,running_total,incident_date,expiry_date," +
      "reason,drivers(driver_id,given_name,family_name,code,permanent_number)," +
      "fia_decisions(season,round,title,races(race_name))",
    order: "incident_date.asc",
  });
}

/**
 * The most recent round with any FIA document this season — null before the
 * season's first lands. Checks all four document tables because a weekend's
 * grid/tyre/upgrade sheets can appear without a steward decision.
 */
export async function getLatestFiaRound(season: number): Promise<number | null> {
  const tables = ["/fia_decisions", "/grid_entries", "/tyre_notices", "/car_upgrades"];
  const results = await Promise.all(
    tables.map((t) =>
      get(t, { season: `eq.${season}`, select: "round", order: "round.desc", limit: 1 }).catch(() => []),
    ),
  );
  let latest: number | null = null;
  for (const rows of results) {
    const r = rows[0]?.round;
    const n = r == null ? null : Number(r);
    if (n != null && Number.isFinite(n) && (latest == null || n > latest)) latest = n;
  }
  return latest;
}

/**
 * Every round of a season with at least one document, newest first, named.
 * PostgREST has no DISTINCT, so the round column is folded client-side —
 * cheap, it's one small column across a season.
 */
export async function getFiaRounds(season: number): Promise<{ round: number; raceName: string }[]> {
  const docs = await get("/fia_decisions", {
    season: `eq.${season}`,
    select: "round",
    order: "round.desc",
    limit: 5000,
  });
  const rounds = [...new Set(docs.map((d) => Number(d.round)).filter((n) => Number.isFinite(n)))].sort(
    (a, b) => b - a,
  );
  if (rounds.length === 0) return [];

  const races = await get("/races", {
    season: `eq.${season}`,
    round: `in.(${rounds.join(",")})`,
    select: "round,race_name",
    order: "round.desc",
  });
  const byRound = new Map(races.map((r) => [Number(r.round), r.race_name as string]));
  return rounds.map((round) => ({ round, raceName: byRound.get(round) ?? `Round ${round}` }));
}

export function getGridEntries(season: number, round: number): Promise<Row[]> {
  return get("/grid_entries", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    select: "driver_number,tla,driver_name,nationality,team_name,constructors(constructor_id,name)",
    order: "driver_number.asc",
  });
}

export async function getTyreNotice(season: number, round: number): Promise<Row | null> {
  const rows = await get("/tyre_notices", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    select: "mandatory_compounds,pressure_camber,notes,published_at,pdf_url",
    limit: 1,
  });
  return rows[0] ?? null;
}

export function getCarUpgrades(season: number, round: number): Promise<Row[]> {
  return get("/car_upgrades", {
    season: `eq.${season}`,
    round: `eq.${round}`,
    select: "team_name,item_number,component,reason,detail,constructors(constructor_id,name)",
    order: "team_name.asc,item_number.asc",
  });
}
