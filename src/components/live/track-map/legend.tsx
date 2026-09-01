import { teamColorHex, type LeaderboardEntry } from "@/lib/models/live";

/**
 * Auto-scrolling driver-position marquee along the bottom of the map —
 * ported from GridBeat (Flutter)'s _MapLegend. The Flutter version measures
 * the row once via LayoutBuilder to compute its own loop distance and
 * animates a Transform.translate; here the row is simply rendered twice
 * back-to-back and a CSS animation translates by exactly -50%, which loops
 * seamlessly with no measurement step (see the marquee-scroll keyframe in
 * globals.css).
 */
export function MapLegend({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 h-10 overflow-hidden border-t border-(--color-border) bg-(--color-surface)/94">
      <div className="animate-marquee flex h-full w-max items-center py-2">
        <LegendRow entries={entries} />
        <LegendRow entries={entries} ariaHidden />
      </div>
    </div>
  );
}

function LegendRow({ entries, ariaHidden }: { entries: LeaderboardEntry[]; ariaHidden?: boolean }) {
  return (
    <div className="flex items-center" aria-hidden={ariaHidden}>
      {entries.map((e) => (
        <div key={e.driverNumber} className="flex items-center gap-1.5 pr-4.5">
          <span
            className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[8px] font-black text-white"
            style={{ backgroundColor: teamColorHex(e.teamColor) }}
          >
            {e.position}
          </span>
          <span className="text-[10px] font-bold tracking-wide text-(--color-text-primary)">{e.shortName}</span>
        </div>
      ))}
    </div>
  );
}
