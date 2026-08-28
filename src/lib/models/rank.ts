/**
 * Ported from GridBeat (Flutter) lib/features/stats/providers/stats_provider.dart's
 * findRank — given a full metric leaderboard (sorted desc) and an entity_id,
 * returns this entity's 1-based rank, the total count, and the entries
 * immediately above/below. Powers the "#1 of 116, ▲ X, ▼ Y" rank cards
 * on the driver/constructor detail pages.
 */
import type { ComputedStat } from "@/lib/api/types";

export interface RankInfo {
  rank: number;
  total: number;
  above: ComputedStat | null;
  below: ComputedStat | null;
}

export function findRank(sortedDesc: ComputedStat[], entityId: string): RankInfo | null {
  const index = sortedDesc.findIndex((s) => s.entityId === entityId);
  if (index === -1) return null;
  return {
    rank: index + 1,
    total: sortedDesc.length,
    above: index > 0 ? sortedDesc[index - 1] : null,
    below: index < sortedDesc.length - 1 ? sortedDesc[index + 1] : null,
  };
}

/** v == round(v) ? int : one decimal — matches the Flutter screens' _fmtNum. */
export function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
