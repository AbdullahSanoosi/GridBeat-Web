import * as THREE from "three";
import type { TrackPoint } from "@/lib/models/live";

/**
 * MultiViewer's {x, y} (and the live WS's PositionSample.x/y — same space)
 * are local, circuit-relative units with an arbitrary origin/scale, not
 * geographic coordinates. Every circuit gets normalized into this fixed
 * world size so camera distance / car size / line width constants don't
 * need to vary per track.
 */
export const WORLD_SIZE = 40;

/**
 * Builds one mapping function from a snapshot of track points (real
 * geometry, GPS-dot fallback, or car positions — same three-tier fallback
 * order as the old canvas version) so the ribbon, corners, and live cars
 * all place themselves in exactly the same world space. Bounds are fixed
 * at creation time — this must be built once per track load, not per frame.
 */
export function createWorldMapper(sourcePts: TrackPoint[]): (p: TrackPoint) => THREE.Vector3 {
  let minX = sourcePts[0].x;
  let maxX = sourcePts[0].x;
  let minY = sourcePts[0].y;
  let maxY = sourcePts[0].y;
  for (const p of sourcePts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const range = Math.max(maxX - minX, maxY - minY, 1);
  const scale = WORLD_SIZE / range;

  return (p: TrackPoint) => new THREE.Vector3((p.x - centerX) * scale, 0, (p.y - centerY) * scale);
}

/** Mirrors the old canvas fallback's angle-sort-around-centroid ordering for raw GPS dots. */
export function sortRadially(pts: TrackPoint[]): TrackPoint[] {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

/** Max points fed into buildRibbonGeometry for the GPS-dot fallback. */
const MAX_FALLBACK_POINTS = 400;

/**
 * The fallback dot cloud (store.ts's `trackDots`) grows unbounded up to
 * 5000 points over a long session — building a ribbon from that many
 * scattered points is expensive and geometrically degenerate enough that
 * it hung a real GPU long enough to trigger a driver reset (WebGL context
 * loss) on the very first render. Downsample to an even subset so the
 * fallback ribbon's cost is bounded regardless of session length.
 */
export function capPointCount(pts: TrackPoint[], maxCount = MAX_FALLBACK_POINTS): TrackPoint[] {
  if (pts.length <= maxCount) return pts;
  const step = pts.length / maxCount;
  const out: TrackPoint[] = [];
  for (let i = 0; i < maxCount; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}

/**
 * Flat triangle-strip ribbon around a closed centerline, built from
 * finite-difference tangents + perpendicular offsets (no reliance on
 * Curve.getTangentAt's arc-length remapping — simpler and exact enough at
 * the sample density used here).
 */
export function buildRibbonGeometry(centerlineWorld: THREE.Vector3[], width: number, yOffset = 0): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(centerlineWorld, true, "catmullrom", 0.5);
  // Hard ceiling regardless of input size — a caller feeding in an
  // unexpectedly large point set (see capPointCount's call sites) should
  // degrade to a coarser ribbon, never balloon into a GPU-hanging mesh.
  const divisions = Math.min(Math.max(centerlineWorld.length * 4, 200), 3000);
  const samples = curve.getPoints(divisions);
  samples.pop(); // getPoints on a closed curve repeats the first point at the end

  const n = samples.length;
  const half = width / 2;
  const positions = new Float32Array(n * 2 * 3);
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < n; i++) {
    const prev = samples[(i - 1 + n) % n];
    const next = samples[(i + 1) % n];
    const tangent = next.clone().sub(prev).normalize();
    const perp = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const p = samples[i];

    // A constant-width perpendicular offset self-intersects ("bowtie"
    // spikes, visible as a moiré/hatched look on the wide glow layer)
    // wherever the offset exceeds roughly half the local sample spacing —
    // i.e. sharp turns relative to sample density. Clamping to that keeps
    // every quad's edges from crossing its neighbor's.
    const segLen = Math.min(p.distanceTo(prev), p.distanceTo(next));
    const safeHalf = Math.min(half, segLen * 0.5);

    const left = p.clone().addScaledVector(perp, safeHalf);
    const right = p.clone().addScaledVector(perp, -safeHalf);
    positions.set([left.x, left.y + yOffset, left.z], i * 6);
    positions.set([right.x, right.y + yOffset, right.z], i * 6 + 3);
  }

  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = ((i + 1) % n) * 2;
    const d = ((i + 1) % n) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
