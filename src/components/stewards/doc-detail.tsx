"use client";

import { useState } from "react";
import type { Row } from "@/lib/api/types";
import type { DocPage, FiaDecision } from "@/lib/models/fia-docs";
import { isPenalty } from "@/lib/models/fia-docs";
import { FormattedText } from "@/components/stewards/formatted-text";
import { PdfLayout } from "@/components/stewards/pdf-layout";

/**
 * A document's body, matching the app's detail sheet: issuer, the driver it
 * concerns, then FACT / DECISION / REASON. Never a link out to fia.com.
 *
 * **Only the meaningful content is shown by default.** Most of these PDFs
 * carry a text layer that is mostly letterhead and flattened table cells —
 * dumping it verbatim buries the two or three sentences that actually
 * matter. So parsed fields and structured tables lead; the raw text layer
 * is kept, but behind an explicit toggle, and only for documents that have
 * nothing better to show.
 */

const STRUCTURED = new Set([
  "race_classification",
  "practice_classification",
  "qualifying_classification",
  "starting_grid",
  "championship_points",
  "pu_elements_used",
  "new_pu_elements",
  "parts_replaced",
  "lap_time_table",
]);

export function DocDetail({ d }: { d: FiaDecision }) {
  const cd = d.contentData;
  const type = cd?.type as string | undefined;
  const hasNarrative = Boolean(d.fact || d.decision || d.reason);
  const hasStructured = Boolean(cd && type && STRUCTURED.has(type));
  const hasImages = (d.contentImageUrls?.length ?? 0) > 0;

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-5 border-t border-(--color-divider) pt-4">
      {d.issuer && (
        <p className="-mb-2 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.16em] text-(--color-text-muted)">
          ISSUED BY {d.issuer.toUpperCase()}
        </p>
      )}

      {d.driverName && (
        <div className="rounded-full border border-(--color-primary)/40 bg-(--color-primary)/10 px-4 py-2">
          <span className="font-[var(--font-f1)] text-sm font-bold text-(--color-primary)">
            {d.driverNumber != null && `#${d.driverNumber} · `}
            {d.driverName}
          </span>
        </div>
      )}

      {d.fact && (
        <Section label="FACT">
          <FormattedText text={d.fact} />
        </Section>
      )}
      {d.decision && (
        <Section label="DECISION">
          <div style={{ color: isPenalty(d) ? "var(--color-error)" : "var(--color-text-primary)" }}>
            <FormattedText text={d.decision} emphasis />
          </div>
        </Section>
      )}
      {d.reason && (
        <Section label="REASON">
          <FormattedText text={d.reason} />
        </Section>
      )}

      {cd && type === "race_classification" && <Classification rows={cd.results as Row[]} kind="race" />}
      {cd && type === "practice_classification" && <Classification rows={cd.results as Row[]} kind="practice" />}
      {cd && type === "qualifying_classification" && <Qualifying rows={cd.results as Row[]} />}
      {cd && type === "starting_grid" && (
        <StartingGrid grid={cd.grid as Row[]} pitLane={(cd.pit_lane_starters as Row[]) ?? []} />
      )}
      {cd && type === "championship_points" && (
        <Championship drivers={cd.drivers as Row[]} constructors={cd.constructors as Row[]} />
      )}
      {cd && type === "pu_elements_used" && (
        <PuUsed drivers={cd.drivers as Row[]} elements={cd.elements as string[]} />
      )}
      {cd && type === "new_pu_elements" && <NewPu sections={cd.sections as Row[]} />}
      {cd && type === "parts_replaced" && <PartsReplaced intro={cd.intro as string} teams={cd.teams as Row[]} />}
      {cd && type === "lap_time_table" && <LapTimes intro={cd.intro as string} rows={cd.rows as Row[]} />}

      {/* Text and diagrams are independent, not either/or — a document can
          have parsed content AND a page-sized diagram that is genuinely
          separate content. */}
      {hasImages && (
        <Section label="DOCUMENT">
          <div className="flex flex-col gap-2">
            {d.contentImageUrls!.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- FIA-hosted page scan, arbitrary dimensions */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="w-full rounded-lg border border-(--color-divider) transition-opacity hover:opacity-90"
                />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Nothing parsed: rebuild the document from the PDF's own layout,
          which still has the rows the stored text lost. */}
      {!hasNarrative && !hasStructured && (d.pdfUrl || d.rawText) && (
        <DocumentBody pdfUrl={d.pdfUrl} rawText={d.rawText} rows={d.contentRows} bare={!hasImages} />
      )}
    </div>
  );
}

/**
 * The document body for anything without parsed fields.
 *
 * Prefers the PDF's own layout — `raw_text` is the text layer flattened
 * column-major, so it has lost the rows that make a form or chart legible.
 * The flattened text stays available as a fallback for documents whose PDF
 * can't be read.
 */
function DocumentBody({
  pdfUrl,
  rawText,
  rows,
  bare,
}: {
  pdfUrl: string;
  rawText: string | null;
  rows: DocPage[] | null;
  bare: boolean;
}) {
  const [showFlat, setShowFlat] = useState(false);

  return (
    <Section label="DOCUMENT">
      {bare && (
        <p className="mb-3 text-[12px] text-(--color-text-muted)">
          No steward decision on this one — it&apos;s a form or a chart, shown as it&apos;s laid out in the PDF.
        </p>
      )}

      {pdfUrl ? (
        <PdfLayout pdfUrl={pdfUrl} pages={rows} />
      ) : rawText ? (
        <FormattedText text={rawText} />
      ) : null}

      {pdfUrl && rawText && (
        <div className="mt-4">
          <button
            onClick={() => setShowFlat((v) => !v)}
            aria-expanded={showFlat}
            className="rounded-full border border-(--color-border) px-3 py-1.5 font-[var(--font-f1)] text-[10px] font-bold tracking-wider text-(--color-text-secondary) transition-colors hover:border-white/30 hover:text-white"
          >
            {showFlat ? "HIDE EXTRACTED TEXT" : "SHOW EXTRACTED TEXT"}
          </button>
          {showFlat && (
            <div className="mt-3 rounded-lg border border-(--color-divider) bg-black/30 p-3">
              <FormattedText text={rawText} />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/** Ports `_DetailFieldLabel` — a red small-caps rule above each block. */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h4 className="mb-2 font-[var(--font-f1)] text-[11px] font-extrabold tracking-[0.16em] text-(--color-primary)">
        {label}
      </h4>
      {children}
    </section>
  );
}

function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 min-w-0 overflow-x-auto px-1">{children}</div>;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`pb-2 font-[var(--font-f1)] text-[9px] font-medium tracking-[0.14em] whitespace-nowrap text-(--color-text-muted) ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Pos({ n }: { n: unknown }) {
  return <td className="py-1.5 pr-3 font-[var(--font-f1)] text-xs font-bold tabular-nums">{String(n ?? "—")}</td>;
}

function Classification({ rows, kind }: { rows: Row[]; kind: "race" | "practice" }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <Scroll>
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead>
          <tr>
            <Th>POS</Th>
            <Th>NO</Th>
            <Th>DRIVER</Th>
            <Th>TEAM</Th>
            <Th right>LAPS</Th>
            <Th right>{kind === "race" ? "TIME" : "BEST"}</Th>
            {kind === "race" ? <Th right>PTS</Th> : <Th right>GAP</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-(--color-divider)">
              <Pos n={r.position} />
              <td className="py-1.5 pr-3 tabular-nums text-(--color-text-muted)">{String(r.car_number ?? "")}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{String(r.driver ?? "")}</td>
              <td className="py-1.5 pr-3 text-(--color-text-secondary)">{String(r.team ?? r.entrant ?? "")}</td>
              <td className="py-1.5 text-right tabular-nums text-(--color-text-secondary)">{String(r.laps ?? "")}</td>
              <td className="py-1.5 pl-3 text-right tabular-nums">
                {String(r.result ?? r.time ?? r.fastest_lap ?? "—")}
              </td>
              <td className="py-1.5 pl-3 text-right tabular-nums text-(--color-text-secondary)">
                {kind === "race" ? String(r.points ?? 0) : String(r.gap ?? r.interval ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function Qualifying({ rows }: { rows: Row[] }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <Scroll>
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr>
            <Th>POS</Th>
            <Th>NO</Th>
            <Th>DRIVER</Th>
            <Th right>Q1</Th>
            <Th right>Q2</Th>
            <Th right>Q3</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-(--color-divider)">
              <Pos n={r.position} />
              <td className="py-1.5 pr-3 tabular-nums text-(--color-text-muted)">{String(r.car_number ?? "")}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{String(r.driver ?? "")}</td>
              {(["q1_time", "q2_time", "q3_time"] as const).map((k) => (
                <td key={k} className="py-1.5 pl-3 text-right tabular-nums text-(--color-text-secondary)">
                  {String(r[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function StartingGrid({ grid, pitLane }: { grid: Row[]; pitLane: Row[] }) {
  if (!Array.isArray(grid)) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {grid.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg bg-(--color-surface-elevated) px-3 py-2">
            <span className="w-6 shrink-0 text-right font-[var(--font-f1)] text-sm font-bold tabular-nums">
              {String(r.grid_position ?? i + 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{String(r.driver ?? "")}</span>
              <span className="block truncate text-[11px] text-(--color-text-muted)">{String(r.team ?? "")}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-(--color-text-secondary)">
              {String(r.qualifying_time ?? "")}
            </span>
          </div>
        ))}
      </div>
      {pitLane.length > 0 && (
        <div>
          <div className="mb-1.5 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-warning)">
            PIT LANE START
          </div>
          <ul className="flex flex-col gap-1">
            {pitLane.map((r, i) => (
              <li key={i} className="text-sm text-(--color-text-secondary)">
                {String(r.driver ?? "")} · {String(r.team ?? "")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Championship({ drivers, constructors }: { drivers: Row[]; constructors: Row[] }) {
  const table = (title: string, rows: Row[]) =>
    Array.isArray(rows) && rows.length > 0 ? (
      <div className="min-w-0 flex-1">
        <div className="mb-2 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">{title}</div>
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <li key={i} className="flex items-baseline gap-2.5 border-t border-(--color-divider) py-1.5 text-sm">
              <span className="w-5 shrink-0 text-right font-[var(--font-f1)] text-xs font-bold tabular-nums text-(--color-text-muted)">
                {String(r.rank ?? i + 1)}
              </span>
              <span className="min-w-0 flex-1 truncate">{String(r.name ?? "")}</span>
              <span className="shrink-0 font-[var(--font-f1)] font-bold tabular-nums">{String(r.total ?? 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
      {table("DRIVERS", drivers)}
      {table("CONSTRUCTORS", constructors)}
    </div>
  );
}

function PuUsed({ drivers, elements }: { drivers: Row[]; elements: string[] }) {
  if (!Array.isArray(drivers) || !Array.isArray(elements)) return null;
  return (
    <Scroll>
      <table className="w-full min-w-[30rem] text-left text-sm">
        <thead>
          <tr>
            <Th>DRIVER</Th>
            {elements.map((e) => (
              <Th key={e} right>
                {e}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d, i) => (
            <tr key={i} className="border-t border-(--color-divider)">
              <td className="py-1.5 pr-3 whitespace-nowrap">
                {String(d.driver ?? "")}
                <span className="ml-1.5 text-[11px] text-(--color-text-muted)">{String(d.team ?? "")}</span>
              </td>
              {((d.values as number[]) ?? []).map((v, j) => (
                <td key={j} className="py-1.5 pl-3 text-right tabular-nums text-(--color-text-secondary)">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function NewPu({ sections }: { sections: Row[] }) {
  if (!Array.isArray(sections)) return null;
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s, i) => {
        const drivers = (s.drivers as Row[]) ?? [];
        if (drivers.length === 0) return null;
        return (
          <div key={i}>
            <div className="mb-1.5 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-info)">
              {String(s.code ?? "")} · {String(s.label ?? "").toUpperCase()}
            </div>
            <ul className="flex flex-col gap-1">
              {drivers.map((d, j) => (
                <li key={j} className="flex items-baseline gap-2 text-sm">
                  <span className="text-(--color-text-secondary)">{String(d.driver ?? "")}</span>
                  <span className="text-[11px] text-(--color-text-muted)">{String(d.team ?? "")}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-(--color-text-muted)">
                    previously used {String(d.previously_used ?? "—")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function PartsReplaced({ intro, teams }: { intro: string; teams: Row[] }) {
  // The parser sometimes splits the intro sentence into a bogus team with no
  // cars — skip those rather than rendering a fragment as a heading.
  const real = (Array.isArray(teams) ? teams : []).filter((t) => ((t.cars as Row[]) ?? []).length > 0);
  return (
    <div className="flex flex-col gap-3">
      {intro && <p className="text-sm text-(--color-text-secondary)">{intro}</p>}
      {real.map((t, i) => (
        <div key={i}>
          <div className="mb-1 font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">
            {String(t.team ?? "").toUpperCase()}
          </div>
          <ul className="flex flex-col gap-0.5">
            {((t.cars as Row[]) ?? []).map((c, j) => (
              <li key={j} className="text-sm text-(--color-text-secondary)">
                {Object.entries(c)
                  .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LapTimes({ intro, rows }: { intro: string; rows: Row[] }) {
  return (
    <div className="flex flex-col gap-3">
      {intro && <p className="text-sm text-(--color-text-secondary)">{intro}</p>}
      {Array.isArray(rows) && rows.length > 0 && (
        <Scroll>
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr>
                <Th>NO</Th>
                <Th>DRIVER</Th>
                <Th right>TURN</Th>
                <Th right>LAP TIME</Th>
                <Th right>TIME OF DAY</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-(--color-divider)">
                  <td className="py-1.5 pr-3 tabular-nums text-(--color-text-muted)">{String(r.car_number ?? "")}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{String(r.driver ?? "")}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-(--color-text-secondary)">
                    {String(r.turn ?? "—")}
                  </td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">{String(r.lap_time ?? "—")}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-(--color-text-muted)">
                    {String(r.time_of_day ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      )}
    </div>
  );
}
