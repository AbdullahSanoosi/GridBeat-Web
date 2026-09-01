"use client";

import { useEffect, useRef, useState } from "react";
import { onFastestLap } from "@/lib/live/store";
import { fastestLapEventId, type FastestLapEvent } from "@/lib/models/live";
import { EventBanner } from "@/components/live/event-banner";

const DISPLAY_MS = 4000;

/**
 * One-shot animated banner driven by the store's fastest-lap event bus
 * (see onFastestLap in lib/live/store.ts) — deliberately not store state,
 * so remounting this component can't replay an old event.
 */
export function FastestLapOverlay() {
  const [event, setEvent] = useState<FastestLapEvent | null>(null);
  // The dismiss timer must live here, not as a value returned from the
  // onFastestLap listener — emitFastestLap's dispatch loop discards
  // whatever a listener returns, so a per-event cleanup closure never runs
  // and a fast back-to-back event could dismiss the newer banner early.
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onFastestLap((e) => {
      setEvent(e);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setEvent(null), DISPLAY_MS);
    });
  }, []);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  if (!event) return null;
  const code = (event.shortName || event.driverName).toUpperCase();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div className="w-full max-w-md">
        <EventBanner
          eventKey={fastestLapEventId(event)}
          accent="#9A2BD6"
          gradientFrom="#231A30"
          gradientTo="#130F1A"
          label={["FASTEST", "LAP"]}
          code={code}
          teamColorHex={event.teamColorHex}
          value={event.lapTime}
        />
      </div>
    </div>
  );
}
