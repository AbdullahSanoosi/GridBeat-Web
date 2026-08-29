"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import type { Corner } from "@/lib/api/multiviewer";
import type { TrackPoint } from "@/lib/models/live";
import { buildRibbonGeometry } from "./geometry";

const ROAD_WIDTH = 3.2;
const GLOW_WIDTH = 6.5;

interface TrackRibbonProps {
  points: TrackPoint[];
  corners: Corner[];
  marshalSectors: Corner[];
  toWorld: (p: TrackPoint) => THREE.Vector3;
}

export function TrackRibbon({ points, corners, marshalSectors, toWorld }: TrackRibbonProps) {
  const centerlineWorld = useMemo(() => points.map(toWorld), [points, toWorld]);
  const [geometries, setGeometries] = useState<{
    glow: THREE.BufferGeometry;
    road: THREE.BufferGeometry;
  } | null>(null);

  useEffect(() => {
    const glow = buildRibbonGeometry(centerlineWorld, GLOW_WIDTH, -0.03);
    const road = buildRibbonGeometry(centerlineWorld, ROAD_WIDTH, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGeometries({ glow, road });
    
    return () => {
      glow.dispose();
      road.dispose();
    };
  }, [centerlineWorld]);

  const centerlinePoints = useMemo(
    () => centerlineWorld.map((p) => new THREE.Vector3(p.x, 0.02, p.z)),
    [centerlineWorld],
  );

  if (!geometries) return null;

  return (
    <group>
      <mesh geometry={geometries.glow}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <mesh geometry={geometries.road}>
        <meshStandardMaterial color="#2E3133" roughness={0.85} metalness={0.05} />
      </mesh>
      <Line points={centerlinePoints} color="#ffffff" transparent opacity={0.22} lineWidth={1.2} />
      {corners.map((c) => {
        const p = toWorld(c);
        return (
          <group key={c.number} position={[p.x, 0.05, p.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.3, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} />
            </mesh>
            {/* DOM overlay, not in-scene WebGL text — see car-markers.tsx for why. */}
            <Html position={[0, 0.9, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface-elevated)/85 text-[10px] font-bold text-(--color-text-secondary)">
                {c.number}
              </span>
            </Html>
          </group>
        );
      })}
      {/* Real marshal-post boundaries from MultiViewer (not DRS zones —
          that field doesn't exist in this API, confirmed by inspecting a
          live response). Plain poles, no labels, so they read as a
          distinct "sector line" cue rather than competing with the
          numbered corner badges. */}
      {marshalSectors.map((m) => {
        const p = toWorld(m);
        return (
          <mesh key={`marshal-${m.number}`} position={[p.x, 0.6, p.z]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <meshBasicMaterial color="#FFD600" transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
