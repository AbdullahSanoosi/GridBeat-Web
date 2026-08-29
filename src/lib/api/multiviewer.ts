/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/presentation/widgets/live_track_map.dart's
 * circuit-key lookup and track-geometry fetch.
 */
import type { SessionInfo } from "@/lib/models/live";

export interface Corner {
  number: number;
  x: number;
  y: number;
}

export interface TrackData {
  points: { x: number; y: number }[];
  corners: Corner[];
  /**
   * Marshal-post boundaries (flag/marshaling posts, not DRS zones — the
   * MultiViewer circuit API has no DRS-zone field at all, confirmed by
   * inspecting a live response). Same shape as `corners`, reused for
   * track-segment marker rendering.
   */
  marshalSectors: Corner[];
  /** Rotation in degrees from the circuit API, applied when drawing. */
  rotation: number;
}

// Keys from https://api.multiviewer.app/api/v1/circuits
function circuitKey(info: SessionInfo): number | null {
  const loc = info.location.toLowerCase();
  const ctr = info.country.toLowerCase();
  const h = (locs: string[], ctrs: string[] = []) =>
    locs.some((k) => loc.includes(k)) || ctrs.some((k) => ctr.includes(k));

  if (h(["silverstone"])) return 2;
  if (h(["budapest", "hungar"])) return 4;
  if (h(["imola"])) return 6;
  if (h(["spa", "francorchamps"], ["belgium"])) return 7;
  if (h(["austin", "americas"])) return 9;
  if (h(["melbourne", "albert park"])) return 10;
  if (h(["são paulo", "sao paulo", "interlagos"], ["brazil"])) return 14;
  if (h(["barcelona", "catalunya"])) return 15;
  if (h(["spielberg", "red bull ring"], ["austria"])) return 19;
  if (h(["monaco", "monte carlo", "monte-carlo"], ["monaco"])) return 22;
  if (h(["montreal", "montréal", "villeneuve"], ["canada"])) return 23;
  if (h(["monza"])) return 39;
  if (h(["suzuka"])) return 46;
  if (h(["shanghai"])) return 49;
  if (h(["zandvoort"])) return 55;
  if (h(["marina bay", "singapore"])) return 61;
  if (h(["sakhir", "bahrain"])) return 63;
  if (h(["mexico", "rodriguez"])) return 65;
  if (h(["yas", "abu dhabi"])) return 70;
  if (h(["baku"])) return 144;
  if (h(["jeddah"])) return 149;
  if (h(["losail", "lusail"], ["qatar"])) return 150;
  if (h(["miami"])) return 151;
  if (h(["las vegas", "vegas"])) return 152;
  // Madrid 2026 and other very-new circuits: not yet in MultiViewer, falls
  // back to GPS dots (see track-map.tsx).
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trackDataFromJson(j: any): TrackData {
  const xs: number[] = j.x;
  const ys: number[] = j.y;
  const count = Math.min(xs.length, ys.length);
  const points = Array.from({ length: count }, (_, i) => ({ x: xs[i], y: ys[i] }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const corners: Corner[] = (j.corners ?? []).map((c: any) => ({
    number: c.number,
    x: c.trackPosition.x,
    y: c.trackPosition.y,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marshalSectors: Corner[] = (j.marshalSectors ?? []).map((c: any) => ({
    number: c.number,
    x: c.trackPosition.x,
    y: c.trackPosition.y,
  }));
  return { points, corners, marshalSectors, rotation: j.rotation ?? 0 };
}

/** Walks back up to 8 years — most circuits only have data through 2022/2023. */
export async function fetchTrackData(info: SessionInfo): Promise<TrackData | null> {
  const key = circuitKey(info);
  if (key == null) return null;

  const thisYear = new Date().getFullYear();
  for (let i = 0; i < 8; i++) {
    const year = thisYear - i;
    try {
      const res = await fetch(`https://api.multiviewer.app/api/v1/circuits/${key}/${year}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return trackDataFromJson(await res.json());
    } catch {
      // network/parse error - try next year
    }
  }
  return null;
}
