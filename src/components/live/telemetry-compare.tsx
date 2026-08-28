"use client";

/**
 * Ported from GridBeat (Flutter)
 * lib/features/live_timing/presentation/widgets/telemetry_compare.dart.
 * Rendered as a 4th tab on the Live Timing page instead of a modal bottom
 * sheet — a sheet is a mobile pattern, and this is a desktop-first
 * dashboard where a tab is the natural equivalent. Recharts instead of
 * fl_chart; each `<Line>` gets its own `data` array (a driver's samples
 * have their own timestamps, not a shared X axis), which is why the charts
 * below don't pass a top-level `data` prop to `<LineChart>`.
 */
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formattedLapTime, teamColorHex, type LapRecord, type LeaderboardEntry, type TelemetrySample } from "@/lib/models/live";

interface MetricSpec {
  key: string;
  label: string;
  minY: number;
  maxY: number;
  interval: number;
  lineType: "monotone" | "linear" | "stepAfter";
  value: (s: TelemetrySample) => number;
}

const METRICS: MetricSpec[] = [
  { key: "speed", label: "SPEED (KM/H)", minY: 0, maxY: 360, interval: 90, lineType: "monotone", value: (s) => s.speed },
  { key: "throttle", label: "THROTTLE (%)", minY: 0, maxY: 100, interval: 50, lineType: "linear", value: (s) => s.throttle },
  { key: "brake", label: "BRAKE (%)", minY: 0, maxY: 100, interval: 50, lineType: "stepAfter", value: (s) => s.brake },
  { key: "gear", label: "GEAR", minY: 0, maxY: 8, interval: 2, lineType: "stepAfter", value: (s) => s.gear },
  { key: "rpm", label: "RPM", minY: 0, maxY: 14000, interval: 3500, lineType: "linear", value: (s) => s.rpm },
];

const MIN_AXIS_SECONDS = 20;
const AXIS_STEP = 10;

function rangeTicks(min: number, max: number, interval: number): number[] {
  const ticks: number[] = [];
  for (let v = min; v <= max + 0.001; v += interval) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export function TelemetryCompare({
  drivers,
  leaderboard,
  telemetryHistory,
  lapTimeHistory,
  currentLapSectors,
  selected,
  onToggle,
}: {
  drivers: LeaderboardEntry[];
  leaderboard: Record<string, LeaderboardEntry>;
  telemetryHistory: Record<number, TelemetrySample[]>;
  lapTimeHistory: Record<number, LapRecord[]>;
  currentLapSectors: Record<number, (number | null)[]>;
  selected: Set<number>;
  onToggle: (driverNumber: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DriverChipRow drivers={drivers} selected={selected} onToggle={onToggle} />

      {selected.size === 0 ? (
        <p className="py-8 text-center text-sm text-(--color-text-secondary)">
          Select a driver to see live telemetry
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel>
            <LapTimeChart selected={selected} leaderboard={leaderboard} history={lapTimeHistory} />
          </Panel>
          {METRICS.map((spec) => (
            <Panel key={spec.key}>
              <MetricPanel
                spec={spec}
                selected={selected}
                leaderboard={leaderboard}
                history={telemetryHistory}
                currentLapSectors={currentLapSectors}
              />
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">{children}</div>;
}

function DriverChipRow({
  drivers,
  selected,
  onToggle,
}: {
  drivers: LeaderboardEntry[];
  selected: Set<number>;
  onToggle: (driverNumber: number) => void;
}) {
  if (drivers.length === 0) {
    return <p className="text-sm text-(--color-text-muted)">Waiting for cars on track…</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {drivers.map((d) => {
        const isOn = selected.has(d.driverNumber);
        const color = teamColorHex(d.teamColor);
        return (
          <button
            key={d.driverNumber}
            onClick={() => onToggle(d.driverNumber)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold transition-colors"
            style={{
              borderColor: isOn ? color : "var(--color-border)",
              backgroundColor: isOn ? `color-mix(in srgb, ${color} 22%, transparent)` : "transparent",
              color: isOn ? "var(--color-text-primary)" : "var(--color-text-muted)",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {d.shortName || d.name}
          </button>
        );
      })}
    </div>
  );
}

function MetricPanel({
  spec,
  selected,
  leaderboard,
  history,
  currentLapSectors,
}: {
  spec: MetricSpec;
  selected: Set<number>;
  leaderboard: Record<string, LeaderboardEntry>;
  history: Record<number, TelemetrySample[]>;
  currentLapSectors: Record<number, (number | null)[]>;
}) {
  const { spotsByDriver, maxX, sectorBoundaries, lapLabel } = useMemo(() => {
    const laps: number[] = [];
    const spotsByDriver = new Map<number, { x: number; y: number }[]>();
    let maxElapsed = 0;

    for (const n of selected) {
      const samples = history[n];
      if (!samples || samples.length === 0) {
        spotsByDriver.set(n, []);
        continue;
      }
      const currentLap = samples[samples.length - 1].lapNumber;
      laps.push(currentLap);
      const lapSamples = samples.filter((s) => s.lapNumber === currentLap);
      const lapStart = lapSamples[0].time;
      const spots = lapSamples.map((s) => ({ x: (s.time - lapStart) / 1000, y: spec.value(s) }));
      if (spots.length > 0 && spots[spots.length - 1].x > maxElapsed) maxElapsed = spots[spots.length - 1].x;
      spotsByDriver.set(n, spots);
    }

    const maxX = maxElapsed <= MIN_AXIS_SECONDS ? MIN_AXIS_SECONDS : Math.ceil(maxElapsed / AXIS_STEP) * AXIS_STEP;

    let sectorSplits: (number | null)[] | undefined;
    for (const n of selected) {
      const s = currentLapSectors[n];
      if (!s) continue;
      const nonNull = s.filter((v) => v != null).length;
      if (!sectorSplits || nonNull > sectorSplits.filter((v) => v != null).length) sectorSplits = s;
    }
    const sectorBoundaries: number[] = [];
    if (sectorSplits?.[0] != null) {
      sectorBoundaries.push(sectorSplits[0]);
      if (sectorSplits[1] != null) sectorBoundaries.push(sectorSplits[0] + sectorSplits[1]);
    }

    const lapLabel =
      laps.length === 0 ? null : laps.length === 1 ? `LAP ${laps[0]}` : `LAP ${Math.min(...laps)}-${Math.max(...laps)}`;

    return { spotsByDriver, maxX, sectorBoundaries, lapLabel };
  }, [selected, history, currentLapSectors, spec]);

  const xTicks = rangeTicks(0, maxX, maxX / 4);
  const yTicks = rangeTicks(spec.minY, spec.maxY, spec.interval);
  const yPad = spec.interval * 0.22;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] font-extrabold tracking-wide text-(--color-text-muted)">{spec.label}</span>
        {lapLabel && <span className="text-[9px] font-semibold text-(--color-text-muted)/60">{lapLabel}</span>}
      </div>
      <div className="mt-3 h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, maxX]}
              ticks={xTicks}
              tickFormatter={(v: number) => (v === 0 ? "start" : `${v}s`)}
              tick={{ fill: "var(--color-text-muted)", fontSize: 8 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[spec.minY - yPad, spec.maxY + yPad]}
              ticks={yTicks}
              tick={{ fill: "var(--color-text-muted)", fontSize: 8 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            {sectorBoundaries.map((b, i) =>
              b <= maxX ? (
                <ReferenceLine
                  key={i}
                  x={b}
                  stroke="var(--color-text-muted)"
                  strokeOpacity={0.5}
                  label={{ value: i === 0 ? "S2" : "S3", position: "top", fill: "var(--color-text-muted)", fontSize: 8 }}
                />
              ) : null,
            )}
            {[...selected].map((n) => (
              <Line
                key={n}
                data={spotsByDriver.get(n) ?? []}
                dataKey="y"
                type={spec.lineType}
                stroke={teamColorHex(leaderboard[String(n)]?.teamColor ?? "888888")}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LapTimeChart({
  selected,
  leaderboard,
  history,
}: {
  selected: Set<number>;
  leaderboard: Record<string, LeaderboardEntry>;
  history: Record<number, LapRecord[]>;
}) {
  const orderedDrivers = [...selected];
  const { spotsByDriver, loLap, hiLap, loY, hiY, xTicks, yTicks } = useMemo(() => {
    const spotsByDriver = new Map<number, { x: number; y: number }[]>();
    let minLap: number | undefined, maxLap: number | undefined, minTime: number | undefined, maxTime: number | undefined;

    for (const n of orderedDrivers) {
      const records = history[n];
      if (!records || records.length === 0) {
        spotsByDriver.set(n, []);
        continue;
      }
      spotsByDriver.set(
        n,
        records.map((r) => ({ x: r.lapNumber, y: r.time })),
      );
      for (const r of records) {
        minLap = minLap == null || r.lapNumber < minLap ? r.lapNumber : minLap;
        maxLap = maxLap == null || r.lapNumber > maxLap ? r.lapNumber : maxLap;
        minTime = minTime == null || r.time < minTime ? r.time : minTime;
        maxTime = maxTime == null || r.time > maxTime ? r.time : maxTime;
      }
    }

    if (minLap == null || maxLap == null || minTime == null || maxTime == null) {
      return { spotsByDriver, loLap: null, hiLap: null, loY: null, hiY: null, xTicks: [], yTicks: [] };
    }

    const loLap = minLap;
    const hiLap = maxLap === minLap ? minLap + 1 : maxLap;
    const yInterval = Math.max((maxTime - minTime) / 3, 0.3);
    const loY = Math.floor(minTime / yInterval) * yInterval;
    const hiY = Math.ceil(maxTime / yInterval) * yInterval;
    const lapSpan = hiLap - loLap;
    const xInterval = lapSpan <= 6 ? 1 : Math.ceil(lapSpan / 6);

    return {
      spotsByDriver,
      loLap,
      hiLap,
      loY,
      hiY,
      xTicks: rangeTicks(loLap, hiLap, xInterval),
      yTicks: rangeTicks(loY, hiY, yInterval),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, history]);

  return (
    <div>
      <span className="text-[9px] font-extrabold tracking-wide text-(--color-text-muted)">LAP TIME</span>
      {loLap == null ? (
        <div className="flex h-[150px] items-center justify-center text-center text-[10px] text-(--color-text-muted)">
          Lap times appear once a lap completes
        </div>
      ) : (
        <div className="mt-3 h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                type="number"
                dataKey="x"
                domain={[loLap, hiLap]}
                ticks={xTicks}
                tickFormatter={(v: number) => `L${v}`}
                tick={{ fill: "var(--color-text-muted)", fontSize: 8 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                domain={[loY!, hiY!]}
                ticks={yTicks}
                tickFormatter={(v: number) => formattedLapTime(v)}
                tick={{ fill: "var(--color-text-muted)", fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                labelFormatter={(v) => `Lap ${v}`}
                formatter={(value, _name, item) => [
                  formattedLapTime(value as number),
                  leaderboard[String(item.dataKey === "y" ? item.payload?.driverNumber : "")]?.shortName ?? "",
                ]}
              />
              {orderedDrivers.map((n) => (
                <Line
                  key={n}
                  data={(spotsByDriver.get(n) ?? []).map((p) => ({ ...p, driverNumber: n }))}
                  dataKey="y"
                  name={leaderboard[String(n)]?.shortName ?? String(n)}
                  type="linear"
                  strokeDasharray="6 4"
                  stroke={teamColorHex(leaderboard[String(n)]?.teamColor ?? "888888")}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
