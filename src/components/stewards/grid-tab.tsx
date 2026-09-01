"use client";

import { useState } from "react";
import { teamColor } from "@/lib/theme/colors";
import type { Row } from "@/lib/api/types";
import type { FiaDecision, GridEntry } from "@/lib/models/fia-docs";

/**
 * The actual starting grid for the weekend's sessions — ports the GRID tab
 * of fia_docs_screen.dart.
 *
 * Read from the `starting_grid` documents the FIA publishes (grid position,
 * driver, team, the qualifying time that earned the slot, plus anyone
 * starting from the pit lane), not from `grid_entries` — that table is the
 * entry list, i.e. who is *permitted* to start, which is a different
 * question. A sprint weekend publishes more than one grid, so they're
 * selectable, newest first.
 *
 * Laid out staggered, the way a real grid is drawn: odd positions on the
 * racing line, even positions set back.
 */

interface GridDoc {
  title: string;
  publishedAt: string;
  grid: Row[];
  pitLane: Row[];
}

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function GridTab({
  docs,
  entries,
  weekend,
}: {
  docs: FiaDecision[];
  entries: GridEntry[];
  weekend: string;
}) {
  const grids: GridDoc[] = docs
    .filter((d) => d.contentData?.type === "starting_grid")
    .map((d) => ({
      title: d.title.replace(/\s*\(\d+\)\s*$/, "").trim(),
      publishedAt: d.publishedAt,
      grid: (d.contentData!.grid as Row[]) ?? [],
      pitLane: (d.contentData!.pit_lane_starters as Row[]) ?? [],
    }))
    .filter((g) => g.grid.length > 0)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const [picked, setPicked] = useState(0);

  if (grids.length === 0) {
    return <EntryList entries={entries} weekend={weekend} />;
  }

  const g = grids[Math.min(picked, grids.length - 1)];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-(--color-text-muted)">
          {weekend.toUpperCase()} · {g.grid.length} CARS
        </p>
        {grids.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {grids.map((x, i) => (
              <button
                key={i}
                onClick={() => setPicked(i)}
                aria-pressed={i === picked}
                className={`rounded-full border px-3 py-1 font-[var(--font-f1)] text-[10px] font-bold tracking-wider transition-colors ${
                  i === picked
                    ? "border-(--color-primary) bg-(--color-primary)/15 text-(--color-primary)"
                    : "border-(--color-border) text-(--color-text-secondary)"
                }`}
              >
                {x.title.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-[11px] text-(--color-text-muted)">
          {g.publishedAt ? timeFmt.format(new Date(g.publishedAt)) : ""}
        </span>
      </div>

      {/* Staggered grid — odd slots on the racing line, even set back */}
      <ol className="mx-auto flex max-w-2xl flex-col gap-2">
        {g.grid.map((r, i) => {
          const pos = Number(r.grid_position ?? i + 1);
          const team = String(r.team ?? "");
          const color = teamColor(team);
          const offset = pos % 2 === 0;
          return (
            <li
              key={i}
              className="flex"
              style={{ paddingLeft: offset ? "12%" : 0, paddingRight: offset ? 0 : "12%" }}
            >
              <div
                className="flex w-full items-center gap-3 rounded-xl border bg-(--color-surface) px-3 py-2.5"
                style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-[var(--font-f1)] text-sm font-black tabular-nums"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
                >
                  {pos}
                </span>
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{String(r.driver ?? "")}</span>
                  <span className="block truncate text-[11px] text-(--color-text-muted)">{team}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-[var(--font-f1)] text-xs tabular-nums text-(--color-text-secondary)">
                    {String(r.qualifying_time ?? "—")}
                  </span>
                  <span className="block text-[10px] tabular-nums text-(--color-text-muted)">
                    #{String(r.car_number ?? "")}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {g.pitLane.length > 0 && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-(--color-warning)/40 bg-(--color-warning)/10 p-4">
          <div className="font-[var(--font-f1)] text-[9px] font-bold tracking-[0.18em] text-(--color-warning)">
            PIT LANE START
          </div>
          <ul className="mt-2 flex flex-col gap-1">
            {g.pitLane.map((r, i) => (
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

/** Before qualifying there's no grid yet — show who's entered instead. */
function EntryList({ entries, weekend }: { entries: GridEntry[]; weekend: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-(--color-text-secondary)">No grid or entry list published for this round yet.</p>;
  }

  const byTeam = new Map<string, GridEntry[]>();
  for (const e of entries) {
    const key = e.constructorName ?? e.teamName ?? "—";
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(e);
  }

  return (
    <div>
      <p className="mb-1 font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-(--color-text-muted)">
        {weekend.toUpperCase()} · {entries.length} CARS ENTERED
      </p>
      <p className="mb-4 text-[11px] text-(--color-text-muted)">
        No starting grid published yet — showing the confirmed entry list.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...byTeam.entries()].map(([team, drivers]) => {
          const color = teamColor(team);
          return (
            <div key={team} className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-4 w-1 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-[var(--font-f1)] text-sm font-bold" style={{ color }}>
                  {team}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {drivers.map((d) => (
                  <li key={d.driverNumber} className="flex items-center gap-3">
                    <span className="w-7 shrink-0 text-right font-[var(--font-f1)] text-lg font-bold tabular-nums text-(--color-text-muted)">
                      {d.driverNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.driverName}</span>
                      <span className="block text-[11px] text-(--color-text-muted)">
                        {d.tla}
                        {d.nationality && ` · ${d.nationality}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
