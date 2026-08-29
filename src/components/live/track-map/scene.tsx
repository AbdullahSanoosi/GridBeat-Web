"use client";

import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useLiveTimingStore } from "@/lib/live/store";
import type { TrackData } from "@/lib/api/multiviewer";
import type { TrackPoint } from "@/lib/models/live";
import { TrackRibbon } from "./track-ribbon";
import { CarMarkers } from "./car-markers";
import { capPointCount, createWorldMapper, sortRadially, WORLD_SIZE } from "./geometry";

interface TrackMapSceneProps {
  trackData: TrackData | null;
  resetSignal: number;
  followedDriver: string | null;
  onSelectDriver: (key: string | null) => void;
}

const CAMERA_POSITION: [number, number, number] = [0, WORLD_SIZE * 0.55, WORLD_SIZE * 0.8];

function computeFallbackPoints(): TrackPoint[] {
  const s = useLiveTimingStore.getState();
  if (s.trackDots.length) return capPointCount(sortRadially(s.trackDots));
  return capPointCount(sortRadially(Object.values(s.carPositions)));
}

export default function TrackMapScene({ trackData, resetSignal, followedDriver, onSelectDriver }: TrackMapSceneProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  // store.ts replaces both `trackDots` and `carPositions` with a brand-new
  // array/object on every drained WS position batch — roughly every
  // ~100ms, for the entire session, not just briefly at startup. Selecting
  // either reactively here was rebuilding this ribbon's BufferGeometry
  // (expensive: CatmullRom sampling + normal computation) ~10x/sec
  // indefinitely, which crashed the WebGL context outright. Only used
  // pre-MultiViewer-data anyway, so a slow poll is plenty — this updates
  // at most once every 2s, and only while trackData is still missing.
  const [fallbackPoints, setFallbackPoints] = useState<TrackPoint[]>(computeFallbackPoints);

  useEffect(() => {
    if (trackData) return;
    const id = setInterval(() => {
      const next = computeFallbackPoints();
      setFallbackPoints((prev) => (next.length === prev.length ? prev : next));
    }, 2000);
    return () => clearInterval(id);
  }, [trackData]);

  const sourcePoints: TrackPoint[] = trackData?.points.length ? trackData.points : fallbackPoints;

  const toWorld = useMemo(() => createWorldMapper(sourcePoints), [sourcePoints]);

  useEffect(() => {
    if (resetSignal > 0) {
      controlsRef.current?.reset();
      onSelectDriver(null);
    }
  }, [resetSignal, onSelectDriver]);

  if (sourcePoints.length === 0) return null;

  const rotationRad = ((trackData?.rotation ?? 0) * Math.PI) / 180;

  return (
    <Canvas camera={{ position: CAMERA_POSITION, fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0D0D0D"]} />
      <fog attach="fog" args={["#0D0D0D", WORLD_SIZE * 1.5, WORLD_SIZE * 4]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[WORLD_SIZE * 0.4, WORLD_SIZE * 0.8, WORLD_SIZE * 0.3]} intensity={0.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[WORLD_SIZE * 3, WORLD_SIZE * 3]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <group rotation={[0, rotationRad, 0]}>
        {trackData?.points.length ? (
          <TrackRibbon
            points={trackData.points}
            corners={trackData.corners ?? []}
            marshalSectors={trackData.marshalSectors ?? []}
            toWorld={toWorld}
          />
        ) : (
          <Line
            points={sourcePoints.map((p) => {
              const w = toWorld(p);
              return new THREE.Vector3(w.x, 0.02, w.z);
            })}
            color="#ffffff"
            transparent
            opacity={0.22}
            lineWidth={1.2}
          />
        )}
        <CarMarkers
          toWorld={toWorld}
          controlsRef={controlsRef}
          followedDriver={followedDriver}
          onSelectDriver={onSelectDriver}
        />
      </group>
      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        minDistance={WORLD_SIZE * 0.25}
        maxDistance={WORLD_SIZE * 2}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.02}
        enableDamping
      />
    </Canvas>
  );
}
