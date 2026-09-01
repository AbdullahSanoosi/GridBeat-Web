"use client";

import { useEffect, useRef } from "react";
import type { RaceControlMessage, PitStop, TeamRadioMessage } from "@/lib/models/live";
import { formattedPitDuration, pitStopTimeStr } from "@/lib/models/live";
import { useRadioPlaybackStore } from "@/lib/live/radio-playback-store";

const timeFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function timeStr(utc: string): string {
  const dt = new Date(utc);
  if (Number.isNaN(dt.getTime())) {
    return utc.length > 19 ? utc.slice(11, 19) : "";
  }
  return timeFormatter.format(dt);
}

const FLAG_COLORS: Record<string, string> = {
  YELLOW: "var(--color-warning)",
  RED: "var(--color-error)",
  GREEN: "var(--color-sector-green)",
  BLUE: "var(--color-info)",
  BLACK: "var(--color-secondary)",
  CHEQUERED: "var(--color-on-secondary)",
};

function categoryColor(m: RaceControlMessage): string {
  const category = m.category.toUpperCase();
  if (category === "FLAG") return FLAG_COLORS[m.flag?.toUpperCase() ?? ""] ?? "var(--color-text-secondary)";
  if (category === "SAFETYCAR") return "var(--color-warning)";
  if (category === "DRS") return "var(--color-sector-green)";
  if (category === "STEWARD") return "var(--color-info)";
  return "var(--color-text-secondary)";
}

export function RaceControlFeed({ messages }: { messages: RaceControlMessage[] }) {
  return (
    <div className="flex flex-col gap-2">
      {messages.length === 0 && (
        <p className="text-sm text-(--color-text-muted)">Race control messages on the way — brief server sync.</p>
      )}
      {messages.map((m, i) => (
        <RaceControlTile key={`${m.utc}-${i}`} message={m} isLatest={i === 0} />
      ))}
    </div>
  );
}

function RaceControlTile({ message, isLatest }: { message: RaceControlMessage; isLatest: boolean }) {
  const color = categoryColor(message);
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: isLatest ? `color-mix(in srgb, ${color} 14%, transparent)` : "var(--color-surface-elevated)",
        border: isLatest ? `1px solid color-mix(in srgb, ${color} 50%, transparent)` : undefined,
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-black tracking-wider" style={{ color }}>
          {message.category.toUpperCase()}
        </span>
        {message.flag && (
          <span className="text-[10px] font-bold tracking-wide" style={{ color: FLAG_COLORS[message.flag.toUpperCase()] ?? color }}>
            · {message.flag.toUpperCase()}
          </span>
        )}
        <span className="ml-auto text-[10px] text-(--color-text-muted)">{timeStr(message.utc)}</span>
      </div>
      <p className="text-sm leading-snug">{message.message}</p>
      {message.lapNumber != null && (
        <p className="mt-1 text-[10px] text-(--color-text-muted)">
          Lap {message.lapNumber}
          {message.sector != null && ` · Sector ${message.sector}`}
        </p>
      )}
    </div>
  );
}

export function PitStopsList({ stops }: { stops: PitStop[] }) {
  return (
    <div className="flex flex-col gap-2">
      {stops.length === 0 && <p className="text-sm text-(--color-text-muted)">No pit stops yet.</p>}
      {stops.map((p, i) => (
        <div
          key={`${p.driverNumber}-${p.lapNumber}-${i}`}
          className="flex items-center justify-between rounded-lg bg-(--color-surface-elevated) px-3 py-2 text-sm"
        >
          <div>
            <div className="font-medium">#{p.driverNumber}</div>
            <div className="text-[10px] text-(--color-text-muted)">
              Lap {p.lapNumber} · Stop {p.stopNumber}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold tabular-nums">{formattedPitDuration(p)}</div>
            <div className="text-[10px] text-(--color-text-muted)">{pitStopTimeStr(p)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamRadioList({ messages }: { messages: TeamRadioMessage[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingUrl = useRadioPlaybackStore((s) => s.playingUrl);
  const setPlayingUrl = useRadioPlaybackStore((s) => s.setPlayingUrl);

  // Stop playback when leaving the live dashboard entirely — without this,
  // switching off the Comms tab mid-clip orphans the Audio() instance and
  // it keeps playing in the background with no UI left to pause it (see
  // commentary-player.tsx, which does this same cleanup for the same reason).
  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  function toggle(url: string) {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlayingUrl(null);
    setPlayingUrl(url);
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.length === 0 && <p className="text-sm text-(--color-text-muted)">No team radio for this session.</p>}
      {messages.map((m, i) => {
        const isPlaying = playingUrl === m.recordingUrl;
        return (
          <div
            key={`${m.recordingUrl}-${i}`}
            className="flex items-start gap-3 rounded-xl bg-(--color-surface-elevated) p-3"
          >
            <button
              onClick={() => toggle(m.recordingUrl)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-(--color-on-secondary)"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2 text-xs">
                <span className="font-medium">#{m.racingNumber}</span>
                <span className="text-(--color-text-muted)">{timeStr(m.utc)}</span>
              </div>
              {m.transcript && <p className="text-sm text-(--color-text-secondary)">&ldquo;{m.transcript}&rdquo;</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
