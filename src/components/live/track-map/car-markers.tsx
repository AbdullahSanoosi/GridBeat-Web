"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, Trail } from "@react-three/drei";
import { useLiveTimingStore } from "@/lib/live/store";
import { drsActive, teamColorHex, type TrackPoint } from "@/lib/models/live";
import { usePlayheadPositions } from "./use-playhead-positions";

const CAR_RADIUS = 0.5;
const CAR_HEIGHT = 0.35;
/** Matches colors.ts's `info` token — reused here rather than inventing a new accent color. */
const DRS_COLOR = "#2979FF";
const FOLLOW_LERP = 0.08;

/** Only what CarMarkers actually reads off the OrbitControls ref — avoids importing drei's type here. */
interface OrbitControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

interface CarMarkersProps {
  toWorld: (p: TrackPoint) => THREE.Vector3;
  controlsRef: RefObject<OrbitControlsLike | null>;
  followedDriver: string | null;
  onSelectDriver: (key: string | null) => void;
}

/** Driver roster, updated only when the actual set of keys changes (not on every leaderboard tick). */
function useDriverKeys(): string[] {
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    function sync() {
      const state = useLiveTimingStore.getState();
      const next = Array.from(new Set([...Object.keys(state.leaderboard), ...Object.keys(state.carPositions)])).sort();
      setKeys((prev) => (prev.length === next.length && prev.every((k, i) => k === next[i]) ? prev : next));
    }
    sync();
    return useLiveTimingStore.subscribe(sync);
  }, []);
  return keys;
}

export function CarMarkers({ toWorld, controlsRef, followedDriver, onSelectDriver }: CarMarkersProps) {
  const driverKeys = useDriverKeys();
  const step = usePlayheadPositions();
  const groupRefs = useRef(new Map<string, THREE.Group>());

  useFrame(() => {
    const positions = step(performance.now());
    for (const [key, group] of groupRefs.current) {
      const point = positions[key];
      if (!point) {
        group.visible = false;
        continue;
      }
      const world = toWorld(point);
      group.position.set(world.x, 0, world.z);
      group.visible = true;
    }

    if (followedDriver && controlsRef.current) {
      const followedGroup = groupRefs.current.get(followedDriver);
      if (followedGroup?.visible) {
        controlsRef.current.target.lerp(followedGroup.position, FOLLOW_LERP);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      {driverKeys.map((key) => (
        <CarMarker
          key={key}
          driverKey={key}
          groupRefs={groupRefs}
          isFollowed={followedDriver === key}
          onSelect={() => onSelectDriver(followedDriver === key ? null : key)}
        />
      ))}
    </>
  );
}

function CarMarker({
  driverKey,
  groupRefs,
  isFollowed,
  onSelect,
}: {
  driverKey: string;
  groupRefs: RefObject<Map<string, THREE.Group>>;
  isFollowed: boolean;
  onSelect: () => void;
}) {
  const entry = useLiveTimingStore((s) => s.leaderboard[driverKey]);
  const telemetry = useLiveTimingStore((s) => s.telemetry[Number(driverKey)]);
  const drsOn = telemetry ? drsActive(telemetry.drs) : false;
  const teamColor = entry ? teamColorHex(entry.teamColor) : "#FFFFFF";
  const label = entry?.shortName || driverKey;
  const posNum = entry?.position != null ? String(entry.position) : "";
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group
      visible={false}
      ref={(g) => {
        groupRef.current = g;
        if (g) groupRefs.current.set(driverKey, g);
        else groupRefs.current.delete(driverKey);
      }}
    >
      {/* Trail samples groupRef's world position every frame via R3F's own
          render loop — safe alongside the imperative position updates
          above since it's a plain THREE.Object3D read, not React state. */}
      <Trail
        target={groupRef as RefObject<THREE.Object3D>}
        width={CAR_RADIUS * 2.2}
        length={4}
        decay={2}
        attenuation={(t) => t * t}
        color={teamColor}
      >
        <></>
      </Trail>
      <mesh
        position={[0, CAR_HEIGHT / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[CAR_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={teamColor}
          emissive={drsOn ? DRS_COLOR : teamColor}
          emissiveIntensity={drsOn ? 1.6 : 0.7}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[CAR_RADIUS * 1.6, 24]} />
        <meshBasicMaterial color="black" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* DRS-active ring — real per-driver telemetry (channel 45 >= 8), not a placeholder. */}
      <mesh visible={drsOn} position={[0, CAR_HEIGHT / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CAR_RADIUS * 1.3, CAR_RADIUS * 1.6, 24]} />
        <meshBasicMaterial color={DRS_COLOR} transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Selection ring for the followed car — separate from the DRS ring
          (different radius) so both can show at once without overlapping. */}
      <mesh visible={isFollowed} position={[0, CAR_HEIGHT / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CAR_RADIUS * 1.9, CAR_RADIUS * 2.1, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* DOM overlay instead of in-scene WebGL text — see the fix history:
          drei's <Text>/<Billboard> crashed the WebGL context outright. */}
      <Html position={[0, CAR_HEIGHT + 1, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center whitespace-nowrap" style={{ textShadow: "0 0 3px black, 0 0 3px black" }}>
          {posNum && (
            <span className="text-sm font-bold" style={{ color: teamColor }}>
              {posNum}
            </span>
          )}
          <span className="text-xs font-semibold text-white">{label}</span>
          {drsOn && (
            <span className="text-[9px] font-bold tracking-wide" style={{ color: DRS_COLOR }}>
              DRS
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
