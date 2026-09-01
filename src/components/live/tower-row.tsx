"use client";

import { drsActive, formattedLapTime, teamColorHex, type CarTelemetry, type DriverSteward, type LeaderboardEntry } from "@/lib/models/live";
import { tyreColor, tyreLabel } from "@/lib/theme/colors";

const SECTOR_COLORS: Record<number, string> = {
  0: "var(--color-secondary)",
  1: "var(--color-sector-yellow)",
  2: "var(--color-sector-green)",
  3: "var(--color-sector-purple)",
};

/** Ported from GridBeat (Flutter) leaderboard_row.dart — same priority order:
 * retired -> knocked-out -> steward penalty -> steward investigation -> in-pit -> default. */
function rowTint(row: LeaderboardEntry, showKnockedOut: boolean, steward: DriverSteward | undefined): string {
  if (row.retired) return "color-mix(in srgb, var(--color-error) 4%, transparent)";
  if (showKnockedOut) return "color-mix(in srgb, var(--color-on-background) 50%, transparent)";
  if (steward?.state === "penalty") return "color-mix(in srgb, var(--color-error) 26%, transparent)";
  if (steward?.state === "underInvestigation") return "color-mix(in srgb, var(--color-warning) 14%, transparent)";
  if (row.inPit) return "color-mix(in srgb, var(--color-warning) 4%, transparent)";
  return "transparent";
}

function positionColor(row: LeaderboardEntry, showKnockedOut: boolean): string {
  if (row.retired) return "var(--color-error)";
  if (showKnockedOut) return "var(--color-text-muted)";
  if (row.lapTimeStatus === 3) return "var(--color-sector-purple)";
  if (row.position === 1) return "var(--color-on-secondary)";
  if (row.position <= 3) return "var(--color-text-secondary)";
  return "var(--color-secondary)";
}

export function TowerRow({
  row,
  telemetry,
  gridPosition,
  steward,
  onOpen,
}: {
  row: LeaderboardEntry;
  telemetry: CarTelemetry | undefined;
  gridPosition: number | undefined;
  steward: DriverSteward | undefined;
  onOpen: () => void;
}) {
  const showKnockedOut = row.knockedOut && !row.retired;
  const isInactive = row.retired || showKnockedOut;
  const knockedOutLabel = row.eliminatedInPart != null ? `Q${row.eliminatedInPart}` : "OUT";
  const delta = gridPosition != null && !row.retired ? gridPosition - row.position : null;
  const isDrsActive = telemetry != null && drsActive(telemetry.drs);
  const lapTimeColor =
    row.lapTimeStatus === 3
      ? "var(--color-sector-purple)"
      : row.lapTimeStatus === 2
        ? "var(--color-sector-green)"
        : "var(--color-on-secondary)";

  return (
    <tr
      onClick={onOpen}
      className="animate-row-in cursor-pointer border-b border-(--color-divider) last:border-0 hover:brightness-125"
      style={{ backgroundColor: rowTint(row, showKnockedOut, steward), opacity: isInactive ? 0.45 : 1 }}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: teamColorHex(row.teamColor) }} />
          <span className="tabular-nums" style={{ color: positionColor(row, showKnockedOut), fontSize: row.retired || showKnockedOut ? "10px" : undefined }}>
            {row.retired ? "DNF" : showKnockedOut ? knockedOutLabel : row.position}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5 font-medium">
          {row.shortName || row.name}
          {row.tyre !== "UNKNOWN" && (
            <span
              className="rounded px-1 py-0.5 text-[9px] font-black"
              style={{ backgroundColor: `color-mix(in srgb, ${tyreColor(row.tyre)} 20%, transparent)`, color: tyreColor(row.tyre) }}
              title={row.tyre}
            >
              {tyreLabel(row.tyre)}
            </span>
          )}
          {row.inPit && !isInactive && (
            <span className="rounded border border-(--color-warning)/45 bg-(--color-warning)/18 px-1 py-0.5 text-[8px] font-bold text-(--color-warning)">
              PIT
            </span>
          )}
          {isDrsActive && (
            <span className="rounded border border-(--color-sector-green)/40 bg-(--color-sector-green)/14 px-1 py-0.5 text-[8px] font-bold text-(--color-sector-green)">
              DRS
            </span>
          )}
          {row.hasFastestLap && <span className="text-[11px] text-(--color-sector-purple)">⚡</span>}
          {delta != null &&
            (delta === 0 ? (
              <span className="text-[10px] font-bold text-(--color-text-muted)">–</span>
            ) : (
              <span
                className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-extrabold"
                style={{ color: delta > 0 ? "var(--color-sector-green)" : "var(--color-error)" }}
              >
                {delta > 0 ? "▲" : "▼"}
                {Math.abs(delta)}
              </span>
            ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-(--color-text-muted)">
          <span className="truncate">{row.team}</span>
          {row.lapNumber != null && <span>· L{row.lapNumber}</span>}
          {telemetry != null && (
            <span className="text-(--color-text-secondary)">
              · {telemetry.speed} <span className="text-(--color-text-muted)">km/h</span>
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          {row.sectorStatus.map((s, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[s] ?? SECTOR_COLORS[0] }} />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: lapTimeColor }}>
        {formattedLapTime(row.lastLapTime)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-(--color-text-secondary)">
        {row.position === 1 ? "LEAD" : row.gapToLeader || "-"}
      </td>
    </tr>
  );
}
