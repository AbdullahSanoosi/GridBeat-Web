"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useLiveTimingStore } from "@/lib/live/store";
import { fetchTrackData, type TrackData } from "@/lib/api/multiviewer";
import { sortedLeaderboard } from "@/lib/models/live";
import { MapLegend } from "@/components/live/track-map/legend";

/**
 * The 3D scene (three.js + @react-three/fiber + @react-three/drei) is a
 * meaningful chunk of bundle weight, so it's dynamically imported and only
 * ever loads once the user actually opens the Map tab — same discipline as
 * commentary-player.tsx's lazy `import("hls.js")`, just via next/dynamic
 * since this is a whole component subtree, not an imperative library call.
 */
const TrackMapScene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <MapMessage text="Loading 3D map…" />,
});

export function TrackMap({ height = 600 }: { height?: number }) {
  const sessionInfo = useLiveTimingStore((s) => s.sessionInfo);
  const trackDots = useLiveTimingStore((s) => s.trackDots);
  const carPositions = useLiveTimingStore((s) => s.carPositions);
  const leaderboard = useLiveTimingStore((s) => s.leaderboard);
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [followedDriver, setFollowedDriver] = useState<string | null>(null);
  const followedEntry = useLiveTimingStore((s) => (followedDriver ? s.leaderboard[followedDriver] : undefined));

  useEffect(() => {
    if (!sessionInfo) return;
    const key = `${sessionInfo.location}|${sessionInfo.country}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    setTrackData(null);
    fetchTrackData(sessionInfo).then(setTrackData);
  }, [sessionInfo]);

  const hasAnyPoints = Boolean(trackData?.points.length || trackDots.length || Object.keys(carPositions).length);

  return (
    <div
      className="relative w-full min-w-0 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)"
      style={{ height }}
    >
      {hasAnyPoints ? (
        <TrackMapScene
          trackData={trackData}
          resetSignal={resetSignal}
          followedDriver={followedDriver}
          onSelectDriver={setFollowedDriver}
        />
      ) : (
        <MapMessage text="Waiting for position data…" />
      )}
      {followedDriver && (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-elevated) py-1 pl-3 pr-1 text-xs">
          <span className="text-(--color-text-secondary)">Following</span>
          <span className="font-bold text-(--color-text-primary)">{followedEntry?.shortName || followedDriver}</span>
          <button
            onClick={() => setFollowedDriver(null)}
            className="flex h-5 w-5 items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-border)"
            title="Stop following"
          >
            ×
          </button>
        </div>
      )}
      <button
        onClick={() => {
          setResetSignal((n) => n + 1);
          setFollowedDriver(null);
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface-elevated) text-xs"
        title="Reset view"
      >
        ⌖
      </button>
      <MapLegend entries={sortedLeaderboard({ leaderboard })} />
    </div>
  );
}

function MapMessage({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-(--color-text-muted)">
      {text}
    </div>
  );
}
