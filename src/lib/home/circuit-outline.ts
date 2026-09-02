import { HOME_CIRCUITS } from "@/lib/home/circuits";

/**
 * The real outline of whichever circuit is up next, pulled server-side from
 * the same SVG the Circuit Guide renders (`circuits.image_url`).
 *
 * The homepage used to draw a hardcoded Suzuka lap. It now follows the
 * calendar: one fetch on the server (no CORS proxy needed, unlike the
 * client-side `/api/circuit-svg` route the dashboard uses), the single
 * `<path>` those files carry is lifted out with its viewBox, and the result
 * is cached with the page's own 15-minute revalidate. `HOME_CIRCUITS`'
 * baked geometry stays as the fallback so a third-party outage degrades to
 * a real track rather than an empty frame.
 */
export interface CircuitOutline {
  /** Closed SVG path data. */
  d: string;
  /** viewBox the path is drawn in — these files aren't all 0 0 1000 1000. */
  viewBox: string;
  /** True when this came from the live SVG rather than the baked fallback. */
  live: boolean;
}

const FALLBACK: CircuitOutline = {
  d: HOME_CIRCUITS[0].d,
  viewBox: "0 0 1000 1000",
  live: false,
};

export async function fetchCircuitOutline(imageUrl: string | null | undefined): Promise<CircuitOutline> {
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
    return { d, viewBox, live: true };
  } catch {
    return FALLBACK;
  }
}
