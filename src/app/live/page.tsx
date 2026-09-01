"use client";

import { useEffect, useState } from "react";
import { useLiveTimingStore } from "@/lib/live/store";
import {
  activeSortedLeaderboard,
  grandPrixName,
  trackStatusColor,
  trackStatusLabel,
  type CarTelemetry,
  type DriverSteward,
  type LeaderboardEntry,
} from "@/lib/models/live";
import { useMounted } from "@/hooks/use-mounted";
import { RaceControlFeed, PitStopsList, TeamRadioList } from "@/components/live/comms";
import { WeatherPanel } from "@/components/live/weather-panel";
import { FastestLapOverlay } from "@/components/live/fastest-lap-overlay";
import { LeaderChangeOverlay } from "@/components/live/leader-change-overlay";
import { TrackMap } from "@/components/live/track-map";
import { TelemetryCompare } from "@/components/live/telemetry-compare";
import { TowerRow } from "@/components/live/tower-row";
import { TelemetrySheet } from "@/components/live/telemetry-sheet";
import { PlaybackControl } from "@/components/live/playback-control";
import { CommentaryPlayer } from "@/components/live/commentary-player";
import { BackendPanel } from "@/components/dev/backend-panel";

// Literal env expression (not an imported boolean) so Next.js's build-time
// inlining + minifier DCE can actually fold this branch away in the real
// production build — see src/lib/dev/dev-store.ts's module docstring.
const DEV_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_CONTROLS === "true";

export default function LiveTimingPage() {
  const mounted = useMounted();
  const connected = useLiveTimingStore((s) => s.connected);
  const sessionInfo = useLiveTimingStore((s) => s.sessionInfo);
  const trackStatus = useLiveTimingStore((s) => s.trackStatus);
  const clock = useLiveTimingStore((s) => s.clock);
  const currentLap = useLiveTimingStore((s) => s.currentLap);
  const totalLaps = useLiveTimingStore((s) => s.totalLaps);
  const debugInfo = useLiveTimingStore((s) => s.debugInfo);
  const leaderboard = useLiveTimingStore((s) => s.leaderboard);
  const telemetry = useLiveTimingStore((s) => s.telemetry);
  const raceControl = useLiveTimingStore((s) => s.raceControl);
  const pitStops = useLiveTimingStore((s) => s.pitStops);
  const teamRadio = useLiveTimingStore((s) => s.teamRadio);
  const weather = useLiveTimingStore((s) => s.weather);
  const telemetryHistory = useLiveTimingStore((s) => s.telemetryHistory);
  const lapTimeHistory = useLiveTimingStore((s) => s.lapTimeHistory);
  const currentLapSectors = useLiveTimingStore((s) => s.currentLapSectors);
  const gridPositions = useLiveTimingStore((s) => s.gridPositions);
  const stewardStatuses = useLiveTimingStore((s) => s.stewardStatuses);
  const qualifyingPart = useLiveTimingStore((s) => s.qualifyingPart);
  const connect = useLiveTimingStore((s) => s.connect);
  const reconnect = useLiveTimingStore((s) => s.reconnect);
  const forceRefresh = useLiveTimingStore((s) => s.forceRefresh);
  const onSessionEnded = useLiveTimingStore((s) => s.onSessionEnded);
  const [tab, setTab] = useState<"tower" | "comms" | "map" | "telemetry">("tower");
  const [telemetrySelected, setTelemetrySelected] = useState<Set<number>>(new Set());
  const [openDriver, setOpenDriver] = useState<number | null>(null);

  const toggleTelemetryDriver = (driverNumber: number) => {
    setTelemetrySelected((prev) => {
      const next = new Set(prev);
      if (next.has(driverNumber)) {
        next.delete(driverNumber);
      } else {
        next.add(driverNumber);
      }
      return next;
    });
  };

  useEffect(() => {
    connect();
    // Deliberately no disconnect on unmount — the WS connection is shared
    // app-wide (a singleton store), matching the Flutter app's provider
    // lifetime rather than a per-page connection.
  }, [connect]);

  const rows: LeaderboardEntry[] = mounted ? activeSortedLeaderboard({ leaderboard, telemetry }) : [];
  const hasAnyEntries = mounted && Object.keys(leaderboard).length > 0;
  const clockStopped = clock != null && !clock.extrapolating;
  const waitingToStart = connected && !hasAnyEntries;

  // Escalate session-change polling once the clock stops — mirrors
  // Flutter's _LiveHeader firing onSessionEnded() as soon as it renders
  // ENDED, so a real user (not just the dev panel) catches the next
  // session's start quickly instead of waiting on the normal 30s poll.
  useEffect(() => {
    if (mounted && clockStopped) onSessionEnded();
  }, [mounted, clockStopped, onSessionEnded]);

  const openEntry = openDriver != null ? leaderboard[String(openDriver)] : undefined;

  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <FastestLapOverlay />
      <LeaderChangeOverlay />
      <LiveHeader
        connected={mounted && connected}
        mounted={mounted}
        sessionName={mounted && sessionInfo ? grandPrixName(sessionInfo) : "LIVE TIMING"}
        sessionType={sessionInfo?.type ?? null}
        clockRemaining={clock?.remaining ?? null}
        currentLap={currentLap}
        totalLaps={totalLaps}
        qualifyingPart={mounted ? qualifyingPart : null}
        clockStopped={mounted && clockStopped}
        waitingToStart={mounted && waitingToStart}
        hasAnyEntries={hasAnyEntries}
        onReconnect={reconnect}
      />

      <div className="mb-4">
        <WeatherPanel weather={weather} isLive={mounted && connected && rows.length > 0} />
      </div>

      {mounted && trackStatus.status !== "1" && (
        <div
          className="animate-banner-slide-down mb-4 rounded-lg px-4 py-2 text-sm font-bold tracking-widest"
          style={{
            color: trackStatusColor(trackStatus.status),
            backgroundColor: `color-mix(in srgb, ${trackStatusColor(trackStatus.status)} 18%, transparent)`,
          }}
        >
          {trackStatusLabel(trackStatus.status)}
        </div>
      )}

      <div className="mb-4 overflow-x-auto">
        <div className="flex w-fit rounded-full border border-(--color-border) p-1">
          <TabButton active={tab === "tower"} onClick={() => setTab("tower")}>
            Tower
          </TabButton>
          <TabButton active={tab === "comms"} onClick={() => setTab("comms")}>
            Comms
          </TabButton>
          <TabButton active={tab === "map"} onClick={() => setTab("map")}>
            Map
          </TabButton>
          <TabButton active={tab === "telemetry"} onClick={() => setTab("telemetry")}>
            Telemetry
          </TabButton>
        </div>
      </div>

      {mounted && rows.length === 0 && (
        <div className="flex flex-col items-start gap-2 text-(--color-text-secondary)">
          <p>{connected ? (debugInfo ?? "Waiting for leaderboard…") : "Connecting to live timing…"}</p>
          <button
            onClick={() => void forceRefresh()}
            className="rounded-full border border-(--color-border) px-4 py-1.5 text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-primary)"
          >
            Retry now
          </button>
        </div>
      )}

      {rows.length > 0 && tab === "tower" && (
        <Tower
          rows={rows}
          telemetry={telemetry}
          gridPositions={gridPositions}
          stewardStatuses={stewardStatuses}
          onOpenDriver={setOpenDriver}
        />
      )}

      {tab === "map" && <TrackMap />}

      {tab === "telemetry" && (
        <TelemetryCompare
          drivers={rows}
          leaderboard={leaderboard}
          telemetryHistory={telemetryHistory}
          lapTimeHistory={lapTimeHistory}
          currentLapSectors={currentLapSectors}
          selected={telemetrySelected}
          onToggle={toggleTelemetryDriver}
        />
      )}

      {tab === "comms" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">RACE CONTROL</h2>
            <RaceControlFeed messages={raceControl} />
          </div>
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">PIT STOPS</h2>
              <PitStopsList stops={pitStops} />
            </div>
            <div>
              <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">TEAM RADIO</h2>
              <TeamRadioList messages={teamRadio} />
            </div>
          </div>
        </div>
      )}

      {openEntry && (
        <TelemetrySheet
          entry={openEntry}
          telemetry={telemetry[openEntry.driverNumber]}
          pitStops={pitStops.filter((p) => p.driverNumber === openEntry.driverNumber)}
          steward={stewardStatuses[openEntry.driverNumber]}
          onClose={() => setOpenDriver(null)}
        />
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-(--color-primary) text-(--color-on-secondary)"
          : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
      }`}
    >
      {children}
    </button>
  );
}

function LiveHeader({
  connected,
  mounted,
  sessionName,
  sessionType,
  clockRemaining,
  currentLap,
  totalLaps,
  qualifyingPart,
  clockStopped,
  waitingToStart,
  hasAnyEntries,
  onReconnect,
}: {
  connected: boolean;
  mounted: boolean;
  sessionName: string;
  sessionType: string | null;
  clockRemaining: string | null;
  currentLap: number | null;
  totalLaps: number | null;
  qualifyingPart: number | null;
  clockStopped: boolean;
  waitingToStart: boolean;
  hasAnyEntries: boolean;
  onReconnect: () => void;
}) {
  // Ported from GridBeat (Flutter)'s _LiveHeader status derivation.
  let statusLabel = "";
  let statusColor = "var(--color-secondary)";
  if (clockStopped) {
    statusLabel = "ENDED";
    statusColor = "var(--color-secondary)";
  } else if (waitingToStart) {
    statusLabel = "WAITING";
    statusColor = "var(--color-sector-yellow)";
  } else if (connected && hasAnyEntries) {
    statusLabel = "LIVE";
    statusColor = "var(--color-sector-green)";
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">{sessionName}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-(--color-text-secondary)">
          {sessionType && <span>{sessionType}</span>}
          {statusLabel && (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-black tracking-widest"
              style={{ color: statusColor, borderColor: `color-mix(in srgb, ${statusColor} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${statusColor} 16%, transparent)` }}
            >
              {statusLabel}
            </span>
          )}
          {qualifyingPart != null && (
            <span className="rounded-full border border-(--color-sector-purple)/50 bg-(--color-sector-purple)/16 px-2 py-0.5 text-[10px] font-black text-(--color-sector-purple)">
              Q{qualifyingPart}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-4">
        {clockRemaining && (
          <span className="rounded-full border border-(--color-border) px-3 py-1 tabular-nums">
            {clockRemaining}
          </span>
        )}
        {currentLap != null && totalLaps != null && (
          <span className="rounded-full border border-(--color-border) px-3 py-1 tabular-nums">
            LAP {currentLap}/{totalLaps}
          </span>
        )}
        <button
          onClick={onReconnect}
          className="flex items-center gap-2 rounded-full border border-(--color-border) px-3 py-1"
          title="Tap to reconnect"
        >
          <span
            className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-(--color-sector-green)" : "bg-(--color-text-muted)"}`}
          />
          {connected ? "LIVE" : "OFFLINE"}
        </button>
        {mounted && <PlaybackControl />}
        {mounted && <CommentaryPlayer />}
        {mounted && DEV_CONTROLS_ENABLED && <BackendPanel />}
      </div>
    </div>
  );
}

function Tower({
  rows,
  telemetry,
  gridPositions,
  stewardStatuses,
  onOpenDriver,
}: {
  rows: LeaderboardEntry[];
  telemetry: Record<number, CarTelemetry>;
  gridPositions: Record<number, number>;
  stewardStatuses: Record<number, DriverSteward>;
  onOpenDriver: (driverNumber: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-3 py-3 font-medium">P</th>
            <th className="px-3 py-3 font-medium">Driver</th>
            <th className="px-3 py-3 font-medium">Sectors</th>
            <th className="px-3 py-3 text-right font-medium">Lap Time</th>
            <th className="px-3 py-3 text-right font-medium">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TowerRow
              key={row.driverNumber}
              row={row}
              telemetry={telemetry[row.driverNumber]}
              gridPosition={gridPositions[row.driverNumber]}
              steward={stewardStatuses[row.driverNumber]}
              onOpen={() => onOpenDriver(row.driverNumber)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
