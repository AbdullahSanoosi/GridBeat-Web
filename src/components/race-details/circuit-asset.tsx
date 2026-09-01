/**
 * Ported from GridBeat (Flutter) lib/core/constants/app_constants.dart's
 * CircuitImages — the bundled local asset used by the SCHEDULE tab banner
 * and the RACE-tab result banner. This is the intentional exception to the
 * network-SVG path: see ../gridbeat/CLAUDE.md's "durable boundary" note —
 * the user explicitly asked for these two banners to keep the old bundled
 * artwork rather than switching to circuitDetailProvider's image_url like
 * the CIRCUIT tab and the Circuit Guide do.
 */
const BUNDLED_CIRCUIT_IDS = new Set([
  "albert_park",
  "americas",
  "bahrain",
  "baku",
  "catalunya",
  "hungaroring",
  "imola",
  "interlagos",
  "jeddah",
  "losail",
  "marina_bay",
  "miami",
  "monaco",
  "monza",
  "red_bull_ring",
  "rodriguez",
  "shanghai",
  "silverstone",
  "spa",
  "suzuka",
  "vegas",
  "villeneuve",
  "yas_marina",
  "zandvoort",
]);

export function bundledCircuitImage(circuitId: string): string | null {
  return BUNDLED_CIRCUIT_IDS.has(circuitId) ? `/circuits/circuit_${circuitId}.png` : null;
}
