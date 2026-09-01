"use client";

import { useEffect, useRef, useState } from "react";
import { onLeaderChange } from "@/lib/live/store";
import { leaderChangeEventId, type LeaderChangeEvent } from "@/lib/models/live";
import { EventBanner } from "@/components/live/event-banner";

const DISPLAY_MS = 4000;

/**
 * One-shot animated banner for an on-track P1 overtake, driven by the
 * store's leader-change event bus (see onLeaderChange in lib/live/store.ts)
 * — ported from GridBeat (Flutter)'s LeaderChangeOverlay. Sits above
 * FastestLapOverlay in the stacking order (both render fixed to the top of
 * the viewport) — a leader change and a fastest lap can land in the same
 * tick, and the newer/rarer leader-change event should be the one on top.
 */
export function LeaderChangeOverlay() {
  const [event, setEvent] = useState<LeaderChangeEvent | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onLeaderChange((e) => {
      setEvent(e);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setEvent(null), DISPLAY_MS);
    });
  }, []);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  if (!event) return null;
  const code = (event.shortName || event.driverName).toUpperCase();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[51] flex justify-center">
      <div className="w-full max-w-md">
        <EventBanner
          eventKey={leaderChangeEventId(event)}
          accent="#E0A72B"
          gradientFrom="#332A14"
          gradientTo="#1A150A"
          label={["NEW", "LEADER"]}
          code={code}
          teamColorHex={event.teamColorHex}
          value={event.lapNumber != null ? `LAP ${event.lapNumber}` : ""}
        />
      </div>
    </div>
  );
}
