import Image from "next/image";

/**
 * The brand lockup, in one place so the header, footer and CTA can't drift
 * apart again.
 *
 * The source PNG is a red neon helmet on a 3:2 black canvas with the glow
 * bleeding to the edges. It was previously dropped into a small rounded box
 * with `object-cover` and `scale-[1.32]`, which cropped the mark off-centre
 * and boxed the glow in a visible border. Two things fix it: `object-contain`
 * on a 3:2 frame so the whole mark is shown at its own aspect ratio, and
 * `mix-blend-screen`, which drops the baked-in black into the page's own
 * black instead of stacking two different blacks behind a border.
 */
export function BrandMark({
  className = "",
  height = 40,
  withWordmark = true,
  wordmarkClass = "text-lg sm:text-xl",
}: {
  className?: string;
  height?: number;
  withWordmark?: boolean;
  wordmarkClass?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/logo-transparent.png"
        alt="GridBeat"
        width={Math.round(height * 1.5)}
        height={height}
        priority
        className="mix-blend-screen object-contain"
        style={{ height, width: "auto" }}
      />
      {withWordmark && (
        <span
          className={`font-[var(--font-f1)] leading-none font-bold tracking-[-0.04em] text-white italic ${wordmarkClass}`}
        >
          GRIDBEAT
        </span>
      )}
    </span>
  );
}
