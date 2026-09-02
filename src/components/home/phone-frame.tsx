import type { ReactNode } from "react";

/**
 * Device frames for the two platforms GridBeat ships on, drawn to each
 * one's real proportions rather than a single generic rounded box.
 *
 * What separates the two is what actually differs on the hardware:
 *
 *   iOS      — 9:19.5, a warm titanium rail, deeply rounded corners, the
 *              Dynamic Island cut out of the top of the display, the action
 *              button and volume pair on the left, power on the right, and
 *              the home indicator pill.
 *   Android  — 9:20 and a touch narrower in the corners, a cooler flat
 *              aluminium rail, a centred hole-punch camera rather than an
 *              island, both volume and power stacked on the right (Pixel's
 *              layout), and the three-pixel gesture bar.
 *
 * Everything is sized in percentages of frame width, so one component is
 * correct at a 96px thumbnail and a 320px hero alike. `screenshotSrc` takes
 * a real capture when one exists; `children` renders the in-app screen
 * recreation until then.
 */
export type PhonePlatform = "ios" | "android";

const RAIL: Record<PhonePlatform, string> = {
  // Warm, polished — titanium catches light in bands.
  ios: "linear-gradient(145deg, #7a7570 0%, #2e2b28 17%, #1b1a18 37%, #635d56 52%, #232120 68%, #45403b 86%, #171615 100%)",
  // Cooler and flatter — anodised aluminium, less specular banding.
  android: "linear-gradient(145deg, #63676d 0%, #26292e 20%, #191b1e 40%, #4d525a 54%, #1e2023 70%, #383c42 88%, #141618 100%)",
};

export function PhoneFrame({
  ariaLabel,
  platform = "ios",
  screenshotSrc,
  glow,
  className = "",
  children,
}: {
  ariaLabel: string;
  platform?: PhonePlatform;
  screenshotSrc?: string;
  glow?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const isIos = platform === "ios";

  return (
    <div className={`relative ${className}`} role="img" aria-label={ariaLabel}>
      <div
        className={`relative w-full p-[2.2%] ${
          isIos ? "aspect-[9/19.5] rounded-[14%/6.4%]" : "aspect-[9/20] rounded-[11.5%/5.2%]"
        }`}
        style={{
          background: RAIL[platform],
          boxShadow: glow
            ? "0 30px 80px -18px color-mix(in srgb, var(--color-primary) 60%, transparent), 0 0 0 1px rgb(255 255 255 / 0.09), inset 0 1px 1px rgb(255 255 255 / 0.16)"
            : "0 26px 60px -20px rgb(0 0 0 / 0.95), 0 0 0 1px rgb(255 255 255 / 0.07), inset 0 1px 1px rgb(255 255 255 / 0.13)",
        }}
      >
        {/* Bezel — Android carries a marginally thicker chin/forehead than iOS. */}
        <div
          className={`relative h-full w-full overflow-hidden bg-black ${
            isIos ? "rounded-[12.4%/5.6%] p-[1.5%]" : "rounded-[10.2%/4.6%] p-[1.9%]"
          }`}
        >
          <div
            className={`relative h-full w-full overflow-hidden bg-(--color-background) ${
              isIos ? "rounded-[11.2%/5%]" : "rounded-[9%/4%]"
            }`}
          >
            {screenshotSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- marketing mockup, not a Next-optimized content image
              <img src={screenshotSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              children
            )}

            {isIos ? (
              /* Dynamic Island — a pill floating below the top edge, with the
                 camera lens sitting inside its right end. */
              <div
                className="absolute top-[1.5%] left-1/2 z-20 h-[3%] w-[29%] -translate-x-1/2 rounded-full bg-black"
                style={{ boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.07)" }}
              >
                <span className="absolute top-1/2 right-[13%] h-[40%] w-[11.5%] -translate-y-1/2 rounded-full bg-[#0b1416]" />
              </div>
            ) : (
              /* Hole-punch — a single centred lens cut into the display. */
              <div
                className="absolute top-[1.5%] left-1/2 z-20 h-[1.55%] w-[3.5%] -translate-x-1/2 rounded-full bg-black"
                style={{ boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.14)" }}
              >
                <span className="absolute inset-[22%] rounded-full bg-[#0a1114]" />
              </div>
            )}

            {/* Glass reflection */}
            <div
              className="pointer-events-none absolute inset-0 z-30"
              style={{
                background: isIos
                  ? "linear-gradient(118deg, rgb(255 255 255 / 0.11) 0%, rgb(255 255 255 / 0.045) 16%, transparent 34%, transparent 72%, rgb(255 255 255 / 0.03) 100%)"
                  : "linear-gradient(122deg, rgb(255 255 255 / 0.08) 0%, rgb(255 255 255 / 0.03) 14%, transparent 32%, transparent 74%, rgb(255 255 255 / 0.025) 100%)",
              }}
            />

            {/* Home indicator / gesture bar — Android's is shorter and thicker. */}
            <div
              className={`pointer-events-none absolute bottom-[1.1%] left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/45 ${
                isIos ? "h-[0.45%] w-[32%]" : "h-[0.5%] w-[24%]"
              }`}
            />
          </div>
        </div>
      </div>

      {isIos ? (
        <>
          {/* Action button, then the volume pair — left side. Power — right. */}
          <span className="absolute top-[15.5%] left-[-1.1%] h-[3.6%] w-[1.5%] rounded-l-sm bg-gradient-to-r from-[#6b655e] to-[#2a2724]" />
          <span className="absolute top-[23%] left-[-1.3%] h-[7.2%] w-[1.7%] rounded-l-sm bg-gradient-to-r from-[#6b655e] to-[#2a2724]" />
          <span className="absolute top-[32.5%] left-[-1.3%] h-[7.2%] w-[1.7%] rounded-l-sm bg-gradient-to-r from-[#6b655e] to-[#2a2724]" />
          <span className="absolute top-[26%] right-[-1.3%] h-[10.5%] w-[1.7%] rounded-r-sm bg-gradient-to-l from-[#6b655e] to-[#2a2724]" />
        </>
      ) : (
        <>
          {/* Pixel layout: power above volume, both on the right. */}
          <span className="absolute top-[19%] right-[-1.3%] h-[6%] w-[1.7%] rounded-r-sm bg-gradient-to-l from-[#5a5f66] to-[#212428]" />
          <span className="absolute top-[27.5%] right-[-1.3%] h-[10%] w-[1.7%] rounded-r-sm bg-gradient-to-l from-[#4e535a] to-[#1d2023]" />
        </>
      )}
    </div>
  );
}
