"use client";

import { useState } from "react";
import {
  PENALTY_POINTS_AT_RISK,
  PENALTY_POINTS_BAN,
  type PenaltyPointsEntry,
} from "@/lib/models/fia-docs";

/**
 * The Super Licence danger zone. Ports the POINTS tab of fia_docs_screen.dart.
 *
 * `activePoints` is the sum of every award that hasn't expired — each
 * expires 365 days after its own incident, independently. That's
 * deliberately not the FIA's `running_total`, which is a snapshot from the
 * day of its decision and still counts awards that have since aged out
 * (live data: Bearman reads 10 there against a true active total of 4).
 */

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function riskColor(points: number): string {
  if (points >= PENALTY_POINTS_BAN) return "var(--color-error)";
  if (points >= PENALTY_POINTS_AT_RISK) return "var(--color-error)";
  if (points >= 4) return "var(--color-warning)";
  return "var(--color-sector-green)";
}

export function PointsTab({ entries }: { entries: PenaltyPointsEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-(--color-text-secondary)">
        No driver is carrying active penalty points. Awards expire 365 days after the incident.
      </p>
    );
  }

  const atRisk = entries.filter((e) => e.activePoints >= PENALTY_POINTS_AT_RISK).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-4 py-3">
        <Stat value={entries.length} label="CARRYING POINTS" />
        <Stat value={atRisk} label="WITHIN 4 OF A BAN" color="var(--color-error)" />
        <p className="ml-auto max-w-sm text-[11px] leading-snug text-(--color-text-muted)">
          {PENALTY_POINTS_BAN} active points triggers an automatic one-race ban. Each award expires 365 days after its
          own incident.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <DriverRow key={e.driverId} entry={e} />
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <div
        className="font-[var(--font-f1)] text-2xl font-bold tabular-nums"
        style={{ color: color ?? "var(--color-text-primary)" }}
      >
        {value}
      </div>
      <div className="font-[var(--font-f1)] text-[9px] tracking-[0.16em] text-(--color-text-muted)">{label}</div>
    </div>
  );
}

function DriverRow({ entry }: { entry: PenaltyPointsEntry }) {
  const [open, setOpen] = useState(false);
  const color = riskColor(entry.activePoints);

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface)">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left sm:gap-4"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-[var(--font-f1)] text-base font-black tabular-nums sm:h-10 sm:w-10 sm:text-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          {entry.activePoints}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{entry.driverName}</span>
            {entry.code && (
              <span className="font-[var(--font-f1)] text-[10px] tracking-wider text-(--color-text-muted)">
                {entry.code}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11px] text-(--color-text-muted)">
            {entry.awards.length} award{entry.awards.length === 1 ? "" : "s"}
            {entry.nextExpiry && ` · next expires ${dateFmt.format(new Date(entry.nextExpiry))}`}
          </span>
        </span>

        {/* Progress toward the 12-point ban */}
        <span className="hidden w-32 shrink-0 sm:block">
          <span className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
            <span
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (entry.activePoints / PENALTY_POINTS_BAN) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </span>
          <span className="mt-1 block text-right text-[9px] tabular-nums text-(--color-text-muted)">
            {entry.activePoints} / {PENALTY_POINTS_BAN}
          </span>
        </span>

        <span className="shrink-0 text-(--color-text-muted)">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <ul className="border-t border-(--color-divider) px-4 py-3">
          {entry.awards.map((a, i) => (
            <li key={i} className="flex gap-3 border-b border-(--color-divider) py-2.5 last:border-0">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded font-[var(--font-f1)] text-xs font-bold tabular-nums"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-warning) 16%, transparent)", color: "var(--color-warning)" }}
              >
                {a.points}
              </span>
              <div className="min-w-0">
                {a.reason && <p className="text-sm leading-snug text-(--color-text-secondary)">{a.reason}</p>}
                <p className="mt-0.5 text-[11px] text-(--color-text-muted)">
                  {a.raceName ?? "Unknown round"}
                  {a.incidentDate && ` · ${dateFmt.format(new Date(a.incidentDate))}`}
                  {a.expiryDate && ` · expires ${dateFmt.format(new Date(a.expiryDate))}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
