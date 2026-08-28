"use client";

import { useEffect, useState } from "react";
import { onFastestLap } from "@/lib/live/store";
import type { FastestLapEvent } from "@/lib/models/live";

const DISPLAY_MS = 4000;

/**
 * One-shot animated banner driven by the store's fastest-lap event bus
 * (see onFastestLap in lib/live/store.ts) — deliberately not store state,
 * so remounting this component can't replay an old event.
 */
export function FastestLapOverlay() {
  const [event, setEvent] = useState<FastestLapEvent | null>(null);

  useEffect(() => {
    return onFastestLap((e) => {
      setEvent(e);
      const timer = setTimeout(() => setEvent(null), DISPLAY_MS);
      return () => clearTimeout(timer);
    });
  }, []);

  if (!event) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div
        className="animate-fastest-lap-in rounded-2xl border px-6 py-3 shadow-2xl"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-sector-purple) 20%, var(--color-surface))",
          borderColor: "var(--color-sector-purple)",
        }}
      >
        <div className="text-center text-[10px] font-black tracking-widest text-(--color-sector-purple)">
          FASTEST LAP
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: event.teamColorHex }} />
          <span className="font-[var(--font-f1)] text-lg font-bold">{event.shortName || event.driverName}</span>
          <span className="tabular-nums text-(--color-sector-purple)">{event.lapTime}</span>
        </div>
      </div>
    </div>
  );
}
