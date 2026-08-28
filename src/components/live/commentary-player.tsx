"use client";

/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/presentation/live_timing_screen.dart's
 * commentary player (`_commentaryPlayerProvider`, `_syncCommentaryPlayback`,
 * `_CommentaryToggle`) — F1's own live broadcast coverage audio (HLS),
 * distinct from team radio clips. A single effect keyed on
 * [stream URL, enabled, radio-ducking] plays the role of the Dart version's
 * `_syncCommentaryPlayback`, called from three separate `ref.listen`
 * callbacks — React's dependency array collapses those into one place.
 *
 * HLS playback: Safari plays .m3u8 natively via <audio>; every other
 * browser needs hls.js (MSE-based), lazy-loaded on first use so the ~600KB
 * library never loads for anyone who leaves commentary off.
 *
 * Includes the fix from the Flutter feature/commentary-audio branch:
 * AudioStreams is a one-shot event (F1 sends it once, early in the
 * session), so store.ts's onRawMessage applies it immediately instead of
 * routing it through the DVR buffer, where a long pause/delay could let
 * trimBuffer silently evict it before it's ever applied.
 */
import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import { useLiveTimingStore } from "@/lib/live/store";
import { primaryCommentaryStream } from "@/lib/models/live";
import { useRadioPlaybackStore } from "@/lib/live/radio-playback-store";

export function CommentaryPlayer() {
  const audioStreams = useLiveTimingStore((s) => s.audioStreams);
  const stream = primaryCommentaryStream({ audioStreams });
  const radioPlayingUrl = useRadioPlaybackStore((s) => s.playingUrl);

  // User-controlled mute toggle — persists across tab switches but not
  // across a page reload (deliberately simple; not worth persisting to
  // disk for a live-only stream that's silent again next visit by default).
  const [enabled, setEnabled] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  // Last URL actually loaded into the player — avoids re-attaching HLS on
  // every effect run when nothing about the stream has changed.
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const duckedForRadio = radioPlayingUrl != null;
    // Read fresh rather than closing over the outer `stream` — it's a new
    // object reference every render (primaryCommentaryStream isn't
    // memoized), so depending on it here would defeat the point of keying
    // this effect on `stream?.uri` alone.
    const stream = primaryCommentaryStream(useLiveTimingStore.getState());

    async function sync() {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;

      if (!enabled || !stream || duckedForRadio) {
        audio.pause();
        return;
      }
      if (stream.uri === loadedUrlRef.current && !audio.paused) return;

      if (stream.uri !== loadedUrlRef.current) {
        hlsRef.current?.destroy();
        hlsRef.current = null;

        if (audio.canPlayType("application/vnd.apple.mpegurl")) {
          audio.src = stream.uri;
        } else {
          const { default: HlsLib } = await import("hls.js");
          if (cancelled) return;
          if (!HlsLib.isSupported()) return;
          const hls = new HlsLib();
          hls.loadSource(stream.uri);
          hls.attachMedia(audio);
          hlsRef.current = hls;
        }
        loadedUrlRef.current = stream.uri;
      }

      try {
        await audio.play();
      } catch (e) {
        // AbortError specifically means this play() was interrupted by a
        // pause() from a later effect run (enabled/radio-ducking toggled
        // again before the browser finished starting playback) — benign,
        // the later call already reflects the current desired state.
        // Anything else is logged rather than swallowed: a silent failure
        // here would look identical to "no commentary available"
        // (autoplay-blocked included).
        if (e && typeof e === "object" && "name" in e && e.name === "AbortError") return;
        console.error(`Commentary playback failed for ${stream.uri}:`, e);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [stream?.uri, enabled, radioPlayingUrl]);

  // Stop commentary when leaving the live dashboard entirely — the audio/
  // hls.js instances are tied to this component's lifetime, not the
  // (app-wide, never-disconnected) live store.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      hlsRef.current?.destroy();
    };
  }, []);

  if (!stream) return null;

  const color = enabled ? "var(--color-sector-green)" : "var(--color-text-muted)";
  return (
    <button
      onClick={() => setEnabled((e) => !e)}
      className="rounded-full px-3 py-1 text-[10px] font-black tracking-wide transition-colors"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
      title={enabled ? "Mute commentary" : "Unmute commentary"}
    >
      COMMENTARY
    </button>
  );
}
