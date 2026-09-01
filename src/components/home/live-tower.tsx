"use client";

import { useEffect, useReducer } from "react";
import { motion, useReducedMotion } from "motion/react";
import { teamColor } from "@/lib/theme/colors";
import { useLiveTimingStore } from "@/lib/live/store";
import { activeSortedLeaderboard, formattedLapTime, teamColorHex } from "@/lib/models/live";

/**
 * A full grid timing tower that actually races — used as the hero's
 * background wall, not a card. Sector bars fill as the field completes
 * each sector, lap times land, and when a gap closes the two rows swap:
 * Motion's `layout` prop turns a reorder of the array into the same slide
 * the real Tower does on a live overtake.
 *
 * The session is simulated (a marketing page can't depend on a live one
 * existing) but every rule it follows is real: purple = overall fastest,
 * green = personal best, yellow = a completed sector, and P1 reads LEAD.
 */

interface Row {
  code: string;
  team: string;
  interval: number;
  lap: number | null;
  sectors: [number, number, number];
}

// Deterministic starting grid — identical on server and client so the first
// paint can't hydration-mismatch (CLAUDE.md gotcha #4). Motion starts only
// after mount.
const INITIAL: Row[] = [
  ["NOR", "McLaren", 0, 75.265], ["VER", "Red Bull Racing", 0.412, 75.331],
  ["PIA", "McLaren", 1.077, 75.44], ["LEC", "Ferrari", 0.836, 75.612],
  ["RUS", "Mercedes", 2.104, 75.708], ["HAM", "Ferrari", 0.55, 75.889],
  ["ANT", "Mercedes", 1.632, 76.004], ["ALO", "Aston Martin", 0.918, 76.271],
  ["GAS", "Alpine", 1.244, 76.33], ["ALB", "Williams", 0.677, 76.41],
  ["TSU", "Racing Bulls", 1.401, 76.52], ["HUL", "Audi", 0.833, 76.61],
  ["STR", "Aston Martin", 1.919, 76.74], ["SAI", "Williams", 0.742, 76.83],
  ["LIN", "Racing Bulls", 1.108, 76.95], ["BOR", "Audi", 0.966, 77.04],
  ["OCO", "Haas F1 Team", 1.523, 77.18], ["BEA", "Haas F1 Team", 0.804, 77.26],
  ["PER", "Cadillac", 1.337, 77.39], ["BOT", "Cadillac", 0.911, 77.5],
].map(([code, team, interval, lap]) => ({
  code: code as string,
  team: team as string,
  interval: interval as number,
  lap: lap as number,
  sectors: [0, 0, 0] as [number, number, number],
}));

const SECTOR_COLOR = [
  "color-mix(in srgb, var(--color-secondary) 40%, transparent)",
  "var(--color-sector-yellow)",
  "var(--color-sector-green)",
  "var(--color-sector-purple)",
];

/** Stable hash PRNG — a given tick is reproducible, no Math.random. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function reducer(rows: Row[], action: { n: number }): Row[] {
  const n = action.n;
  const next = rows.map((r) => ({ ...r, sectors: [...r.sectors] as [number, number, number] }));
  const phase = n % 4;

  if (phase === 3) {
    // Lap complete. Pace is modelled, not random: the front of the field is
    // genuinely quicker, so lap time rises with position and only jitters a
    // few tenths. One car per lap gets a clear purple run, which can come
    // from anywhere in the order the way a fresh-tyre stint does.
    const fastest = Math.floor(rnd(n) * next.length);
    next.forEach((r, i) => {
      const base = 75.0 + i * 0.1;
      const jitter = (rnd(n * 31 + i) - 0.5) * 0.32;
      r.lap = i === fastest ? 74.86 + rnd(n * 7 + i) * 0.14 : base + jitter;
      r.sectors = [0, 0, 0];
    });

    // At most one overtake per lap — the closest pair swaps.
    let tight = 1;
    let tightGap = Infinity;
    for (let i = 1; i < next.length; i++) {
      if (next[i].interval < tightGap) {
        tightGap = next[i].interval;
        tight = i;
      }
    }
    if (tightGap < 0.8 && rnd(n * 13) > 0.3) {
      [next[tight - 1], next[tight]] = [next[tight], next[tight - 1]];
      next[tight].interval = 0.2 + rnd(n * 17) * 0.5;
    }
    next.forEach((r, i) => {
      r.interval = i === 0 ? 0 : Math.max(0.08, r.interval + (rnd(n * 41 + i) - 0.5) * 0.45);
    });
    return next;
  }

  const overall = Math.floor(rnd(n * 3) * next.length);
  next.forEach((r, i) => {
    const roll = rnd(n * 53 + i);
    r.sectors[phase] = i === overall && roll > 0.5 ? 3 : roll > 0.6 ? 2 : 1;
  });
  return next;
}

/** One render path for both sources, so live and simulated look identical. */
interface DisplayRow {
  key: string;
  code: string;
  teamHex: string;
  lap: number | null;
  gap: string;
  sectors: number[];
}

export function TowerWall() {
  const [sim, dispatch] = useReducer(reducer, INITIAL);
  const reduced = useReducedMotion();

  // Real session, when one is on the wire. The store is a singleton shared
  // with /live, so this is the same feed the dashboard renders.
  const leaderboard = useLiveTimingStore((s) => s.leaderboard);
  const telemetry = useLiveTimingStore((s) => s.telemetry);
  const live = activeSortedLeaderboard({ leaderboard, telemetry });
  const isLive = live.length > 0;

  useEffect(() => {
    // Don't burn a timer simulating a session that's actually happening.
    if (reduced || isLive) return;
    let n = 0;
    const id = setInterval(() => dispatch({ n: ++n }), 1500);
    return () => clearInterval(id);
  }, [reduced, isLive]);

  const rows: DisplayRow[] = isLive
    ? live.slice(0, 20).map((e) => ({
        key: String(e.driverNumber),
        code: e.shortName || e.name.slice(0, 3).toUpperCase(),
        teamHex: teamColorHex(e.teamColor),
        lap: e.lastLapTime,
        gap: e.position === 1 ? "LEAD" : e.gapToLeader || "—",
        sectors: e.sectorStatus,
      }))
    : sim.map((r, i) => ({
        key: r.code,
        code: r.code,
        teamHex: teamColor(r.team),
        lap: r.lap,
        gap: i === 0 ? "LEAD" : `+${r.interval.toFixed(3)}`,
        sectors: r.sectors,
      }));

  return (
    <div className="h-full w-full select-none" aria-hidden="true">
      {rows.map((r, i) => (
        <motion.div
          key={r.key}
          layout={!reduced}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className="grid h-[5vh] min-h-[26px] grid-cols-[1.6rem_2px_2.9rem_1fr_auto] items-center gap-2 border-b border-white/[0.05] px-3 sm:grid-cols-[2rem_3px_3.4rem_1fr_5.5rem_4.6rem] sm:gap-3 sm:px-6"
        >
          <span className="text-center font-[var(--font-f1)] text-[11px] font-bold tabular-nums text-white/45 sm:text-sm">
            {i + 1}
          </span>
          <span className="h-3.5 w-full rounded-full sm:h-5" style={{ backgroundColor: r.teamHex }} />
          <span className="font-[var(--font-f1)] text-xs font-bold text-white/90 sm:text-base">{r.code}</span>
          <span className="flex items-center gap-1 sm:gap-1.5">
            {[0, 1, 2].map((si) => (
              <motion.span
                key={si}
                className="h-[3px] flex-1 rounded-full sm:h-1.5"
                animate={{ backgroundColor: SECTOR_COLOR[r.sectors[si] ?? 0] }}
                transition={{ duration: 0.25 }}
              />
            ))}
          </span>
          <span className="hidden font-[var(--font-f1)] text-xs tabular-nums text-white/55 sm:inline">
            {formattedLapTime(r.lap)}
          </span>
          <span
            className="text-right font-[var(--font-f1)] text-[11px] font-bold tabular-nums sm:text-sm"
            style={{ color: i === 0 ? "var(--color-sector-green)" : "rgb(255 255 255 / 0.7)" }}
          >
            {r.gap}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
