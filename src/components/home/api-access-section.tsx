import type { ArchiveTotals } from "@/components/home/archive-section";

/**
 * The developer-access pitch: paid REST + WebSocket plans, sold separately
 * from the consumer app.
 *
 * Gated by `NEXT_PUBLIC_API_ACCESS_HIDDEN` (see page.tsx) — the section is
 * built and visible by default so it can be reviewed, and hiding it before
 * the consumer launch is a one-line env change rather than a code change.
 *
 * The endpoint list and the coverage figures are the real surface: those
 * table names are the ones the API actually exposes, and the counts are the
 * same live `count=exact` numbers the archive section reads.
 */
const REST_ENDPOINTS = [
  { path: "/races", note: "Every round since 1950" },
  { path: "/race_results", note: "Full classifications" },
  { path: "/qualifying_results", note: "Q1/Q2/Q3 splits" },
  { path: "/driver_standings", note: "Championship by round" },
  { path: "/pit_stops", note: "Stop-by-stop timings" },
  { path: "/circuits", note: "Track reference data" },
] as const;

const WS_CHANNELS = [
  { name: "timing", note: "Positions, gaps, sectors, tyres" },
  { name: "telemetry", note: "Speed, throttle, brake, gear, DRS" },
  { name: "racecontrol", note: "Flags, penalties, investigations" },
  { name: "position", note: "Live car coordinates" },
] as const;

export function ApiAccessSection({
  enrollmentUrl,
  totals,
}: {
  enrollmentUrl?: string;
  totals: ArchiveTotals;
}) {
  return (
    <section
      id="api-access"
      className="relative overflow-hidden border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_15%_40%,rgba(41,121,255,0.13),transparent_70%)]" />

      <div className="relative mx-auto max-w-[84rem]">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/10 px-3 py-1.5 text-[9px] font-bold tracking-[0.22em] text-[#6ca2ff] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2979ff]" />
              Developer access
            </span>

            <h2 className="mt-6 font-[var(--font-f1)] text-[clamp(2.5rem,5vw,4.8rem)] leading-[0.92] font-bold tracking-[-0.055em] italic">
              BUILD ON
              <br />
              THE GRID.
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-7 text-white/48">
              The same data GridBeat runs on, available as a paid REST and WebSocket product for approved apps,
              creators and research projects. Independent of the consumer app, with its own plans and limits.
            </p>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/[0.08] pt-7">
              {[
                { label: "Races", value: totals.races },
                { label: "Results", value: totals.results },
                { label: "Seasons", value: 77 },
              ].map((item) => (
                <div key={item.label}>
                  <dd className="font-[var(--font-f1)] text-2xl leading-none font-bold tabular-nums">
                    {item.value?.toLocaleString() ?? "—"}
                  </dd>
                  <dt className="mt-2 text-[10px] tracking-[0.16em] text-white/34 uppercase">{item.label}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-9">
              {enrollmentUrl ? (
                <a
                  href={enrollmentUrl}
                  className="inline-flex min-h-12 items-center rounded-full bg-[#2979ff] px-7 text-xs font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  Request API access
                </a>
              ) : (
                <span className="inline-flex min-h-12 items-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-xs font-bold text-white/45">
                  Enrollment opens after launch
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[1.5rem] border border-white/10 bg-[#0c0c0c] p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.16em] text-[#6ca2ff]">REST · JSON</span>
                <span className="text-[9px] tracking-[0.14em] text-white/26 uppercase">Historical</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {REST_ENDPOINTS.map((endpoint) => (
                  <li key={endpoint.path} className="flex items-baseline justify-between gap-3">
                    <code className="font-mono text-[11px] text-white/78">{endpoint.path}</code>
                    <span className="truncate text-right text-[10px] text-white/32">{endpoint.note}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.5rem] border border-white/10 bg-[#0c0c0c] p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.16em] text-[#00c853]">WSS · STREAM</span>
                <span className="text-[9px] tracking-[0.14em] text-white/26 uppercase">Live session</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {WS_CHANNELS.map((channel) => (
                  <li key={channel.name} className="flex items-baseline justify-between gap-3">
                    <code className="font-mono text-[11px] text-white/78">{channel.name}</code>
                    <span className="truncate text-right text-[10px] text-white/32">{channel.note}</span>
                  </li>
                ))}
              </ul>
            </article>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.022] p-6 sm:col-span-2">
              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { label: "Access", value: "Approved accounts" },
                  { label: "Model", value: "Paid plans" },
                  { label: "Availability", value: "After v1" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-[9px] tracking-[0.2em] text-white/28 uppercase">{item.label}</div>
                    <div className="mt-2 text-sm font-bold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
