"use client";

import type { ComputedStat } from "@/lib/api/types";
import { circuitLiveStats, maidenPodiums, displayNameFor } from "@/lib/models/circuit-stats";

/** Ports `_CareerFirstsCard` — maiden win/pole (single) + maiden podiums (can be several). */
export function CareerFirstsCard({
  stats,
  accent,
  names,
}: {
  stats: ComputedStat[];
  accent: string;
  names: Record<string, string>;
}) {
  const live = circuitLiveStats(stats, names);
  const podiums = maidenPodiums(stats, names);

  if (!live.maidenWin && !live.maidenPole && podiums.length === 0) return null;

  return (
    <div className="rounded-xl bg-(--color-surface-elevated) p-4">
      <div className="mb-3 text-[9px] font-black tracking-[0.16em]" style={{ color: accent }}>
        CAREER FIRSTS HERE
      </div>
      <div className="flex flex-col gap-3">
        {live.maidenWin && (
          <FirstRow icon="🏆" label="MAIDEN WIN" name={displayNameFor(live.maidenWin.driverId, names)} year={String(live.maidenWin.season)} accent={accent} />
        )}
        {live.maidenPole && (
          <FirstRow icon="🚩" label="MAIDEN POLE" name={displayNameFor(live.maidenPole.driverId, names)} year={String(live.maidenPole.season)} accent={accent} />
        )}
        {podiums.length > 0 && (
          <div>
            <div className="mb-1.5 text-[9px] font-extrabold tracking-[0.14em]" style={{ color: accent }}>
              MAIDEN PODIUMS
            </div>
            <div className="flex flex-col gap-1.5">
              {podiums.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="min-w-0 truncate text-[13px]">{p.name}</span>
                  <span className="shrink-0 text-[12px] text-(--color-text-muted)">{p.season}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FirstRow({ icon, label, name, year, accent }: { icon: string; label: string; name: string; year: string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-extrabold tracking-[0.14em]" style={{ color: accent }}>
          {label}
        </div>
        <div className="truncate text-[13px] font-bold">{name}</div>
      </div>
      <span className="shrink-0 text-[12px] text-(--color-text-muted)">{year}</span>
    </div>
  );
}

/** Ports `_WinningGridSlotCard` — a per-grid-slot win-count bar chart. */
export function WinningGridSlotCard({ stats, accent }: { stats: ComputedStat[]; accent: string }) {
  const live = circuitLiveStats(stats, {});
  if (!live.winningGridSlots || live.winningGridSlots.entries.length === 0) return null;

  const { total, entries } = live.winningGridSlots;

  return (
    <div className="rounded-xl bg-(--color-surface-elevated) p-4">
      <div className="mb-3 text-[9px] font-black tracking-[0.16em]" style={{ color: accent }}>
        WINNING GRID SLOT
      </div>
      <div className="flex flex-col gap-2">
        {entries.map(([slot, count]) => {
          const pct = total === 0 ? 0 : (100 * count) / total;
          return (
            <div key={slot} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-[11px] font-extrabold">P{slot}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--color-surface)">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
              </div>
              <span className="w-16 shrink-0 text-right text-[9px] text-(--color-text-muted)">
                {count} · {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
