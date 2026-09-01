"use client";

import { useState } from "react";
import {
  DOC_CATEGORY_COLOR,
  isPenalty,
  type DocCategory,
  type TimelineDoc,
  type WeekendDay,
} from "@/lib/models/fia-docs";
import { DocDetail } from "@/components/stewards/doc-detail";

/**
 * The weekend's documents, day by day. Ports the WEEKEND tab of
 * fia_docs_screen.dart.
 *
 * Provisional documents that a Final has since replaced are folded away by
 * default rather than dropped — they're still part of the record, but
 * showing both as equal peers misrepresents what stands.
 */

const CATEGORIES: DocCategory[] = ["STEWARDS", "RESULTS", "TECH", "TYRES", "PROCEDURE"];

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function WeekendTab({
  days,
  totalDocs,
  season,
  weekend,
}: {
  days: WeekendDay[];
  totalDocs: number;
  season: number;
  weekend: string;
}) {
  const [filter, setFilter] = useState<DocCategory | null>(null);
  const [showSuperseded, setShowSuperseded] = useState(false);

  if (days.length === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary)">
        No FIA documents on file for {season} yet. They start landing about two days before FP1.
      </p>
    );
  }

  const visible = days
    .map((d) => ({
      ...d,
      groups: d.groups
        .map((g) => ({
          ...g,
          docs: g.docs.filter(
            (t) => (showSuperseded || !t.superseded) && (filter == null || t.category === filter),
          ),
        }))
        .filter((g) => g.docs.length > 0),
    }))
    .filter((d) => d.groups.length > 0);

  const supersededCount = days.reduce(
    (n, d) => n + d.docs.filter((t) => t.superseded).length,
    0,
  );

  return (
    <div>
      <p className="mb-4 font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-(--color-text-muted)">
        {weekend.toUpperCase()} · {totalDocs} DOCUMENTS
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip active={filter == null} onClick={() => setFilter(null)} label={`ALL ${totalDocs}`} />
        {CATEGORIES.map((c) => {
          const n = days.reduce((sum, d) => sum + d.docs.filter((t) => t.category === c).length, 0);
          if (n === 0) return null;
          return (
            <FilterChip
              key={c}
              active={filter === c}
              onClick={() => setFilter(filter === c ? null : c)}
              label={`${c} ${n}`}
              color={DOC_CATEGORY_COLOR[c]}
            />
          );
        })}
        {supersededCount > 0 && (
          <button
            onClick={() => setShowSuperseded((v) => !v)}
            className="ml-auto text-[11px] text-(--color-text-muted) underline-offset-2 hover:underline"
          >
            {showSuperseded ? "Hide" : "Show"} {supersededCount} superseded provisional
            {supersededCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {visible.map((day) => (
          <section key={day.day}>
            <div className="mb-3 flex items-baseline gap-3 border-b border-(--color-border) pb-2">
              <h2 className="font-[var(--font-f1)] text-lg font-bold tracking-wide">{day.label}</h2>
              <span className="text-xs text-(--color-text-muted)">
                {dayFmt.format(new Date(`${day.day}T00:00:00Z`))}
              </span>
              <span className="ml-auto text-xs tabular-nums text-(--color-text-muted)">
                {day.groups.reduce((n, g) => n + g.docs.length, 0)} docs
              </span>
            </div>

            {day.groups.map((g, gi) => (
              <div key={gi} className="mb-4">
                <div className="mb-2 font-[var(--font-f1)] text-[10px] font-bold tracking-[0.18em] text-(--color-text-muted)">
                  {g.session ?? "WEEKEND PAPERWORK"}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  {g.docs.map((t, i) => (
                    <DocCard key={`${t.doc.documentNo}-${i}`} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full border px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-wider transition-colors"
      style={{
        borderColor: active ? (color ?? "var(--color-primary)") : "var(--color-border)",
        backgroundColor: active
          ? `color-mix(in srgb, ${color ?? "var(--color-primary)"} 18%, transparent)`
          : "transparent",
        color: active ? (color ?? "var(--color-primary)") : "var(--color-text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

function DocCard({ t }: { t: TimelineDoc }) {
  const [open, setOpen] = useState(false);
  const color = DOC_CATEGORY_COLOR[t.category];
  const d = t.doc;
  const penalty = isPenalty(d);
  // Every document carries something — across a full weekend all 73 had at
  // least one of fact/decision/reason, raw_text, content_data or images — so
  // gating expansion on fact/decision/reason alone hid 48 of them.
  const hasBody = Boolean(
    d.fact || d.decision || d.reason || d.rawText || d.contentData || (d.contentImageUrls?.length ?? 0) > 0,
  );

  return (
    <div
      className="min-w-0 rounded-xl border bg-(--color-surface) p-3.5 transition-colors"
      style={{
        borderColor: penalty ? "color-mix(in srgb, var(--color-error) 40%, transparent)" : "var(--color-border)",
        opacity: t.superseded ? 0.55 : 1,
      }}
    >
      {/* Header mirrors the app's detail sheet: a DOC chip, the session in
          the category colour, and the publish time on the right. */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {d.documentNo != null && (
          <span className="rounded-full bg-(--color-surface-elevated) px-2.5 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-wider text-(--color-text-secondary)">
            DOC {d.documentNo}
          </span>
        )}
        <span className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.14em]" style={{ color }}>
          {d.session ? d.session.toUpperCase() : t.category}
        </span>
        {t.superseded && (
          <span className="rounded border border-(--color-text-muted)/40 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-(--color-text-muted)">
            SUPERSEDED
          </span>
        )}
        {penalty && (
          <span className="rounded border border-(--color-error)/50 bg-(--color-error)/15 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-(--color-error)">
            PENALTY
          </span>
        )}
        <span className="ml-auto text-[10px] tabular-nums text-(--color-text-muted)">
          {d.publishedAt ? timeFmt.format(new Date(d.publishedAt)) : ""}
        </span>
      </div>

      <h3 className="mt-2 font-[var(--font-f1)] text-base leading-tight font-bold sm:text-lg">{t.displayTitle}</h3>

      {hasBody && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 text-[11px] font-medium text-(--color-text-muted) underline-offset-2 hover:text-(--color-text-secondary) hover:underline"
          >
            {open ? "Hide document" : "Open document"}
          </button>
          {open && <DocDetail d={d} />}
        </>
      )}
    </div>
  );
}

