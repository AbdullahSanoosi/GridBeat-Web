/**
 * Ported from GridBeat (Flutter) lib/services/websocket_service.dart.
 * Exponential backoff 1s -> 30s, reset on successful handshake,
 * intentional-close guard so a manual disconnect never triggers reconnect,
 * silently drops Heartbeat frames.
 */
import { activeLiveWsUrl } from "@/lib/dev/dev-store";

export type WsConnectionState = "disconnected" | "connecting" | "connected" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export class LiveWebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private nextBackoffMs = INITIAL_BACKOFF_MS;

  private messageListeners = new Set<(msg: Json) => void>();
  private stateListeners = new Set<(state: WsConnectionState) => void>();

  onMessage(listener: (msg: Json) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStateChange(listener: (state: WsConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private emitState(state: WsConnectionState) {
    for (const l of this.stateListeners) l(state);
  }

  connect(): void {
    this.intentionalClose = false;
    this.emitState("connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(activeLiveWsUrl());
    } catch {
      this.emitState("error");
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (this.intentionalClose) return;
      this.emitState("connected");
      // Healthy handshake - reset backoff so the next drop starts at 1s again.
      this.nextBackoffMs = INITIAL_BACKOFF_MS;
    };

    socket.onmessage = (event) => {
      let text: string;
      if (typeof event.data === "string") {
        text = event.data;
      } else {
        // Binary frame - shouldn't normally happen for this feed, but the
        // Flutter client handles it defensively too.
        return;
      }
      let msg: Json;
      try {
        msg = JSON.parse(text);
      } catch {
        return; // malformed frame - swallow, matches Flutter behavior
      }
      if (msg?.type === "Heartbeat") return;
      for (const l of this.messageListeners) l(msg);
    };

    socket.onerror = () => {
      if (this.intentionalClose) return;
      this.emitState("error");
    };

    socket.onclose = () => {
      if (this.intentionalClose) return;
      this.emitState("disconnected");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.nextBackoffMs = Math.min(this.nextBackoffMs * 2, MAX_BACKOFF_MS);
      this.connect();
    }, this.nextBackoffMs);
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.nextBackoffMs = INITIAL_BACKOFF_MS;
    this.socket?.close();
    this.socket = null;
  }

  dispose(): void {
    this.disconnect();
    this.messageListeners.clear();
    this.stateListeners.clear();
  }
}
