"use client";

import {
  drsActive,
  type CarTelemetry,
  type DriverSteward,
  type LeaderboardEntry,
  type PitStop,
  type TyreStint,
  teamColorHex,
} from "@/lib/models/live";
import { tyreColor, tyreLabel } from "@/lib/theme/colors";

/** Raw F1 per-segment status codes, mirrors telemetry_card.dart's _segColor/_blockColor. */
function segmentColor(status: number): string {
  switch (status) {
    case 2051:
      return "var(--color-sector-purple)"; // overall best
    case 2049:
      return "var(--color-sector-green)"; // personal best
    case 2048:
      return "var(--color-sector-yellow)"; // normal timed
    case 2052:
      return "var(--color-info)"; // currently being timed
    default:
      return "color-mix(in srgb, var(--color-secondary) 30%, transparent)"; // not done
  }
}

function sectorBlockColor(status: number): string {
  switch (status) {
    case 3:
      return "var(--color-sector-purple)";
    case 2:
      return "var(--color-sector-green)";
    case 1:
      return "var(--color-sector-yellow)";
    case 4:
      return "var(--color-info)";
    default:
      return "color-mix(in srgb, var(--color-secondary) 30%, transparent)";
  }
}

/** Infer in-progress (blue): first sector with no time right after one that has a time. */
function effectiveSectorStatus(entry: LeaderboardEntry, i: number): number {
  const raw = entry.sectorStatus[i] ?? 0;
  if (raw !== 0) return raw;
  if (i > 0) {
    if (entry.sectorTimes[i - 1] != null) return 4;
  } else if (entry.lapNumber != null && entry.sectorTimes.every((t) => t == null)) {
    return 4;
  }
  return 0;
}

/**
 * Ported from the driver-detail sheet the Flutter app opens on tap — here
 * it's an always-present in-flow panel instead, not a modal takeover. A
 * click-to-open overlay works on mobile (one thing on screen at a time) but
 * fights the web dashboard's own "everything visible together" layout: the
 * panel now just re-renders in place with whichever driver's row was last
 * clicked in the Tower, defaulting to the race leader, with no backdrop and
 * nothing else on screen dimmed or covered.
 */
export function TelemetryPanel({
  entry,
  telemetry,
  pitStops,
  steward,
}: {
  entry: LeaderboardEntry | null;
  telemetry: CarTelemetry | undefined;
  pitStops: PitStop[];
  steward: DriverSteward | undefined;
}) {
  if (!entry) {
    return (
      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
        <span className="text-xs font-bold tracking-widest text-(--color-text-muted)">DRIVER TELEMETRY</span>
        <div className="mt-3 flex h-24 items-center justify-center text-center text-sm text-(--color-text-muted)">
          Select a driver in the Tower to see live telemetry.
        </div>
      </div>
    );
  }

  const teamColor = teamColorHex(entry.teamColor);
  const isDrsActive = telemetry != null && drsActive(telemetry.drs);
  const stewardActive = steward != null && steward.state !== "none";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
      <span className="text-xs font-bold tracking-widest text-(--color-text-muted)">DRIVER TELEMETRY</span>

      {stewardActive && <StewardBanner steward={steward} />}

        {/* Driver header */}
        <div
          className="rounded-xl border p-4"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${teamColor} 20%, transparent), color-mix(in srgb, ${teamColor} 5%, transparent))`,
            borderColor: `color-mix(in srgb, ${teamColor} 30%, transparent)`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-bold">{entry.name}</div>
              <div className="text-sm text-(--color-text-secondary)">{entry.team}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-3xl font-bold" style={{ color: teamColor }}>
                P{entry.position}
              </span>
              {entry.tyre !== "UNKNOWN" && <TyreBadge compound={entry.tyre} />}
            </div>
          </div>
        </div>

        {telemetry ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <TelemetryCell label="SPEED" value={telemetry.speed} unit="km/h" color="var(--color-info)" />
              <TelemetryCell label="RPM" value={telemetry.rpm} unit="rpm" color="var(--color-warning)" />
              <TelemetryCell label="GEAR" value={telemetry.gear} unit="" color="var(--color-sector-green)" large />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <BarGauge label="THROTTLE" value={telemetry.throttle / 100} color="var(--color-sector-green)" />
              <BarGauge label="BRAKE" value={telemetry.brake} color="var(--color-error)" />
              <DrsCell active={isDrsActive} />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-(--color-secondary)/20 bg-(--color-on-background) p-6 text-center text-sm text-(--color-text-secondary)">
            No live telemetry
            <br />
            (session not active)
          </div>
        )}

        <SectorTimes entry={entry} />

      {entry.stints.length > 0 && <TyreStrategy stints={entry.stints} pitStops={pitStops} />}
    </div>
  );
}

function TyreBadge({ compound }: { compound: string }) {
  const c = tyreColor(compound);
  return (
    <span
      className="flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[11px] font-black"
      style={{ backgroundColor: `color-mix(in srgb, ${c} 15%, transparent)`, borderColor: c, color: c }}
    >
      {tyreLabel(compound)}
    </span>
  );
}

function TelemetryCell({
  label,
  value,
  unit,
  color,
  large,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-lg bg-(--color-on-background) p-3 text-center">
      <div className="text-[10px] font-medium text-(--color-text-muted)">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${large ? "text-4xl" : "text-2xl"}`} style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-xs font-medium text-(--color-text-muted)">{unit}</span>}
      </div>
    </div>
  );
}

function BarGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="rounded-lg bg-(--color-on-background) p-3 text-center">
      <div className="text-[10px] font-medium text-(--color-text-muted)">{label}</div>
      <div className="mt-1 text-sm font-semibold" style={{ color }}>
        {Math.round(clamped * 100)}%
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${clamped * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DrsCell({ active }: { active: boolean }) {
  const color = active ? "var(--color-sector-green)" : "var(--color-secondary)";
  return (
    <div
      className="rounded-lg p-3 text-center"
      style={{
        backgroundColor: active ? "color-mix(in srgb, var(--color-sector-green) 10%, transparent)" : "var(--color-on-background)",
        border: `1px solid ${active ? "color-mix(in srgb, var(--color-sector-green) 40%, transparent)" : "color-mix(in srgb, var(--color-secondary) 20%, transparent)"}`,
      }}
    >
      <div className="text-[10px] font-medium text-(--color-text-muted)">DRS</div>
      <div className="mt-1.5 text-xl" style={{ color }}>
        {active ? "●" : "○"}
      </div>
      <div className="text-[10px] font-semibold" style={{ color }}>
        {active ? "OPEN" : "CLOSED"}
      </div>
    </div>
  );
}

function SectorTimes({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="rounded-lg bg-(--color-on-background) p-3.5">
      <div className="text-[10px] font-bold tracking-widest text-(--color-text-muted)">SECTORS</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => {
          const time = entry.sectorTimes[i] ?? null;
          const status = effectiveSectorStatus(entry, i);
          const color = sectorBlockColor(status);
          const segments = entry.segmentStatus[i] ?? [];
          const dots = segments.length > 0 ? segments : [0, 0, 0];
          return (
            <div key={i}>
              <div className="text-[9px] text-(--color-text-muted)">S{i + 1}</div>
              <div className="mt-1 flex gap-0.5">
                {dots.map((s, j) => (
                  <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segmentColor(s) }} />
                ))}
              </div>
              <div className="mt-1 text-xs" style={{ color: time != null ? color : "var(--color-secondary)" }}>
                {time != null ? time.toFixed(3) : "-"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-(--color-divider) pt-2">
        <span className="text-xs text-(--color-secondary)">LAST LAP</span>
        <span
          className="text-sm"
          style={{
            color:
              entry.lapTimeStatus === 3
                ? "var(--color-sector-purple)"
                : entry.lapTimeStatus === 2
                  ? "var(--color-sector-green)"
                  : "var(--color-on-secondary)",
          }}
        >
          {entry.lastLapTime != null ? entry.lastLapTime.toFixed(3) : "-"}
        </span>
      </div>
    </div>
  );
}

function TyreStrategy({ stints, pitStops }: { stints: TyreStint[]; pitStops: PitStop[] }) {
  // flex-grow already normalizes proportions across siblings, so the bar
  // below needs each stint's raw lap count, not a pre-divided fraction.
  const startLaps: number[] = [];
  for (let i = 0, cumulative = 1; i < stints.length; i++) {
    startLaps.push(cumulative);
    cumulative += stints[i].lapsRun;
  }

  return (
    <div className="rounded-xl border border-(--color-divider) bg-(--color-on-background) p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] text-(--color-text-muted)">◐</span>
        <span className="text-[10px] font-bold tracking-widest text-(--color-text-muted)">TYRE STRATEGY</span>
        <div className="flex-1" />
        {pitStops.length > 0 && (
          <span className="rounded border border-(--color-warning)/40 bg-(--color-warning)/12 px-2 py-0.5 text-[10px] font-extrabold text-(--color-warning)">
            {pitStops.length} PIT{pitStops.length === 1 ? "" : "S"}
          </span>
        )}
      </div>

      <div className="mt-3.5 flex h-2.5 overflow-hidden rounded-md">
        {stints.map((s, i) => {
          const laps = Math.max(s.lapsRun, 1);
          const c = tyreColor(s.compound);
          return (
            <div
              key={i}
              className={i < stints.length - 1 ? "mr-0.5" : ""}
              style={{ flex: laps, background: `linear-gradient(90deg, ${c}, color-mix(in srgb, ${c} 75%, transparent))` }}
            />
          );
        })}
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {stints.map((s, i) => {
          const c = tyreColor(s.compound);
          const isCurrent = i === stints.length - 1;
          const startLap = startLaps[i];
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${c} 15%, transparent)`,
                  border: `${isCurrent ? 2 : 1}px solid ${c}`,
                }}
              >
                <span className="text-[13px] font-black" style={{ color: c }}>
                  {tyreLabel(s.compound)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold" style={{ color: c }}>
                    {s.compound}
                  </span>
                  <span
                    className="rounded px-1 py-0.5 text-[9px] tracking-wide"
                    style={{
                      backgroundColor: s.isNew
                        ? "color-mix(in srgb, var(--color-sector-green) 15%, transparent)"
                        : "color-mix(in srgb, var(--color-text-muted) 15%, transparent)",
                      color: s.isNew ? "var(--color-sector-green)" : "var(--color-text-muted)",
                    }}
                  >
                    {s.isNew ? "NEW" : "USED"}
                  </span>
                  {isCurrent && (
                    <span className="rounded border border-(--color-sector-green)/40 bg-(--color-sector-green)/15 px-1 py-0.5 text-[9px] tracking-wide text-(--color-sector-green)">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-(--color-text-muted)">
                  {s.lapsRun > 0 ? `Lap ${startLap} → ${startLap + s.lapsRun - 1} · ${s.lapsRun} laps` : `From lap ${startLap}`}
                </div>
              </div>
              {s.lapsRun > 0 && (
                <span
                  className="shrink-0 rounded-md px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: `color-mix(in srgb, ${c} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 25%, transparent)`, color: c }}
                >
                  {s.lapsRun} L
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StewardBanner({ steward }: { steward: DriverSteward }) {
  const isPenalty = steward.state === "penalty";
  const color = isPenalty ? "var(--color-error)" : "var(--color-warning)";
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3.5"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 55%, transparent)` }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` }}
      >
        {isPenalty ? "⚖" : "⚠"}
      </div>
      <div>
        <div className="text-[11px] font-black tracking-widest" style={{ color }}>
          {isPenalty ? "PENALTY" : "UNDER INVESTIGATION"}
        </div>
        {steward.summary && <div className="mt-1 text-sm text-(--color-on-secondary)">{steward.summary}</div>}
      </div>
    </div>
  );
}
