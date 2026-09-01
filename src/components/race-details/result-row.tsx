"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { teamColor } from "@/lib/theme/colors";
import { driverCode, type F1Driver, type F1Constructor } from "@/lib/models/race-details";

/**
 * Shared left-hand layout for every results row (RACE/SPRINT/QUALIFYING/
 * PRACTICE all use this) — ports the position badge + team bar + driver
 * name/code/team block that's identical across _ResultCard, _PracticeResultRow
 * and the QUALIFYING row in race_details_screen.dart, with each tab
 * supplying its own trailing metrics via `right` and its own accent color/
 * badge via `highlightColor`/`badge` (purple for fastest-lap/pole/FP-fastest,
 * team color for a plain podium position).
 */
export function ResultRow({
  position,
  driver,
  constructor,
  highlightColor,
  badge,
  right,
  below,
  chevron,
  index,
  href,
  onClick,
}: {
  position: number;
  driver: F1Driver;
  constructor: F1Constructor;
  /** Set for pole / fastest-lap / FP1-fastest rows — tints the position badge purple instead of the team color. */
  highlightColor?: string;
  badge?: ReactNode;
  right: ReactNode;
  /** RACE tab's 3-tile interval/gap/fastest-lap row, rendered below the main line. */
  below?: ReactNode;
  /** RACE tab's grid-vs-finish position-change indicator, under the position badge. */
  chevron?: ReactNode;
  index: number;
  /** Default: navigates to /driver/:id (RACE/PRACTICE). Pass onClick instead for a row that opens a detail sheet (QUALIFYING). */
  href?: string;
  onClick?: () => void;
}) {
  const team = teamColor(constructor.name);
  const podium = position <= 3;
  const badgeColor = highlightColor ?? (podium ? team : undefined);
  const code = driverCode(driver);

  const className = "flex w-full flex-col gap-3 rounded-xl border p-3 text-left transition-colors hover:border-(--color-primary)/40";
  const style = {
    borderColor: "var(--color-border)",
    backgroundColor: podium ? `color-mix(in srgb, ${team} 6%, var(--color-surface))` : "var(--color-surface)",
    animationDelay: `${Math.min(index, 20) * 20}ms`,
  };

  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex w-9 shrink-0 flex-col items-center gap-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg font-[var(--font-f1)] text-base font-black"
            style={{
              color: badgeColor ?? "var(--color-text-primary)",
              backgroundColor: badgeColor
                ? `color-mix(in srgb, ${badgeColor} 22%, transparent)`
                : "var(--color-surface-elevated)",
              border: badgeColor ? `1px solid color-mix(in srgb, ${badgeColor} 50%, transparent)` : undefined,
            }}
          >
            {position}
          </div>
          {chevron}
        </div>
        <div className="h-10 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: team }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-[var(--font-f1)] text-[15px] font-bold tracking-tight">
              {driver.familyName.toUpperCase()}
            </span>
            <span
              className="shrink-0 rounded px-[5px] py-[1px] font-[var(--font-f1)] text-[9px] font-extrabold tracking-wide"
              style={{ color: team, backgroundColor: `color-mix(in srgb, ${team} 16%, transparent)` }}
            >
              {code}
            </span>
            {badge}
          </div>
          <div className="mt-[3px] truncate text-[10px] font-bold tracking-[0.1em]" style={{ color: team }}>
            {constructor.name.toUpperCase()}
          </div>
        </div>
        {right}
      </div>
      {below}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className} style={style}>
        {body}
      </button>
    );
  }
  return (
    <Link href={href ?? `/driver/${driver.driverId}`} className={className} style={style}>
      {body}
    </Link>
  );
}

export function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black tracking-wider"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      {label}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-(--color-surface-elevated) px-2.5 py-1.5">
      <div
        className="truncate text-[13px] font-black"
        style={{ color: highlight ? "var(--color-sector-purple)" : "var(--color-text-primary)" }}
      >
        {value}
      </div>
      <div className="mt-[2px] truncate text-[9px] font-bold tracking-wider text-(--color-text-muted)">{label}</div>
    </div>
  );
}

export function PositionChange({ grid, position }: { grid: string | null; position: string }) {
  const gridN = Number(grid ?? position) || 0;
  const posN = Number(position) || 0;
  const diff = gridN - posN;
  if (diff === 0) {
    return (
      <span className="flex items-center justify-center gap-0.5 text-[10px] font-bold text-(--color-text-muted)">
        — 0
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className="flex items-center justify-center gap-0.5 text-[10px] font-bold"
      style={{ color: up ? "var(--color-success)" : "var(--color-error)" }}
    >
      {up ? "▲" : "▼"} {Math.abs(diff)}
    </span>
  );
}
