import Link from "next/link";

/**
 * The secondary CTA: the web dashboard, positioned as the second screen
 * rather than the main event — the app is what this page is selling.
 *
 * Each surface links to the route it names, and the colours are the ones
 * those pages actually use, so the panel reads as a preview of the product
 * rather than a generic feature grid.
 */
const SURFACES = [
  { href: "/live", label: "Live timing", detail: "Tower, telemetry, 3D map", color: "#df3409" },
  { href: "/schedule", label: "Race calendar", detail: "Every session, every round", color: "#2979ff" },
  { href: "/standings", label: "Championship", detail: "Drivers and constructors", color: "#bf00ff" },
  { href: "/stewards-room", label: "Stewards' Room", detail: "FIA documents, decoded", color: "#ffd600" },
] as const;

export function DashboardPromo({ dashboardBase }: { dashboardBase: string }) {
  return (
    <section id="dashboard" className="border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-[84rem] items-center gap-12 lg:grid-cols-[0.72fr_1fr] lg:gap-16">
        <div>
          <p className="text-[10px] font-bold tracking-[0.28em] text-[#2979ff] uppercase">Also on the big screen</p>

          <h2 className="mt-4 font-[var(--font-f1)] text-[clamp(2.6rem,5vw,4.9rem)] leading-[0.92] font-bold tracking-[-0.055em] italic">
            WHEN A PHONE
            <br />
            ISN&rsquo;T ENOUGH.
          </h2>

          <p className="mt-6 max-w-lg text-sm leading-7 text-white/48">
            The web dashboard is the second screen: more room for the timing tower, telemetry comparisons, the 3D
            map and the full season archive. Free, no account needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`${dashboardBase}/live`}
              className="inline-flex min-h-12 items-center rounded-full bg-white px-7 text-xs font-bold text-black transition-transform hover:-translate-y-0.5"
            >
              Enter live dashboard
            </Link>
            <Link
              href={`${dashboardBase}/schedule`}
              className="inline-flex min-h-12 items-center rounded-full border border-white/14 px-7 text-xs font-bold text-white transition-colors hover:border-white/35"
            >
              Browse the season
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0c0c0c] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
            <span className="h-2 w-2 rounded-full bg-[#df3409]" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="ml-3 font-mono text-[9px] tracking-[0.18em] text-white/26">
              dashboard.gridbeat.app
            </span>
          </div>

          <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2">
            {SURFACES.map((surface) => (
              <Link
                key={surface.href}
                href={`${dashboardBase}${surface.href}`}
                className="group flex min-h-44 flex-col justify-between bg-[#101010] p-6 transition-colors hover:bg-[#161616]"
              >
                <span
                  className="block h-1.5 w-12 rounded-full transition-[width] duration-300 group-hover:w-20"
                  style={{ backgroundColor: surface.color }}
                />
                <span>
                  <span className="block text-[9px] tracking-[0.2em] text-white/28 uppercase">{surface.detail}</span>
                  <span className="mt-2 flex items-center justify-between text-sm font-bold text-white">
                    {surface.label}
                    <span className="text-white/25 transition-transform group-hover:translate-x-1">&rarr;</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
