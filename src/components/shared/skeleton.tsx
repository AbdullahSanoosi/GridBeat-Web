/**
 * Shared shimmer-block primitive — the `animate-pulse rounded-xl
 * bg-(--color-surface-elevated)` shape several pages already hand-rolled
 * (race-details' four result tabs, the circuit leaderboard, Stewards' Room).
 * Consolidates that so every route's loading state has the same feel
 * instead of some getting a shaped skeleton and others a bare "Loading…".
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-(--color-surface-elevated) ${className}`} />;
}

/** A column of N row-shaped skeletons, the shape already used across race-details. */
export function SkeletonRows({ count, className = "h-20" }: { count: number; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

/** Hero + tile-grid + horizontal-card-row shape shared by the driver/constructor detail pages. */
export function DetailPageSkeleton() {
  return (
    <>
      <Skeleton className="h-48 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="mt-8 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-40 shrink-0" />
        ))}
      </div>
    </>
  );
}
