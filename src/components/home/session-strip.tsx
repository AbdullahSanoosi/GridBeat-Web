"use client";

import { useLiveTimingStore } from "@/lib/live/store";
import {
  activeSortedLeaderboard,
  grandPrixName,
  trackStatusColor,
  trackStatusLabel,
} from "@/lib/models/live";
import type { UpcomingSession } from "@/lib/models/schedule";

/**
 * The hero's status bar, driven by the real live-timing WebSocket rather
 * than fixture text — same store the /live dashboard uses.
 *
 * There is no live session most of the time, so this degrades honestly
 * instead of pretending: with a session it reports the actual GP, session
 * type, lap count and track status; without one it falls back to the next
 * round from the schedule API. It never claims LIVE when it isn't.
 */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

export function SessionStrip({ upcoming }: { upcoming?: UpcomingSession | null }) {
  const connected = useLiveTimingStore((s) => s.connected);
  const sessionInfo = useLiveTimingStore((s) => s.sessionInfo);
  const leaderboard = useLiveTimingStore((s) => s.leaderboard);
  const telemetry = useLiveTimingStore((s) => s.telemetry);
  const currentLap = useLiveTimingStore((s) => s.currentLap);
  const totalLaps = useLiveTimingStore((s) => s.totalLaps);
  const clock = useLiveTimingStore((s) => s.clock);
  const trackStatus = useLiveTimingStore((s) => s.trackStatus);

  const entries = activeSortedLeaderboard({ leaderboard, telemetry });
  const hasField = entries.length > 0;
  const clockStopped = clock != null && !clock.extrapolating;

  // No session on the wire at all — report the next round instead of
  // inventing a live one.
  if (!sessionInfo) {
    return (
      <Bar>
        {upcoming ? (
          <>
            <Badge color="var(--color-primary)" label="NEXT" />
            <Dot />
            <Meta>{upcoming.race.raceName.replace(/\s*Grand Prix\s*/i, "").toUpperCase()} GP</Meta>
            <Dot />
            <Meta>{upcoming.name.toUpperCase()}</Meta>
            <Dot />
            <Meta>
              {dateFormatter.format(upcoming.at).toUpperCase()}
              {upcoming.timed && ` · ${timeFormatter.format(upcoming.at)}`}
            </Meta>
            <Trailing>{upcoming.race.circuit.locality?.toUpperCase()}</Trailing>
          </>
        ) : (
          <>
            <Badge color="var(--color-text-muted)" label={connected ? "STANDBY" : "CONNECTING"} pulse={false} />
            <Dot />
            <Meta>NO SESSION ON AIR</Meta>
          </>
        )}
      </Bar>
    );
  }

  // Mirrors the /live header's status derivation.
  const status = clockStopped
    ? { label: "ENDED", color: "var(--color-text-muted)", pulse: false }
    : !connected
      ? { label: "OFFLINE", color: "var(--color-text-muted)", pulse: false }
      : hasField
        ? { label: "LIVE", color: "var(--color-sector-green)", pulse: true }
        : { label: "WAITING", color: "var(--color-sector-yellow)", pulse: false };

  const flagged = trackStatus.status !== "1";

  return (
    <Bar>
      <Badge color={status.color} label={status.label} pulse={status.pulse} />
      <Dot />
      <Meta>{grandPrixName(sessionInfo)}</Meta>
      {sessionInfo.name && (
        <>
          <Dot />
          <Meta>{sessionInfo.name.toUpperCase()}</Meta>
        </>
      )}
      {currentLap != null && (
        <>
          <Dot />
          <Meta>
            LAP {currentLap}
            {totalLaps != null && ` / ${totalLaps}`}
          </Meta>
        </>
      )}
      {flagged && (
        <>
          <Dot />
          <span
            className="rounded-full px-2 py-0.5 font-[var(--font-f1)] text-[9px] font-black tracking-[0.14em] sm:text-[10px]"
            style={{
              color: trackStatusColor(trackStatus.status),
              backgroundColor: `color-mix(in srgb, ${trackStatusColor(trackStatus.status)} 18%, transparent)`,
            }}
          >
            {trackStatusLabel(trackStatus.status)}
          </span>
        </>
      )}
      <Trailing>{sessionInfo.location?.toUpperCase()}</Trailing>
    </Bar>
  );
}

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 bg-black/40 px-5 py-2.5 backdrop-blur-sm sm:gap-x-5 sm:px-8">
      {children}
    </div>
  );
}

function Badge({ color, label, pulse = true }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <span className="font-[var(--font-f1)] text-[9px] font-bold tracking-[0.2em] sm:text-[10px]" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[var(--font-f1)] text-[9px] font-bold tracking-[0.16em] text-white/55 sm:text-[10px]">
      {children}
    </span>
  );
}

function Trailing({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <span className="ml-auto hidden font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-white/35 sm:inline">
      {children}
    </span>
  );
}

function Dot() {
  return <span className="h-[3px] w-[3px] rounded-full bg-white/25" />;
}
