"use client";

import { useCallback, useRef } from "react";
import { useLiveTimingStore } from "@/lib/live/store";
import type { PositionSample, TrackPoint } from "@/lib/models/live";

/**
 * Ported from the old track-map.tsx's rAF tick loop — same "virtual
 * playhead" algorithm (bootstrap runway, resync threshold, per-driver
 * sample queue + GC), just returning positions to a caller instead of
 * driving a canvas clear/redraw itself. Meant to be called once per frame
 * from R3F's useFrame with a monotonic ms timestamp (e.g.
 * performance.now()) — only the *delta* between calls matters, so the
 * timestamp source doesn't need to be epoch-based.
 */
const BOOTSTRAP_RUNWAY_MS = 250;
const RESYNC_THRESHOLD_MS = 10_000;
const MAX_QUEUE_LENGTH = 30;

interface DriverQueueState {
  queue: PositionSample[];
  lastIngestTime: number;
}

export function usePlayheadPositions() {
  const stateRef = useRef({
    lastTimestamp: null as number | null,
    virtualPlayhead: null as number | null,
    driverQueues: new Map<string, DriverQueueState>(),
  });

  return useCallback((timestamp: number): Record<string, TrackPoint> => {
    const s = stateRef.current;
    const { positionHistory: history, carPositions } = useLiveTimingStore.getState();

    const hasAnySample = Object.values(history).some((samples) => samples.length > 0);
    if (!hasAnySample) {
      s.virtualPlayhead = null;
      s.lastTimestamp = null;
      return carPositions;
    }

    let newestAll = 0;
    for (const samples of Object.values(history)) {
      if (samples.length === 0) continue;
      const t = samples[samples.length - 1].time;
      if (t > newestAll) newestAll = t;
    }

    const needsBootstrap =
      s.virtualPlayhead == null || Math.abs(newestAll - s.virtualPlayhead) > RESYNC_THRESHOLD_MS;
    let vp: number;
    if (needsBootstrap) {
      vp = newestAll - BOOTSTRAP_RUNWAY_MS;
      s.lastTimestamp = timestamp;
    } else {
      vp = s.virtualPlayhead!;
    }

    const delta = timestamp - (s.lastTimestamp ?? timestamp);
    s.lastTimestamp = timestamp;
    vp = vp + delta;
    if (vp > newestAll) vp = newestAll;
    s.virtualPlayhead = vp;

    const playhead = vp;
    const next: Record<string, TrackPoint> = {};

    for (const [driver, samples] of Object.entries(history)) {
      if (samples.length === 0) continue;
      const dq = s.driverQueues.get(driver) ?? { queue: [], lastIngestTime: -1 };
      for (const sample of samples) {
        if (sample.time > dq.lastIngestTime) dq.queue.push(sample);
      }
      dq.lastIngestTime = samples[samples.length - 1].time;
      s.driverQueues.set(driver, dq);

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

    for (const key of s.driverQueues.keys()) {
      if (!(key in history)) s.driverQueues.delete(key);
    }

    return next;
  }, []);
}
