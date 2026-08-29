/**
 * Talks to the replay backend's control routes (see f1-backend's
 * app/api/main.py, /api/replay/*) — always against
 * NEXT_PUBLIC_REPLAY_API_BASE_URL specifically, regardless of which backend
 * the dashboard's own live-timing view is currently pointed at (dev-store's
 * backendMode). "Which session is the replay backend playing" and "which
 * backend is my dashboard watching" are related but separate controls.
 */
import { config } from "@/lib/config";

export interface ReplaySession {
  file: string;
  label: string;
  size_bytes: number;
}

export interface ReplayStatus {
  state: "idle" | "running";
  file?: string | null;
  speed?: number | null;
  start_line?: number | null;
}

class ReplayControlError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  if (!config.replayApiBaseUrl) throw new Error("NEXT_PUBLIC_REPLAY_API_BASE_URL is not configured");
  const res = await fetch(`${config.replayApiBaseUrl}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ReplayControlError(body?.detail ?? `${path} failed: ${res.status}`, res.status);
  }
  return res.json();
}

async function post<T>(path: string, token: string, body?: unknown): Promise<T> {
  if (!config.replayApiBaseUrl) throw new Error("NEXT_PUBLIC_REPLAY_API_BASE_URL is not configured");
  const res = await fetch(`${config.replayApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Replay-Control-Token": token,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => null);
    throw new ReplayControlError(responseBody?.detail ?? `${path} failed: ${res.status}`, res.status);
  }
  return res.json();
}

export const getReplaySessions = (): Promise<ReplaySession[]> => get("/api/replay/sessions");
export const getReplayStatus = (): Promise<ReplayStatus> => get("/api/replay/status");

export const startReplay = (
  token: string,
  params: { file: string; speed: number; start_line: number },
): Promise<ReplayStatus> => post("/api/replay/start", token, params);

export const stopReplay = (token: string): Promise<ReplayStatus> => post("/api/replay/stop", token);
