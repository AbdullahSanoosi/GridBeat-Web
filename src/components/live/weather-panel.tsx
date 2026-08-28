import type { WeatherData } from "@/lib/models/live";

function tempColor(temp: number): string {
  if (temp < 15) return "var(--color-info)";
  if (temp < 30) return "var(--color-sector-green)";
  if (temp < 45) return "var(--color-warning)";
  return "var(--color-error)";
}

export function WeatherPanel({ weather }: { weather: WeatherData }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-(--color-border) bg-(--color-surface) px-6 py-3">
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
