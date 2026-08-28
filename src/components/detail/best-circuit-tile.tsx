import Link from "next/link";

/**
 * "Most wins/podiums/poles at <circuit>" tile, linking through to the
 * Circuit Guide detail page. Ported from _CircuitBestTile / _BestCircuitTile.
 */
export function BestCircuitTile({
  label,
  value,
  circuitId,
  circuitName,
  accent,
}: {
  label: string;
  value: string;
  circuitId: string;
  circuitName: string;
  accent: string;
}) {
  return (
    <Link
      href={`/circuits/${circuitId}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3 transition-colors hover:bg-(--color-surface-elevated)"
    >
      <div className="min-w-0">
        <div className="text-[9px] font-bold tracking-wide text-(--color-text-muted)">{label}</div>
        <div className="truncate text-sm font-medium">{circuitName}</div>
      </div>
      <span className="shrink-0 text-xl font-black" style={{ color: accent }}>
        {value}
      </span>
    </Link>
  );
}
