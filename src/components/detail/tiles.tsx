/** Small presentational tiles shared by the driver/constructor detail pages. */

export function HeroKpi({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg bg-(--color-surface-elevated) px-3 py-3">
      <span className="text-2xl font-black" style={{ color: accent }}>
        {value}
      </span>
      <span className="text-[9px] font-bold tracking-wide text-(--color-text-muted)">{label}</span>
    </div>
  );
}

export function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-(--color-surface-elevated) px-1 py-2">
      <span className="text-xl font-black">{value}</span>
      <span className="text-[9px] font-extrabold tracking-wide" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export function TotalTile({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-2">
      <span className="text-xl font-black" style={{ color: accent }}>
        {value}
      </span>
      <span className="text-[9px] font-bold leading-tight tracking-wide text-(--color-text-muted)">
        {label}
      </span>
    </div>
  );
}

export interface BioItem {
  label: string;
  value: string;
}

export function BioGroup({ items, accent }: { items: BioItem[]; accent: string }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-lg border border-(--color-border) bg-(--color-surface) px-4 py-3"
        >
          <span className="text-[9px] font-bold tracking-wide text-(--color-text-muted)">
            {item.label.toUpperCase()}
          </span>
          <span className="truncate text-sm font-medium" style={{ color: accent }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
