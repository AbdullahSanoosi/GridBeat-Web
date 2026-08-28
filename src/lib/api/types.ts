/** A raw PostgREST row — most stats-api endpoints return these untyped,
 * same as the Flutter client (List<Map<String, dynamic>>). */
export type Row = Record<string, unknown>;

/** Ported from lib/features/stats/data/models/stats_models.dart. */
export interface ComputedStat {
  metricKey: string;
  /** driver | constructor | nation | driver_pair | driver_circuit | driver_team | circuit */
  entityType: string;
  entityId: string;
  value: number;
  extra: Record<string, unknown> | null;
  /** season; null = all-time */
  periodFrom: number | null;
  periodTo: number | null;
}

export function computedStatFromRow(r: Row): ComputedStat {
  return {
    metricKey: r.metric_key as string,
    entityType: r.entity_type as string,
    entityId: r.entity_id as string,
    value: r.value as number,
    extra: (r.extra as Record<string, unknown> | null) ?? null,
    periodFrom: r.period_from == null ? null : Number(r.period_from),
    periodTo: r.period_to == null ? null : Number(r.period_to),
  };
}
