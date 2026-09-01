/**
 * Ported from GridBeat (Flutter)
 * lib/features/fia_docs/data/models/fia_docs_models.dart and
 * weekend_timeline.dart.
 *
 * Models for FIA-published weekend documents — steward decisions, the Super
 * Licence penalty-points ledger, the confirmed grid, the tyre compliance
 * notice, and car upgrades. Scraped from fia.com by f1-stats-api's
 * fia_docs.py, independent of Jolpica.
 *
 * Everything renders natively from parsed fields — GridBeat never hands the
 * user off to fia.com. That's a durable project rule, not a detail.
 */

import type { Row } from "@/lib/api/types";

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * One page of a document as it is actually laid out, rebuilt from glyph
 * positions — `rows` are visual rows, each a list of cells.
 *
 * `raw_text` is the same document flattened *column-major* by the PDF's
 * reading order, which destroys the row structure before it is ever stored;
 * no client-side heuristic can put it back. f1-stats-api's
 * `fia_docs._extract_rows()` now stores this alongside it as `content_rows`.
 */
export interface DocPage {
  page: number;
  rows: string[][];
}

// ── Steward decisions ───────────────────────────────────────────────────────

export interface FiaDecision {
  round: number | null;
  documentNo: number | null;
  title: string;
  driverNumber: number | null;
  driverName: string | null;
  session: string | null;
  fact: string | null;
  decision: string | null;
  reason: string | null;
  rawText: string | null;
  /** Null on documents ingested before _extract_rows() existed, or with no text layer. */
  contentRows: DocPage[] | null;
  issuer: string | null;
  contentImageUrls: string[] | null;
  /** Discriminated by its own `type` — fia_docs.py builds a different shape per document family. */
  contentData: Row | null;
  publishedAt: string;
  pdfUrl: string;
}

export function fiaDecisionFromRow(j: Row): FiaDecision {
  return {
    round: num(j.round),
    documentNo: num(j.document_no),
    title: (j.title as string) ?? "",
    driverNumber: num(j.driver_number),
    driverName: (j.driver_name as string) ?? null,
    session: (j.session as string) ?? null,
    fact: (j.fact as string) ?? null,
    decision: (j.decision as string) ?? null,
    reason: (j.reason as string) ?? null,
    rawText: (j.raw_text as string) ?? null,
    contentRows: (j.content_rows as DocPage[] | null) ?? null,
    issuer: (j.issuer as string) ?? null,
    contentImageUrls: (j.content_image_urls as string[]) ?? null,
    contentData: (j.content_data as Row) ?? null,
    publishedAt: (j.published_at as string) ?? "",
    pdfUrl: (j.pdf_url as string) ?? "",
  };
}

/** Carries an actual penalty, as opposed to a no-action investigation note. */
export function isPenalty(d: FiaDecision): boolean {
  return d.decision != null && !/no further action/i.test(d.decision);
}

// ── Document categories ─────────────────────────────────────────────────────

export type DocCategory = "STEWARDS" | "RESULTS" | "TECH" | "TYRES" | "PROCEDURE";

export const DOC_CATEGORY_COLOR: Record<DocCategory, string> = {
  STEWARDS: "#EF4444",
  RESULTS: "#34D399",
  TECH: "#60A5FA",
  TYRES: "#A78BFA",
  PROCEDURE: "#F59E0B",
};

/**
 * `content_data`'s discriminator wins over the title string where it exists,
 * because it's a parse result rather than a guess — e.g. "Qualifying Deleted
 * Lap Times" carries no Infringement/Decision prefix and would otherwise
 * fall through to PROCEDURE.
 */
export function categoriseDoc(d: FiaDecision): DocCategory {
  switch (d.contentData?.type) {
    case "race_classification":
    case "qualifying_classification":
    case "practice_classification":
    case "starting_grid":
    case "championship_points":
      return "RESULTS";
    case "parts_replaced":
    case "pu_elements_used":
    case "new_pu_elements":
      return "TECH";
    case "lap_time_table":
      return "STEWARDS";
  }

  const t = d.title.toLowerCase();
  if (
    t.includes("infringement") ||
    t.includes("summons") ||
    t.includes("offence") ||
    t.includes("protest") ||
    t.includes("deleted lap") ||
    t.startsWith("decision")
  ) {
    return "STEWARDS";
  }
  if (t.includes("classification") || t.includes("starting grid") || t.includes("championship points")) {
    return "RESULTS";
  }
  if (t.includes("pirelli") || t.includes("tyre")) return "TYRES";
  if (
    t.includes("scrutineering") ||
    t.includes("parc ferme") ||
    t.includes("parc fermé") ||
    t.includes("parts and parameters") ||
    t.includes("power unit")
  ) {
    return "TECH";
  }
  return "PROCEDURE";
}

// ── Penalty points ──────────────────────────────────────────────────────────

/** A driver reaching 12 active points triggers an automatic one-race ban. */
export const PENALTY_POINTS_BAN = 12;
/** Within 4 of a ban — the app's "at risk" threshold. */
export const PENALTY_POINTS_AT_RISK = 8;

export interface PenaltyAward {
  points: number;
  reason: string | null;
  incidentDate: string;
  expiryDate: string;
  raceName: string | null;
  season: number | null;
  round: number | null;
}

export interface PenaltyPointsEntry {
  driverId: string;
  driverName: string;
  code: string | null;
  permanentNumber: number | null;
  /** Sum of every award that hasn't expired — this IS the rolling 12-month total. */
  activePoints: number;
  nextExpiry: string | null;
  /** Oldest first. */
  awards: PenaltyAward[];
}

/**
 * Folds the flat `penalty_points` rows into one entry per driver.
 *
 * Sums `points_awarded` rather than reading the FIA's own `running_total`.
 * `running_total` is a snapshot taken on the day of that decision, so it
 * still counts awards that have since aged out — the Flutter provider
 * documents a real case where it reads 10 against a true active total of 4.
 * The query already filters expired rows, so the sum is the accurate figure.
 *
 * (Note: `stats_api_service.dart`'s own comment still says to prefer
 * `running_total`. It's stale — `fia_docs_provider.dart` supersedes it and
 * passes the sum. Ported to match the provider, which is the live behaviour.)
 */
export function penaltyEntriesFromRows(rows: Row[]): PenaltyPointsEntry[] {
  const byDriver = new Map<string, Row[]>();
  for (const r of rows) {
    const id = r.driver_id as string;
    if (!id) continue;
    if (!byDriver.has(id)) byDriver.set(id, []);
    byDriver.get(id)!.push(r);
  }

  const entries: PenaltyPointsEntry[] = [];
  for (const [driverId, driverRows] of byDriver) {
    const driver = driverRows[0].drivers as Row | undefined;
    const awards: PenaltyAward[] = driverRows
      .map((r) => {
        const decision = r.fia_decisions as Row | undefined;
        const race = decision?.races as Row | undefined;
        return {
          points: num(r.points_awarded) ?? 0,
          reason: (r.reason as string) ?? null,
          incidentDate: (r.incident_date as string) ?? "",
          expiryDate: (r.expiry_date as string) ?? "",
          raceName: (race?.race_name as string) ?? null,
          season: num(decision?.season),
          round: num(decision?.round),
        };
      })
      .sort((a, b) => a.incidentDate.localeCompare(b.incidentDate));

    const expiries = driverRows
      .map((r) => (r.expiry_date as string) ?? "")
      .filter(Boolean)
      .sort();

    entries.push({
      driverId,
      driverName: driver
        ? `${driver.given_name ?? ""} ${driver.family_name ?? ""}`.trim() || driverId
        : driverId,
      code: (driver?.code as string) ?? null,
      permanentNumber: num(driver?.permanent_number),
      activePoints: awards.reduce((sum, a) => sum + a.points, 0),
      nextExpiry: expiries[0] ?? null,
      awards,
    });
  }

  return entries.sort((a, b) => b.activePoints - a.activePoints);
}

// ── Confirmed grid ──────────────────────────────────────────────────────────

export interface GridEntry {
  driverNumber: number;
  tla: string | null;
  driverName: string;
  nationality: string | null;
  teamName: string | null;
  constructorId: string | null;
  constructorName: string | null;
}

export function gridEntryFromRow(j: Row): GridEntry {
  const constructor = j.constructors as Row | undefined;
  return {
    driverNumber: num(j.driver_number) ?? 0,
    tla: (j.tla as string) ?? null,
    driverName: (j.driver_name as string) ?? "",
    nationality: (j.nationality as string) ?? null,
    teamName: (j.team_name as string) ?? null,
    constructorId: (constructor?.constructor_id as string) ?? null,
    constructorName: (constructor?.name as string) ?? null,
  };
}

// ── Tyre compliance notice ──────────────────────────────────────────────────

/**
 * One compound's limits on one axle. Verified against the live payload:
 * `pressure_camber` nests axle → compound → limits, e.g.
 * `{front: {slick: {min_start_psi, camber_limit_deg, min_expected_psi}, …}}`.
 */
export interface CompoundSpec {
  minStartPsi: number | null;
  camberLimitDeg: number | null;
  minExpectedPsi: number | null;
}

export type CompoundKind = "slick" | "intermediate" | "wet";

export interface AxleSpecs {
  slick: CompoundSpec | null;
  intermediate: CompoundSpec | null;
  wet: CompoundSpec | null;
}

export interface TyreNotice {
  mandatoryCompounds: string[] | null;
  front: AxleSpecs | null;
  rear: AxleSpecs | null;
  notes: string;
  publishedAt: string;
  pdfUrl: string;
}

function compoundFromRow(j: Row | undefined): CompoundSpec | null {
  if (!j) return null;
  return {
    minStartPsi: num(j.min_start_psi),
    camberLimitDeg: num(j.camber_limit_deg),
    minExpectedPsi: num(j.min_expected_psi),
  };
}

function axleFromRow(j: Row | undefined): AxleSpecs | null {
  if (!j) return null;
  return {
    slick: compoundFromRow(j.slick as Row | undefined),
    intermediate: compoundFromRow(j.intermediate as Row | undefined),
    wet: compoundFromRow(j.wet as Row | undefined),
  };
}

export function tyreNoticeFromRow(j: Row): TyreNotice {
  const pc = j.pressure_camber as Row | undefined;
  return {
    mandatoryCompounds: (j.mandatory_compounds as string[]) ?? null,
    front: axleFromRow(pc?.front as Row | undefined),
    rear: axleFromRow(pc?.rear as Row | undefined),
    notes: (j.notes as string) ?? "",
    publishedAt: (j.published_at as string) ?? "",
    pdfUrl: (j.pdf_url as string) ?? "",
  };
}

/**
 * The notice's own bulleted compliance checklist, derived from `notes` on
 * read — `notes` stays the source of truth.
 *
 * `notes` is the PDF's whole text layer, letterhead included (title, date,
 * recipients, the Race Director's name, stray "Pstartf:" labels from the
 * pressure table). The `•` marker is the ONLY reliable anchor for the
 * checklist, so split on that alone: everything before the first bullet is
 * letterhead and gets dropped. Splitting on newlines as well — which an
 * earlier version did — turned every line of the letterhead into a bogus
 * "compliance check".
 *
 * Bullets also wrap across newlines mid-sentence, so whitespace is
 * collapsed rather than treated as a delimiter.
 */
export function complianceChecks(n: TyreNotice): string[] {
  return n.notes
    .split("•")
    .slice(1)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 2);
}

// ── Car upgrades ────────────────────────────────────────────────────────────

export interface CarUpgrade {
  teamName: string;
  constructorId: string | null;
  constructorName: string | null;
  itemNumber: number;
  component: string;
  reason: string | null;
  detail: string | null;
}

export function carUpgradeFromRow(j: Row): CarUpgrade {
  const constructor = j.constructors as Row | undefined;
  return {
    teamName: (j.team_name as string) ?? "",
    constructorId: (constructor?.constructor_id as string) ?? null,
    constructorName: (constructor?.name as string) ?? null,
    itemNumber: num(j.item_number) ?? 0,
    component: (j.component as string) ?? "",
    reason: (j.reason as string) ?? null,
    detail: (j.detail as string) ?? null,
  };
}

// ── Weekend timeline ────────────────────────────────────────────────────────
// A race weekend reveals itself gradually — on Thursday there is no Friday
// data because the FIA hasn't published it. Nothing here assumes a fixed
// Thu/Fri/Sat/Sun shape; the days come from the documents that exist.
//
// Almost every result is published twice: "Provisional X", then "Final X"
// once the stewards clear outstanding infringements. Showing both as equal
// peers is misleading, so provisionals fold into their final.

export interface TimelineDoc {
  doc: FiaDecision;
  category: DocCategory;
  /** Track-local calendar day, ISO yyyy-mm-dd. */
  day: string;
  /** A "Provisional X" replaced by a "Final X" in the same round. */
  superseded: boolean;
  displayTitle: string;
}

export interface SessionGroup {
  /** Uppercased session, or null for documents published without one. */
  session: string | null;
  docs: TimelineDoc[];
}

export interface WeekendDay {
  day: string;
  label: string;
  docs: TimelineDoc[];
  groups: SessionGroup[];
}

/** Strips the parser's numeric de-duplication suffix, e.g. "Title (2)". */
function stripDedupSuffix(title: string): string {
  return title.replace(/\s*\(\d+\)\s*$/, "").trim();
}

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Groups a round's documents into days, newest day last, newest document
 * first within a day (on a live weekend you want what just landed).
 */
export function buildWeekendDays(docs: FiaDecision[]): WeekendDay[] {
  const finals = new Set(
    docs
      .map((d) => stripDedupSuffix(d.title).toLowerCase())
      .filter((t) => t.startsWith("final "))
      .map((t) => t.slice("final ".length)),
  );

  const timeline: TimelineDoc[] = docs
    .filter((d) => d.publishedAt)
    .map((d) => {
      const display = stripDedupSuffix(d.title);
      const lower = display.toLowerCase();
      const superseded = lower.startsWith("provisional ") && finals.has(lower.slice("provisional ".length));
      return {
        doc: d,
        category: categoriseDoc(d),
        day: d.publishedAt.slice(0, 10),
        superseded,
        displayTitle: display,
      };
    });

  const byDay = new Map<string, TimelineDoc[]>();
  for (const t of timeline) {
    if (!byDay.has(t.day)) byDay.set(t.day, []);
    byDay.get(t.day)!.push(t);
  }

  return [...byDay.keys()]
    .sort()
    .map((day) => {
      const dayDocs = byDay
        .get(day)!
        .sort((a, b) => b.doc.publishedAt.localeCompare(a.doc.publishedAt));

      // Runs of consecutive docs sharing a session. `session` is only
      // populated where the FIA prints a Session field — roughly a third of
      // a weekend — so the rest groups under a generic heading rather than
      // being forced into a session it never claimed.
      const groups: SessionGroup[] = [];
      for (const d of dayDocs) {
        const key = (d.doc.session ?? "").trim().toUpperCase() || null;
        const last = groups[groups.length - 1];
        if (last && last.session === key) last.docs.push(d);
        else groups.push({ session: key, docs: [d] });
      }

      const date = new Date(`${day}T00:00:00Z`);
      return {
        day,
        label: Number.isNaN(date.getTime()) ? day : WEEKDAY[date.getUTCDay()],
        docs: dayDocs,
        groups,
      };
    });
}
