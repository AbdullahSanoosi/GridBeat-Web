"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveTimingStore } from "@/lib/live/store";
import { fetchTrackData, type TrackData } from "@/lib/api/multiviewer";
import { teamColorHex, type LeaderboardEntry, type PositionSample, type TrackPoint } from "@/lib/models/live";

/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/presentation/widgets/live_track_map.dart —
 * the "Relative Virtual Playhead Engine": a virtual clock bootstrapped once
 * from the newest known sample, then advanced purely by requestAnimationFrame
 * frame deltas (never wall-clock after bootstrap), so it's immune to
 * device/server clock skew. Per driver: interpolate between the two
 * timestamped samples bracketing the playhead.
 *
 * Simplified vs. the Flutter version: mouse wheel zoom + drag pan instead of
 * pinch/two-finger-tilt gestures (there's no tilt here at all — this is a
 * flat top-down map, not the tilted-perspective one the Flutter widget name
 * suggests).
 */

const BOOTSTRAP_RUNWAY_MS = 250;
const RESYNC_THRESHOLD_MS = 10_000;
const MAX_QUEUE_LENGTH = 30;

interface DriverQueueState {
  queue: PositionSample[];
  lastIngestTime: number;
}

export function TrackMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionInfo = useLiveTimingStore((s) => s.sessionInfo);
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  // ── View state (pan/zoom) — refs so drag handlers don't need rerenders ──
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(0.8);
  const viewInitRef = useRef(false);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const [, forceRerender] = useState(0);

  function resetView() {
    viewInitRef.current = false;
    forceRerender((n) => n + 1);
  }

  // ── Track geometry fetch, keyed by session identity ──────────────────────
  useEffect(() => {
    if (!sessionInfo) return;
    const key = `${sessionInfo.location}|${sessionInfo.country}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    setTrackData(null);
    fetchTrackData(sessionInfo).then(setTrackData);
  }, [sessionInfo]);

  function render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    track: TrackData | null,
    trackDots: TrackPoint[],
    carPositions: Record<string, TrackPoint>,
    leaderboard: Record<string, LeaderboardEntry>,
  ) {
    ctx.clearRect(0, 0, width, height);
    if (!viewInitRef.current && width > 0 && height > 0) {
      const canvasSize = 900;
      zoomRef.current = (Math.min(width, height) / canvasSize) * 0.9;
      panRef.current = {
        x: (width - canvasSize * zoomRef.current) / 2,
        y: (height - canvasSize * zoomRef.current) / 2,
      };
      viewInitRef.current = true;
    }

    const sourcePts = track?.points.length ? track.points : trackDots.length ? trackDots : Object.values(carPositions);
    if (sourcePts.length === 0) {
      paintWaiting(ctx, width, height);
      return;
    }
    const bounds = getBounds(sourcePts);
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    if (rangeX < 1 || rangeY < 1) return;

    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    const canvasSize = 900;
    const pad = 60;
    const scale = Math.min((canvasSize - pad * 2) / rangeX, (canvasSize - pad * 2) / rangeY);
    const drawW = rangeX * scale;
    const drawH = rangeY * scale;
    const ox = pad + (canvasSize - pad * 2 - drawW) / 2;
    const oy = pad + (canvasSize - pad * 2 - drawH) / 2;
    const toCanvas = (p: TrackPoint) => ({
      x: ox + (p.x - bounds.minX) * scale,
      y: oy + (bounds.maxY - p.y) * scale, // F1 coords are Y-up, canvas is Y-down
    });

    const rotation = track?.rotation ?? 0;
    if (rotation !== 0) {
      const cx = canvasSize / 2;
      const cy = canvasSize / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (track) {
      drawTrack(ctx, track.points.map(toCanvas));
      drawCorners(ctx, track.corners, toCanvas);
    } else {
      drawFallbackDots(ctx, sourcePts, toCanvas);
    }
    if (Object.keys(carPositions).length > 0) {
      drawCars(ctx, carPositions, leaderboard, toCanvas, zoomRef.current);
    }

    ctx.restore();
  }

  // ── Interpolation engine + render loop ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    // Non-null locals for the closures below — TS narrowing on the outer
    // `canvas`/`container`/`ctx2d` doesn't persist into nested functions.
    const canvasEl = canvas;
    const containerEl = container;
    const ctx = ctx2d;

    let rafId: number;
    let lastTimestamp: number | null = null;
    let virtualPlayhead: number | null = null;
    const driverQueues = new Map<string, DriverQueueState>();
    let displayed: Record<string, TrackPoint> = {};

    // Guard against a resize feedback loop: the canvas is `absolute` (see
    // the JSX below) specifically so its own bitmap size can never affect
    // containerEl's layout size, but ResizeObserver can still fire on
    // sub-pixel float/rounding jitter alone. Skip the write (and the
    // context reset, which would otherwise wipe the current frame) unless
    // the rounded size actually changed.
    let lastWidth = -1;
    let lastHeight = -1;
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = containerEl.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === lastWidth && h === lastHeight) return;
      lastWidth = w;
      lastHeight = h;
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(containerEl);

    function tick(timestamp: number) {
      const state = useLiveTimingStore.getState();
      const history = state.positionHistory;

      const hasAnySample = Object.values(history).some((s) => s.length > 0);
      if (!hasAnySample) {
        virtualPlayhead = null;
        lastTimestamp = null;
        displayed = state.carPositions;
      } else {
        let newestAll = 0;
        for (const samples of Object.values(history)) {
          if (samples.length === 0) continue;
          const t = samples[samples.length - 1].time;
          if (t > newestAll) newestAll = t;
        }

        const needsBootstrap =
          virtualPlayhead == null || Math.abs(newestAll - virtualPlayhead) > RESYNC_THRESHOLD_MS;
        let vp: number;
        if (needsBootstrap) {
          vp = newestAll - BOOTSTRAP_RUNWAY_MS;
          lastTimestamp = timestamp;
        } else {
          // Safe: needsBootstrap is false, and its first disjunct was
          // `virtualPlayhead == null`, so it must be non-null here.
          vp = virtualPlayhead!;
        }

        const delta = timestamp - (lastTimestamp ?? timestamp);
        lastTimestamp = timestamp;
        vp = vp + delta;
        if (vp > newestAll) vp = newestAll;
        virtualPlayhead = vp;

        const playhead = vp;
        const next: Record<string, TrackPoint> = {};

        for (const [driver, samples] of Object.entries(history)) {
          if (samples.length === 0) continue;
          const dq = driverQueues.get(driver) ?? { queue: [], lastIngestTime: -1 };
          for (const s of samples) {
            if (s.time > dq.lastIngestTime) dq.queue.push(s);
          }
          dq.lastIngestTime = samples[samples.length - 1].time;
          driverQueues.set(driver, dq);

          // GC: drop strictly-older samples, keep A (newest <= playhead) and everything newer.
          while (dq.queue.length >= 2 && dq.queue[1].time <= playhead) dq.queue.shift();
          while (dq.queue.length > MAX_QUEUE_LENGTH) dq.queue.shift();
          if (dq.queue.length === 0) continue;

          let a: PositionSample | undefined;
          let b: PositionSample | undefined;
          if (dq.queue[0].time > playhead) {
            b = dq.queue[0];
          } else {
            a = dq.queue[0];
            b = dq.queue[1];
          }

          if (a && b) {
            const span = b.time - a.time;
            const into = playhead - a.time;
            const t = span > 0 ? Math.min(Math.max(into / span, 0), 1) : 1;
            next[driver] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          } else if (a) {
            next[driver] = { x: a.x, y: a.y };
          } else if (b) {
            next[driver] = { x: b.x, y: b.y };
          }
        }

        for (const key of driverQueues.keys()) {
          if (!(key in history)) driverQueues.delete(key);
        }
        displayed = next;
      }

      render(ctx, containerEl.clientWidth, containerEl.clientHeight, trackData, state.trackDots, displayed, state.leaderboard);
      rafId = requestAnimationFrame(tick);
    }

    // Paint immediately (synchronously) rather than waiting for the first
    // rAF callback — otherwise the canvas stays blank for a frame (or
    // indefinitely in a context where rAF is throttled/never fires, e.g. a
    // backgrounded or non-composited tab). `tick` schedules its own
    // follow-up frame via requestAnimationFrame at the end, so this is a
    // one-time bootstrap only.
    tick(performance.now());
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [trackData]);

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const focal = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(Math.max(zoomRef.current * factor, 0.12), 15);
    panRef.current = {
      x: focal.x - (focal.x - panRef.current.x) * (newZoom / zoomRef.current),
      y: focal.y - (focal.y - panRef.current.y) * (newZoom / zoomRef.current),
    };
    zoomRef.current = newZoom;
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    draggingRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!draggingRef.current) return;
    panRef.current = { x: e.clientX - draggingRef.current.x, y: e.clientY - draggingRef.current.y };
  }
  function onMouseUp() {
    draggingRef.current = null;
  }

  return (
    <div ref={containerRef} className="relative h-[600px] w-full min-w-0 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
      <canvas
        ref={canvasRef}
        // `absolute` + `block` takes the canvas out of normal flow entirely,
        // so its own bitmap dimensions can never feed back into the
        // container's (and therefore the page's) layout size — that
        // feedback loop was what pushed the whole page into horizontal
        // overflow and squeezed the sidebar down to a sliver.
        className="absolute inset-0 block cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <button
        onClick={resetView}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface-elevated) text-xs"
        title="Reset view"
      >
        ⌖
      </button>
    </div>
  );
}

function getBounds(pts: TrackPoint[]) {
  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  const path = new Path2D();
  const first = pts[0];
  const last = pts[pts.length - 1];
  const mid = { x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 };
  path.moveTo(mid.x, mid.y);
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const nextMid = { x: (pts[i].x + next.x) / 2, y: (pts[i].y + next.y) / 2 };
    path.quadraticCurveTo(pts[i].x, pts[i].y, nextMid.x, nextMid.y);
  }
  path.closePath();
  return path;
}

function strokePath(ctx: CanvasRenderingContext2D, path: Path2D, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(path);
}

function drawTrack(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  if (pts.length < 3) return;
  const path = smoothPath(ctx, pts);
  strokePath(ctx, path, "rgba(255,255,255,0.06)", 26);
  strokePath(ctx, path, "#2E3133", 14);
  strokePath(ctx, path, "rgba(255,255,255,0.22)", 2.5);
}

function drawFallbackDots(
  ctx: CanvasRenderingContext2D,
  pts: TrackPoint[],
  toCanvas: (p: TrackPoint) => { x: number; y: number },
) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const offsets = sorted.map(toCanvas);
  const path = new Path2D();
  path.moveTo(offsets[0].x, offsets[0].y);
  for (let i = 1; i < offsets.length; i++) path.lineTo(offsets[i].x, offsets[i].y);
  path.closePath();
  strokePath(ctx, path, "rgba(255,255,255,0.04)", 22);
  strokePath(ctx, path, "#2E3133", 14);
  strokePath(ctx, path, "rgba(255,255,255,0.18)", 3);
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  corners: { number: number; x: number; y: number }[],
  toCanvas: (p: TrackPoint) => { x: number; y: number },
) {
  for (const c of corners) {
    const pos = toCanvas(c);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
    paintText(ctx, String(c.number), pos.x, pos.y - 13, 7.5, "rgba(255,255,255,0.5)", "700");
  }
}

function drawCars(
  ctx: CanvasRenderingContext2D,
  carPositions: Record<string, TrackPoint>,
  leaderboard: Record<string, LeaderboardEntry>,
  toCanvas: (p: TrackPoint) => { x: number; y: number },
  viewZoom: number,
) {
  const entries = Object.entries(carPositions).sort((a, b) => {
    const pa = leaderboard[a[0]]?.position ?? 99;
    const pb = leaderboard[b[0]]?.position ?? 99;
    return pb - pa; // draw leader last (on top)
  });

  const s = 1 / Math.min(Math.max(viewZoom, 0.1), 10);
  const r = 10 * s;
  const rGlow = 14 * s;
  const rCenter = 4 * s;

  for (const [key, point] of entries) {
    const entry = leaderboard[key];
    const teamColor = entry ? teamColorHex(entry.teamColor) : "#FFFFFF";
    const pos = toCanvas(point);
    const label = entry?.shortName || key;
    const posNum = entry?.position != null ? String(entry.position) : "";

    ctx.beginPath();
    ctx.arc(pos.x + 2 * s, pos.y + 3 * s, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.filter = `blur(${3 * s}px)`;
    ctx.fill();
    ctx.filter = "none";

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rGlow, 0, Math.PI * 2);
    ctx.fillStyle = `color-mix(in srgb, ${teamColor} 28%, transparent)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = teamColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rCenter, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();

    if (posNum) paintText(ctx, posNum, pos.x, pos.y - 23 * s, 9 * s, teamColor, "700");
    paintText(ctx, label, pos.x, pos.y + 16 * s, 8 * s, "#FFFFFF", "600");
  }
}

function paintText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  weight: string,
) {
  ctx.font = `${weight} ${fontSize}px var(--font-f1), sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 4;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function paintWaiting(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.font = "13px var(--font-f1), sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#555759";
  ctx.fillText("Waiting for position data…", width / 2, height / 2);
}
