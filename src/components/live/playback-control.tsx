"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/presentation/live_timing_screen.dart's
 * _PlaybackChip + _PlaybackSheet — a status chip that opens the delay
 * slider / pause / skip-to-live controls. A small anchored popover instead
 * of the Flutter version's modal bottom sheet, matching the same
 * sheet-to-desktop-affordance swap used for Telemetry Compare.
 */
import { useState } from "react";
import { useLiveTimingStore } from "@/lib/live/store";

export function PlaybackControl() {
  const [open, setOpen] = useState(false);
  const playbackDelayMs = useLiveTimingStore((s) => s.playbackDelayMs);
  const paused = useLiveTimingStore((s) => s.paused);
  const bufferedMs = useLiveTimingStore((s) => s.bufferedMs);
  const setPlaybackDelay = useLiveTimingStore((s) => s.setPlaybackDelay);
  const pausePlayback = useLiveTimingStore((s) => s.pausePlayback);
  const resumePlayback = useLiveTimingStore((s) => s.resumePlayback);
  const skipToLive = useLiveTimingStore((s) => s.skipToLive);

  const catchingUp = !paused && bufferedMs > 1000;
  const delaySeconds = Math.round(playbackDelayMs / 1000);

  let label: string;
  let color: string;
  if (paused) {
    label = "PAUSED";
    color = "var(--color-error)";
  } else if (catchingUp) {
    label = `${Math.round(bufferedMs / 1000)}s`;
    color = "var(--color-sector-yellow)";
  } else if (playbackDelayMs > 0) {
    label = `-${delaySeconds}s`;
    color = "var(--color-sector-yellow)";
  } else {
    label = "LIVE";
    color = "var(--color-text-muted)";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-3 py-1 text-[10px] font-black tracking-wide transition-colors"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      >
        {label}
      </button>

      {open && (
        <>
          <button
            aria-label="Close playback controls"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-xl">
            <div className="text-xs font-black tracking-wide">LIVE FEED SYNC</div>
            <p className="mt-1 text-[11px] leading-relaxed text-(--color-text-secondary)">
              Raw timing data arrives ahead of any video broadcast. Delay it to match your stream, or pause while
              you&rsquo;re away.
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">DELAY</span>
              <span className="text-xs font-extrabold text-(--color-primary)">
                {playbackDelayMs === 0 ? "LIVE" : `${delaySeconds}s BEHIND`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={delaySeconds}
              onChange={(e) => setPlaybackDelay(Number(e.target.value) * 1000)}
              style={{ accentColor: "var(--color-primary)" }}
              className="mt-2 w-full"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={paused ? resumePlayback : pausePlayback}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide"
                style={{
                  backgroundColor: paused ? "var(--color-sector-green)" : "var(--color-surface)",
                  color: paused ? "#000000" : "var(--color-text-primary)",
                  border: paused ? "none" : "1px solid var(--color-border)",
                }}
              >
                {paused ? "RESUME" : "PAUSE"}
              </button>
              <button
                onClick={skipToLive}
                disabled={!(paused || catchingUp || playbackDelayMs > 0)}
                className="flex-1 rounded-lg border border-(--color-border) px-3 py-2 text-xs font-extrabold tracking-wide disabled:opacity-40"
              >
                LIVE
              </button>
            </div>

            {paused ? (
              <p className="mt-3 text-[10px] text-(--color-text-muted)">
                Buffering in the background — resume to play through what you missed, or skip straight to live.
              </p>
            ) : catchingUp ? (
              <p className="mt-3 text-[10px]" style={{ color: "var(--color-sector-yellow)" }}>
                Catching up — {Math.round(bufferedMs / 1000)}s of buffered data left to play through.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
