/**
 * Shared visual for the two one-shot live-timing event banners (fastest lap,
 * leader change) — ported from GridBeat (Flutter)'s _FastestLapCard /
 * _LeaderChangeCard, which are identical layouts differing only in accent
 * color and label text: [ colored arrow block, 2-line label ›››  CODE (team
 * colour)  value ]. The Flutter version paints the arrow block + fading
 * motion chevrons with a CustomPainter; here a repeating-gradient chevron
 * strip masked to fade out serves the same "motion trailing into the dark
 * banner" read without hand-placing SVG geometry.
 */
export function EventBanner({
  eventKey,
  accent,
  gradientFrom,
  gradientTo,
  label,
  code,
  teamColorHex,
  value,
}: {
  eventKey: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  label: [string, string];
  code: string;
  teamColorHex: string;
  value: string;
}) {
  return (
    <div
      key={eventKey}
      className="animate-event-banner-in relative mx-2.5 mt-2 h-16 overflow-hidden rounded-lg"
      style={{
        background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        boxShadow: `0 4px 16px 0 color-mix(in srgb, ${accent} 35%, transparent)`,
      }}
    >
      {/* Arrow block + fading motion chevrons */}
      <div
        className="absolute inset-y-0 left-0 w-28 sm:w-44"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 55%, transparent) 65%, transparent)`,
          maskImage:
            "repeating-linear-gradient(115deg, black 0 26px, transparent 26px 34px), linear-gradient(90deg, black 55%, transparent)",
          maskComposite: "intersect",
          WebkitMaskImage:
            "repeating-linear-gradient(115deg, black 0 26px, transparent 26px 34px), linear-gradient(90deg, black 55%, transparent)",
          WebkitMaskComposite: "source-in",
        }}
      />
      {/* Label over the arrow block */}
      <div className="absolute inset-y-0 left-2.5 flex flex-col justify-center font-[var(--font-f1)] text-[11px] leading-[1.05] font-bold italic text-white sm:left-3.5 sm:text-[13px]">
        <span>{label[0]}</span>
        <span>{label[1]}</span>
      </div>
      {/* Driver code (team color) + value */}
      <div className="absolute inset-y-0 left-28 right-3 flex items-center gap-2 sm:left-44 sm:right-4 sm:gap-3">
        <span
          className="min-w-0 flex-1 truncate font-[var(--font-f1)] text-xl font-bold italic tracking-[0.5px] sm:text-[26px]"
          style={{ color: teamColorHex, textShadow: "0 0 4px rgb(0 0 0 / 0.55)" }}
        >
          {code}
        </span>
        <span className="shrink-0 font-[var(--font-f1)] text-sm font-bold italic text-white sm:text-lg">{value}</span>
      </div>
      {/* Shimmer sheen sweep */}
      <div className="animate-shimmer-sweep pointer-events-none absolute inset-0" />
    </div>
  );
}
