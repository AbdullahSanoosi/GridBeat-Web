/**
 * Ported from GridBeat (Flutter) lib/features/live_timing/presentation/live_timing_screen.dart's
 * `_playingUrlProvider` — shared UI state (not WS-driven, so deliberately
 * kept out of the main live-timing store) so the commentary player can duck
 * (auto-pause) itself while a team radio clip is playing, and resume once
 * it ends.
 */
import { create } from "zustand";

interface RadioPlaybackState {
  playingUrl: string | null;
  setPlayingUrl: (url: string | null) => void;
}

export const useRadioPlaybackStore = create<RadioPlaybackState>((set) => ({
  playingUrl: null,
  setPlayingUrl: (url) => set({ playingUrl: url }),
}));
