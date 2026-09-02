"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";

/**
 * A quiet "this is also an app" card at the foot of the dashboard sidebar.
 *
 * The screenshot it shows is matched to the section the visitor is actually
 * in — reading the news feed shows the app's news screen, sitting on Live
 * Timing shows its comms screen — so it reads as "the thing you're using has
 * a mobile version" rather than a generic house ad. Falls back to the home
 * screen anywhere without a specific match.
 *
 * Hidden entirely when the sidebar is collapsed to its icon rail, since
 * there's no room for it there and a cropped promo looks broken.
 */
const BY_SECTION: { prefix: string; src: string; line: string }[] = [
  { prefix: "/live", src: "/app/live-comms-screen.webp", line: "Race control and team radio, live on your phone." },
  { prefix: "/news", src: "/app/news-screen.webp", line: "The paddock feed, in your pocket." },
  { prefix: "/learn", src: "/app/learn-f1.webp", line: "Learn F1 with 3D cars, tyres and aero." },
  { prefix: "/stewards-room", src: "/app/stewards-room-tyres.webp", line: "FIA documents, decoded on mobile." },
  { prefix: "/schedule", src: "/app/schedule-screen.webp", line: "Every session, with countdowns." },
  { prefix: "/circuits", src: "/app/learn-f1-tyre.webp", line: "Every circuit, every compound." },
];

const FALLBACK = { src: "/app/home-screen.webp", line: "The whole season, in your pocket." };

export function AppPromo() {
  const pathname = usePathname();
  const match = BY_SECTION.find((s) => pathname.startsWith(s.prefix)) ?? FALLBACK;

  return (
    <Link
      href="/#mobile"
      className="group mt-6 block overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-elevated) transition-colors hover:border-(--color-primary)"
    >
      <div className="relative h-28 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size decorative promo thumb */}
        <img
          src={match.src}
          alt=""
          className="w-full translate-y-[-6%] object-cover object-top opacity-85 transition-transform duration-500 group-hover:translate-y-[-10%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-(--color-surface-elevated) via-transparent to-transparent" />
      </div>
      <div className="px-3 pt-1 pb-3">
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-3 w-3 text-(--color-primary)" aria-hidden="true" />
          <span className="text-[9px] font-black tracking-[0.16em] text-(--color-primary) uppercase">
            GridBeat mobile
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-(--color-text-secondary)">{match.line}</p>
        <span className="mt-2 inline-block text-[10px] font-bold text-(--color-text-muted) group-hover:text-(--color-text-primary)">
          See the app &rarr;
        </span>
      </div>
    </Link>
  );
}
