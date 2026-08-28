import type { Row } from "@/lib/api/types";

/** One race result in the driver's results-by-season grid. Ported from _ResultChip. */
export function ResultChip({ race }: { race: Row }) {
  const posText = (race.position_text as string | undefined) ?? "-";
  const position = race.position != null ? Number(race.position) : null;
  const status = ((race.status as string | undefined) ?? "").toLowerCase();
  const isDsq = status.includes("disqualified");

  let color = "var(--color-text-muted)";
  if (isDsq || position === null) color = "var(--color-error)";
  else if (position === 1) color = "var(--color-warning)";
  else if (position <= 3) color = "var(--color-success)";
  else if (position <= 10) color = "var(--color-info)";

  return (
    <div
      className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-xs font-extrabold"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)` }}
    >
      {posText}
    </div>
  );
}
