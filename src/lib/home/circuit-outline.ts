import { HOME_CIRCUITS } from "@/lib/home/circuits";

/**
 * The outline of whichever circuit is up next, for the homepage lap section.
 *
 * Two sources, in this order, and the order matters because a car drives
 * along this path:
 *
 * 1. `HOME_CIRCUITS` — centrelines baked from the MultiViewer API (the same
 *    geometry the live track map uses). These are true racing lines: one
 *    loop, always travelling forwards.
 * 2. The circuit's own SVG from `circuits.image_url`, fetched server-side.
 *    Covers all 78 circuits, but these files draw the *outline of the track
 *    ribbon* — out along one edge and back along the other — so a marker
 *    following one reverses direction where the outline doubles back.
 *    Measured on Monza: heading snaps of up to 151° at three points per lap,
 *    against 35° max on the baked centreline, and no lookahead window fixes
 *    it because the reversal is real, not sampling noise.
 *
 * So a circuit with baked geometry gets the correct-looking lap, and
 * everything else still renders a real track rather than an empty frame.
 * `isCentreline` says which one a caller got.
 */
export interface CircuitOutline {
  /** Closed SVG path data. */
  d: string;
  /** viewBox the path is drawn in — these files aren't all 0 0 1000 1000. */
  viewBox: string;
  /** True when this came from the live SVG rather than the baked fallback. */
  live: boolean;
  /** True when the path is a true centreline, so a car marker won't reverse on it. */
  isCentreline: boolean;
}

const FALLBACK: CircuitOutline = {
  d: HOME_CIRCUITS[0].d,
  viewBox: "0 0 1000 1000",
  live: false,
  isCentreline: true,
};

/** Baked circuits are keyed by display name ("MONZA"); race rows give ids ("monza"). */
function bakedFor(circuitId: string | null | undefined): CircuitOutline | null {
  if (!circuitId) return null;
  const key = circuitId.toLowerCase();
  const hit = HOME_CIRCUITS.find((c) => c.name.toLowerCase() === key);
  return hit ? { d: hit.d, viewBox: "0 0 1000 1000", live: false, isCentreline: true } : null;
}

export async function fetchCircuitOutline(
  imageUrl: string | null | undefined,
  circuitId?: string | null,
): Promise<CircuitOutline> {
  const baked = bakedFor(circuitId);
  if (baked) return baked;

  if (!imageUrl) return FALLBACK;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (!res.ok) return FALLBACK;
    const svg = await res.text();

    // These files carry the track as one long path; take the longest to be
    // safe if a future export adds a pit lane or start-line marker.
    const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
    if (paths.length === 0) return FALLBACK;
    const d = paths.reduce((a, b) => (b.length > a.length ? b : a));

    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 1000 1000";
    return { d, viewBox, live: true, isCentreline: false };
  } catch {
    return FALLBACK;
  }
}
