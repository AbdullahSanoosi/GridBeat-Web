/**
 * Ported from GridBeat (Flutter)
 * lib/features/learn/providers/penalty_guide_provider.dart — counts every
 * FIA decision of the current season against `PENALTY_KINDS`, with up to 3
 * real examples per kind (the stewards' own reason text, not a paraphrase).
 *
 * Covers ~87% of decisions in the Flutter original; the rest are genuine
 * one-offs (right of review, practice starts, procedural) not worth a
 * category of their own — counts are "how often this happened", not a
 * partition of every document.
 */
import type { FiaDecision } from "@/lib/models/fia-docs";
import { PENALTY_KINDS, classifyPenalty, type PenaltyKind } from "@/lib/models/penalty-guide";

export interface PenaltyExample {
  reason: string;
  driver: string | null;
  round: number | null;
}

export interface PenaltyKindStats {
  kind: PenaltyKind;
  count: number;
  /** Real reason text, newest first. */
  examples: PenaltyExample[];
}

export function buildPenaltyGuide(decisions: FiaDecision[]): PenaltyKindStats[] {
  const byKind = new Map<string, FiaDecision[]>();
  for (const d of decisions) {
    const t = d.title.toLowerCase();
    if (!t.includes("infringement") && !t.includes("decision") && !t.includes("summons")) continue;
    const kind = classifyPenalty(d.title, d.reason);
    if (!kind) continue;
    const list = byKind.get(kind.name) ?? [];
    list.push(d);
    byKind.set(kind.name, list);
  }

  const out: PenaltyKindStats[] = [];
  for (const kind of PENALTY_KINDS) {
    const hits = byKind.get(kind.name) ?? [];
    if (hits.length === 0) continue;
    const sorted = [...hits].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    out.push({
      kind,
      count: hits.length,
      examples: sorted
        .filter((d) => (d.reason ?? "").trim().length > 25)
        .slice(0, 3)
        .map((d) => ({
          reason: d.reason!.replace(/\s+/g, " ").trim(),
          driver: d.driverName,
          round: d.round,
        })),
    });
  }

  out.sort((a, b) => b.count - a.count);
  return out;
}
