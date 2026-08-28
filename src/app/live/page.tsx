"use client";

import { useEffect, useState } from "react";
import { useLiveTimingStore } from "@/lib/live/store";
import {
  activeSortedLeaderboard,
  formattedLapTime,
  grandPrixName,
  teamColorHex,
  type LeaderboardEntry,
} from "@/lib/models/live";
import { useMounted } from "@/hooks/use-mounted";
import { RaceControlFeed, PitStopsList, TeamRadioList } from "@/components/live/comms";
import { WeatherPanel } from "@/components/live/weather-panel";
import { FastestLapOverlay } from "@/components/live/fastest-lap-overlay";
import { TrackMap } from "@/components/live/track-map";
import { TelemetryCompare } from "@/components/live/telemetry-compare";
import { PlaybackControl } from "@/components/live/playback-control";

const SECTOR_COLORS: Record<number, string> = {
  0: "var(--color-border)",
  1: "var(--color-on-secondary)",
  2: "var(--color-sector-green)",
  3: "var(--color-sector-purple)",
};

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
  const connect = useLiveTimingStore((s) => s.connect);
  const reconnect = useLiveTimingStore((s) => s.reconnect);
  const [tab, setTab] = useState<"tower" | "comms" | "map" | "telemetry">("tower");
  const [telemetrySelected, setTelemetrySelected] = useState<Set<number>>(new Set());

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

  return (
    <main className="flex-1 px-8 py-8">
      <FastestLapOverlay />
      <LiveHeader
        connected={mounted && connected}
        mounted={mounted}
        sessionName={mounted && sessionInfo ? grandPrixName(sessionInfo) : "LIVE TIMING"}
        sessionType={sessionInfo?.type ?? null}
        clockRemaining={clock?.remaining ?? null}
        currentLap={currentLap}
        totalLaps={totalLaps}
        onReconnect={reconnect}
      />

      {mounted && rows.length > 0 && (
        <div className="mb-4">
          <WeatherPanel weather={weather} />
        </div>
      )}

      {mounted && trackStatus.status !== "1" && (
        <div className="mb-4 rounded-lg bg-(--color-warning)/20 px-4 py-2 text-sm font-medium text-(--color-warning)">
          {trackStatus.message || `Track status ${trackStatus.status}`}
        </div>
      )}

      <div className="mb-4 flex rounded-full border border-(--color-border) p-1" style={{ width: "fit-content" }}>
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

      {mounted && rows.length === 0 && (
        <p className="text-(--color-text-secondary)">
          {connected ? (debugInfo ?? "Waiting for leaderboard…") : "Connecting to live timing…"}
        </p>
      )}

      {rows.length > 0 && tab === "tower" && <Tower rows={rows} />}

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
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
  onReconnect,
}: {
  connected: boolean;
  mounted: boolean;
  sessionName: string;
  sessionType: string | null;
  clockRemaining: string | null;
  currentLap: number | null;
  totalLaps: number | null;
  onReconnect: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-[var(--font-f1)] text-2xl font-bold">{sessionName}</h1>
        {sessionType && <p className="text-sm text-(--color-text-secondary)">{sessionType}</p>}
      </div>
      <div className="flex items-center gap-4 text-sm">
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
        >
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-(--color-sector-green)" : "bg-(--color-text-muted)"}`}
          />
          {connected ? "LIVE" : "OFFLINE"}
        </button>
        {mounted && <PlaybackControl />}
      </div>
    </div>
  );
}

function Tower({ rows }: { rows: LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--color-border)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-muted)">
            <th className="px-3 py-3 font-medium">P</th>
            <th className="px-3 py-3 font-medium">Driver</th>
            <th className="px-3 py-3 font-medium">Tyre</th>
            <th className="px-3 py-3 font-medium">Sectors</th>
            <th className="px-3 py-3 text-right font-medium">Lap Time</th>
            <th className="px-3 py-3 text-right font-medium">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TowerRow key={row.driverNumber} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TowerRow({ row }: { row: LeaderboardEntry }) {
  const lapTimeColor =
    row.lapTimeStatus === 3
      ? "var(--color-sector-purple)"
      : row.lapTimeStatus === 2
        ? "var(--color-sector-green)"
        : "var(--color-on-secondary)";

  return (
    <tr className="border-b border-(--color-divider) last:border-0 hover:bg-(--color-surface-elevated)">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: teamColorHex(row.teamColor) }} />
          <span className="tabular-nums">
            {row.retired ? "DNF" : row.knockedOut ? `Q${row.eliminatedInPart ?? ""}` : row.position}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 font-medium">
          {row.shortName || row.name}
          {row.inPit && (
            <span className="rounded bg-(--color-info)/20 px-1.5 py-0.5 text-[10px] font-bold text-(--color-info)">
              PIT
            </span>
          )}
          {row.hasFastestLap && (
            <span className="rounded bg-(--color-sector-purple)/20 px-1.5 py-0.5 text-[10px] font-bold text-(--color-sector-purple)">
              FL
            </span>
          )}
        </div>
        <div className="text-xs text-(--color-text-muted)">{row.team}</div>
      </td>
      <td className="px-3 py-2.5 text-(--color-text-secondary)">{row.tyre}</td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          {row.sectorStatus.map((s, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SECTOR_COLORS[s] ?? SECTOR_COLORS[0] }}
            />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: lapTimeColor }}>
        {formattedLapTime(row.lastLapTime)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-(--color-text-secondary)">{row.gapToLeader}</td>
    </tr>
  );
}
