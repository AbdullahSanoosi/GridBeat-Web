"use client";

/**
 * Dev-only chip + popover, same interaction pattern as PlaybackControl —
 * lets you and Sajjad switch the live-timing page between production live
 * and the replay backend, and drive the replay backend's control API
 * (pick a session file, speed, start line; start/stop) without SSH.
 *
 * Only ever rendered when config.devControlsEnabled is true (checked by the
 * caller, src/app/live/page.tsx) — see dev-store.ts's module docstring for
 * why that means this whole component is compiled out of the real
 * production bundle, not just hidden.
 */
import { useState } from "react";
import { useDevStore, replayBackendConfigured } from "@/lib/dev/dev-store";
import { useLiveTimingStore } from "@/lib/live/store";
import {
  getReplaySessions,
  getReplayStatus,
  startReplay,
  stopReplay,
  type ReplaySession,
  type ReplayStatus,
} from "@/lib/api/replay-control-api";

export function BackendPanel() {
  const [open, setOpen] = useState(false);
  const backendMode = useDevStore((s) => s.backendMode);
  const setBackendMode = useDevStore((s) => s.setBackendMode);
  const replayControlToken = useDevStore((s) => s.replayControlToken);
  const setReplayControlToken = useDevStore((s) => s.setReplayControlToken);
  const forceRefresh = useLiveTimingStore((s) => s.forceRefresh);

  const [sessions, setSessions] = useState<ReplaySession[] | null>(null);
  const [status, setStatus] = useState<ReplayStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [speed, setSpeed] = useState(10);
  const [startLine, setStartLine] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReplay = backendMode === "replay";
  const chipLabel = isReplay ? "REPLAY" : "LIVE";
  const chipColor = isReplay ? "var(--color-sector-yellow)" : "var(--color-text-muted)";

  async function refreshReplayInfo() {
    setError(null);
    try {
      const [sess, st] = await Promise.all([getReplaySessions(), getReplayStatus()]);
      setSessions(sess);
      setStatus(st);
      if (!selectedFile && sess.length > 0) setSelectedFile(sess[0].file);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function switchMode(mode: "live" | "replay") {
    setBackendMode(mode);
    forceRefresh();
    if (mode === "replay" && sessions === null) refreshReplayInfo();
  }

  async function handleStart() {
    if (!selectedFile || !replayControlToken) return;
    setBusy(true);
    setError(null);
    try {
      const st = await startReplay(replayControlToken, { file: selectedFile, speed, start_line: startLine });
      setStatus(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!replayControlToken) return;
    setBusy(true);
    setError(null);
    try {
      const st = await stopReplay(replayControlToken);
      setStatus(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full px-3 py-1 text-[10px] font-black tracking-wide transition-colors"
        style={{ backgroundColor: `color-mix(in srgb, ${chipColor} 14%, transparent)`, color: chipColor }}
      >
        {chipLabel}
      </button>

      {open && (
        <>
          <button
            aria-label="Close backend controls"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-96 rounded-2xl border border-(--color-border) bg-(--color-surface-elevated) p-4 shadow-xl">
            <div className="text-xs font-black tracking-wide">DEV: DATA SOURCE</div>
            <p className="mt-1 text-[11px] leading-relaxed text-(--color-text-secondary)">
              Internal only — switches which backend this page talks to. Doesn&rsquo;t affect other viewers.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => switchMode("live")}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide"
                style={{
                  backgroundColor: !isReplay ? "var(--color-primary)" : "var(--color-surface)",
                  color: !isReplay ? "var(--color-on-secondary)" : "var(--color-text-primary)",
                  border: !isReplay ? "none" : "1px solid var(--color-border)",
                }}
              >
                LIVE
              </button>
              <button
                onClick={() => switchMode("replay")}
                disabled={!replayBackendConfigured}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide disabled:opacity-40"
                style={{
                  backgroundColor: isReplay ? "var(--color-sector-yellow)" : "var(--color-surface)",
                  color: isReplay ? "#000000" : "var(--color-text-primary)",
                  border: isReplay ? "none" : "1px solid var(--color-border)",
                }}
              >
                REPLAY
              </button>
            </div>
            {!replayBackendConfigured && (
              <p className="mt-2 text-[10px] text-(--color-text-muted)">
                Set NEXT_PUBLIC_REPLAY_API_BASE_URL and NEXT_PUBLIC_REPLAY_WS_URL to enable replay mode.
              </p>
            )}

            {isReplay && (
              <div className="mt-4 border-t border-(--color-border) pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">
                    REPLAY BACKEND
                  </span>
                  <button
                    onClick={refreshReplayInfo}
                    className="text-[10px] font-extrabold tracking-wide text-(--color-primary)"
                  >
                    REFRESH
                  </button>
                </div>

                <p className="mt-2 text-[11px] text-(--color-text-secondary)">
                  {status === null
                    ? "Status unknown — hit refresh."
                    : status.state === "running"
                      ? `Running: ${status.file} @ ${status.speed}x from line ${status.start_line}`
                      : "Idle — nothing playing."}
                </p>

                <label className="mt-3 block text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">
                  CONTROL TOKEN
                </label>
                <input
                  type="password"
                  value={replayControlToken}
                  onChange={(e) => setReplayControlToken(e.target.value)}
                  placeholder="X-Replay-Control-Token"
                  className="mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-xs"
                />

                <label className="mt-3 block text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">
                  SESSION
                </label>
                <select
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-xs"
                >
                  {sessions === null && <option value="">Loading…</option>}
                  {sessions?.length === 0 && <option value="">No sessions found</option>}
                  {sessions?.map((s) => (
                    <option key={s.file} value={s.file}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <div className="mt-3 flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">
                      SPEED
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-extrabold tracking-wide text-(--color-text-muted)">
                      START LINE
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={startLine}
                      onChange={(e) => setStartLine(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleStart}
                    disabled={busy || !selectedFile || !replayControlToken}
                    className="flex-1 rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide disabled:opacity-40"
                    style={{ backgroundColor: "var(--color-sector-green)", color: "#000000" }}
                  >
                    START
                  </button>
                  <button
                    onClick={handleStop}
                    disabled={busy || !replayControlToken}
                    className="flex-1 rounded-lg border border-(--color-border) px-3 py-2 text-xs font-extrabold tracking-wide disabled:opacity-40"
                  >
                    STOP
                  </button>
                </div>

                {error && (
                  <p className="mt-3 text-[10px]" style={{ color: "var(--color-error)" }}>
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
