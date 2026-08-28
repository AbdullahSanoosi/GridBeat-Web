/**
 * staleTime table, ported from the TTL conventions in GridBeat (Flutter)
 * lib/services/cache_service.dart's callers. Pass the right constant as a
 * query's `staleTime` — TanStack Query's own stale-while-revalidate behavior
 * (serve cached data instantly, refetch in the background once stale) is a
 * direct match for the Flutter app's `cachedFetch` helper, so no custom cache
 * layer is needed on top of it.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const staleTime = {
  /** Standings change after every race. */
  standings: 1 * HOUR,
  /** Last-race podium tracks the daily sync closely. */
  lastRacePodium: 3 * HOUR,
  /** Schedule, current-season archives/standings, hall of fame, home details. */
  currentSeason: 6 * HOUR,
  /** Sync status. */
  syncStatus: 1 * HOUR,
  /** Most stats-api leaderboards/entity details/enrichment bios — daily refresh. */
  daily: 24 * HOUR,
  /** Past circuits, all-time champions lists. */
  weekly: 7 * DAY,
  /** Past-season archives/standings, entity/name/reference directories — effectively immutable. */
  immutable: 30 * DAY,
} as const;

/** Race/qualifying results and pit stops are immutable once available — never refetch. */
export const staleForever = Infinity;
