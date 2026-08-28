/**
 * Ported verbatim from GridBeat (Flutter) lib/features/stats/presentation/stats_hub_screen.dart's
 * statsCategories — a curated shortlist of the catalog's ~82 metrics (the
 * genuinely browsable/rankable ones). Full catalog: {statsApiBaseUrl}/docs.
 */

export interface StatsMetricRef {
  metricKey: string;
  label: string;
  entityTypes: string[];
}

export interface StatsCategory {
  label: string;
  metrics: StatsMetricRef[];
}

function metric(metricKey: string, label: string, entityTypes: string[] = ["driver"]): StatsMetricRef {
  return { metricKey, label, entityTypes };
}

export const statsCategories: StatsCategory[] = [
  {
    label: "Wins",
    metrics: [
      metric("wins", "Wins", ["driver", "constructor"]),
      metric("consecutive_wins", "Consecutive Wins"),
      metric("wins_season", "Wins in a Season"),
      metric("gps_before_first_win", "GPs Before First Win"),
      metric("wins_different_teams", "Wins With Different Teams"),
      metric("gap_to_second_seconds", "Biggest Winning Margin"),
      metric("wins_before_first_title", "Wins Before First Title", ["driver", "constructor"]),
      metric("one_two_finishes", "One-Two Finishes", ["constructor"]),
    ],
  },
  {
    label: "Podiums",
    metrics: [
      metric("podiums", "Podiums", ["driver", "constructor"]),
      metric("consecutive_podiums", "Consecutive Podiums"),
      metric("podiums_season", "Podiums in a Season"),
      metric("podium_duo_most_often", "Podium Duo, Most Often Together", ["driver_pair"]),
    ],
  },
  {
    label: "Poles",
    metrics: [
      metric("poles", "Poles"),
      metric("consecutive_poles", "Consecutive Poles"),
      metric("poles_season", "Poles in a Season"),
      metric("win_rate_from_pole", "Win Rate From Pole"),
    ],
  },
  {
    label: "Qualifying",
    metrics: [
      metric("q3_appearances", "Q3 Appearances", ["driver", "constructor"]),
      metric("reached_q2", "Reached Q2", ["driver", "constructor"]),
      metric("q1_exits", "Q1 Exits", ["driver", "constructor"]),
    ],
  },
  {
    label: "First Rows",
    metrics: [
      metric("first_rows", "First Rows"),
      metric("first_rows_together", "First Rows Together", ["driver_pair"]),
      metric("first_row_lockouts", "First Row Lockouts", ["constructor", "nation"]),
    ],
  },
  {
    label: "GPs",
    metrics: [
      metric("gps", "Career Starts"),
      metric("consecutive_gps", "Consecutive GPs"),
      metric("gps_since_last_win", "GPs Without a Win"),
      metric("gps_without_podium", "GPs Without a Podium"),
      metric("gps_without_pole", "GPs Without a Pole"),
    ],
  },
  {
    label: "Laps Led",
    metrics: [
      metric("laps_led", "Laps Led", ["driver", "constructor"]),
      metric("laps_led_season", "Laps Led in a Season", ["driver", "constructor"]),
      metric("km_led", "Distance Led (km)", ["driver", "constructor"]),
    ],
  },
  {
    label: "Head-to-Head",
    metrics: [
      metric("h2h_race", "Race H2H (as Teammates)", ["driver_pair"]),
      metric("h2h_qualifying", "Qualifying H2H", ["driver_pair"]),
      metric("h2h_race_positive_streak", "Longest Race H2H Streak", ["driver_pair"]),
    ],
  },
  {
    label: "DNFs",
    metrics: [
      metric("dnfs", "DNFs"),
      metric("consecutive_dnfs", "Consecutive DNFs"),
      metric("consecutive_finishes", "Consecutive Finishes"),
    ],
  },
];

export function lookupMetric(key: string): StatsMetricRef {
  for (const category of statsCategories) {
    for (const m of category.metrics) {
      if (m.metricKey === key) return m;
    }
  }
  return { metricKey: key, label: key, entityTypes: ["driver"] };
}

/**
 * Best-effort display name for a computed_stats entity_id. Simple entity
 * types (driver/constructor) resolve directly via the names map; compound
 * ids (driver_pair, driver_circuit, driver_team: "<id>__<id>") join both
 * halves. Falls back to the raw id when a half can't be resolved.
 */
export function entityDisplayName(entityId: string, names: Record<string, string>): string {
  if (entityId.includes("__")) {
    return entityId
      .split("__")
      .map((part) => names[part] ?? part)
      .join(" & ");
  }
  return names[entityId] ?? entityId;
}
