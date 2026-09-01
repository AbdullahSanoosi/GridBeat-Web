import type { WeatherData } from "@/lib/models/live";

function tempColor(temp: number): string {
  if (temp < 15) return "var(--color-info)";
  if (temp < 30) return "var(--color-sector-green)";
  if (temp < 45) return "var(--color-warning)";
  return "var(--color-error)";
}

/**
 * `isLive` false means `weather` is the last reading from a session that's
 * since ended (the store never clears `weather` on session-change/reset —
 * it just stops receiving new WeatherData ticks), not this instant's
 * conditions — ported from GridBeat (Flutter)'s WeatherPanel.isLive.
 */
export function WeatherPanel({ weather, isLive = true }: { weather: WeatherData; isLive?: boolean }) {
  const hasData = weather.airTemp !== 0 || weather.trackTemp !== 0 || weather.humidity !== 0 || weather.pressure !== 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) px-6 py-3 text-center text-xs text-(--color-text-muted)">
        WEATHER DATA NOT AVAILABLE YET
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-(--color-border) bg-(--color-surface) px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3" style={{ opacity: isLive ? 1 : 0.75 }}>
        <WeatherItem label="AIR" value={`${weather.airTemp.toFixed(1)}°C`} color={tempColor(weather.airTemp)} />
        <WeatherItem label="TRACK" value={`${weather.trackTemp.toFixed(1)}°C`} color={tempColor(weather.trackTemp)} />
        <WeatherItem label="HUMIDITY" value={`${weather.humidity.toFixed(0)}%`} />
        <WeatherItem label="WIND" value={`${weather.windSpeed.toFixed(1)} m/s`} />
        <WeatherItem
          label="RAIN"
          value={weather.rainfall ? "YES" : "NO"}
          color={weather.rainfall ? "var(--color-info)" : "var(--color-sector-green)"}
        />
      </div>
      {!isLive && (
        <span className="absolute right-1 top-1 rounded border border-(--color-text-secondary)/30 bg-(--color-surface-elevated) px-1.5 py-0.5 text-[7px] font-extrabold tracking-wide text-(--color-text-secondary)">
          LAST SESSION
        </span>
      )}
    </div>
  );
}

function WeatherItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-extrabold" style={{ color: color ?? "var(--color-text-primary)" }}>
        {value}
      </span>
      <span className="text-[9px] font-medium tracking-wide text-(--color-text-muted)">{label}</span>
    </div>
  );
}
