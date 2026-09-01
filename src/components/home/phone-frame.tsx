import type { ReactNode } from "react";

/**
 * A device frame that reads as an actual phone rather than a rounded box:
 * a brushed titanium rail (multi-stop gradient, so the edges catch light
 * the way a real chassis does), a black bezel inset, the screen, a Dynamic
 * Island, physical side buttons, and a diagonal glass reflection over the
 * top.
 *
 * Everything is sized in percentages off the frame width, so one component
 * is sharp at any size — a 96px thumbnail and a 260px hero render identical
 * proportions.
 *
 * `screenshotSrc` is the intended production path: drop in a real capture
 * and it fills the screen. Until one exists, `children` renders a CSS
 * recreation of the same screen.
 */
export function PhoneFrame({
  ariaLabel,
  screenshotSrc,
  glow,
  className = "",
  children,
}: {
  ariaLabel: string;
  screenshotSrc?: string;
  glow?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative ${className}`} role="img" aria-label={ariaLabel}>
      {/* Titanium rail */}
      <div
        className="relative aspect-[9/19.5] w-full rounded-[13%/6%] p-[2.4%]"
        style={{
          background:
            "linear-gradient(145deg, #6b6b70 0%, #2a2a2d 18%, #1a1a1c 38%, #55555a 52%, #202023 68%, #3d3d41 86%, #17171a 100%)",
          boxShadow: glow
            ? "0 30px 80px -18px color-mix(in srgb, var(--color-primary) 60%, transparent), 0 0 0 1px rgb(255 255 255 / 0.09), inset 0 1px 1px rgb(255 255 255 / 0.16)"
            : "0 26px 60px -20px rgb(0 0 0 / 0.95), 0 0 0 1px rgb(255 255 255 / 0.07), inset 0 1px 1px rgb(255 255 255 / 0.13)",
        }}
      >
        {/* Bezel */}
        <div className="relative h-full w-full overflow-hidden rounded-[11%/5%] bg-black p-[1.6%]">
          {/* Screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[10%/4.6%] bg-(--color-background)">
            {screenshotSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- marketing mockup, not a Next-optimized content image
              <img src={screenshotSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              children
            )}

            {/* Dynamic Island */}
            <div
              className="absolute left-1/2 top-[1.6%] z-20 h-[3.1%] w-[30%] -translate-x-1/2 rounded-full bg-black"
              style={{ boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.06)" }}
            >
              <span className="absolute right-[14%] top-1/2 h-[38%] w-[12%] -translate-y-1/2 rounded-full bg-[#0b1416]" />
            </div>

            {/* Glass reflection */}
            <div
              className="pointer-events-none absolute inset-0 z-30"
              style={{
                background:
                  "linear-gradient(118deg, rgb(255 255 255 / 0.11) 0%, rgb(255 255 255 / 0.045) 16%, transparent 34%, transparent 72%, rgb(255 255 255 / 0.03) 100%)",
              }}
            />
            {/* Home indicator */}
            <div className="pointer-events-none absolute bottom-[1.1%] left-1/2 z-30 h-[0.45%] w-[32%] -translate-x-1/2 rounded-full bg-white/45" />
          </div>
        </div>
      </div>

      {/* Physical buttons */}
      <span className="absolute left-[-1.1%] top-[17%] h-[4.2%] w-[1.5%] rounded-l-sm bg-gradient-to-r from-[#57575c] to-[#25252a]" />
      <span className="absolute left-[-1.3%] top-[24.5%] h-[7.4%] w-[1.7%] rounded-l-sm bg-gradient-to-r from-[#5c5c61] to-[#27272c]" />
      <span className="absolute left-[-1.3%] top-[34%] h-[7.4%] w-[1.7%] rounded-l-sm bg-gradient-to-r from-[#5c5c61] to-[#27272c]" />
      <span className="absolute right-[-1.3%] top-[27%] h-[11%] w-[1.7%] rounded-r-sm bg-gradient-to-l from-[#5c5c61] to-[#27272c]" />
    </div>
  );
}
