"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PhoneFrame } from "@/components/home/phone-frame";

/**
 * Every screen in the app, as one horizontal rail.
 *
 * The three-phone hero above says "it looks good"; this says "there is
 * actually a whole app here" — which is the thing a store listing has to
 * prove. Real captures, no recreations.
 *
 * It advances on its own so a visitor who never touches it still sees all
 * nine, and yields the moment they engage: a wheel, touch or drag hands
 * control over for six seconds of idle, then the loop picks up from
 * wherever they left it rather than snapping back to its own position.
 */
const ADVANCE_MS = 2800;
const RESUME_AFTER_INPUT_MS = 6000;
const GLIDE_MS = 560;
const SCREENS: { src: string; title: string; copy: string }[] = [
  { src: "/app/home-screen.webp", title: "Home", copy: "Next session countdown, last race, championship" },
  { src: "/app/live-tower.webp", title: "Timing tower", copy: "Gaps, sectors, tyres and DRS, live" },
  { src: "/app/live-comms-screen.webp", title: "Comms", copy: "Race control, team radio and pit stops" },
  { src: "/app/schedule-screen.webp", title: "Schedule", copy: "Every round, every session" },
  { src: "/app/stewards-room-tyres.webp", title: "Stewards' Room", copy: "FIA documents, parsed and readable" },
  { src: "/app/learn-f1.webp", title: "Learn F1", copy: "Seven chapters, ground up" },
  { src: "/app/learn-f1-tyre.webp", title: "Tyres", copy: "Compounds compared in 3D" },
  { src: "/app/learn-f1-evolution-cars.webp", title: "Evolution", copy: "The cars that changed the sport" },
  { src: "/app/news-screen.webp", title: "News", copy: "Straight from the paddock" },
];

export function ScreenGallery() {
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Timestamp until which the auto-loop stays out of the way, set by a real
  // interaction (wheel, touch, drag). Deliberately NOT set by hover: this
  // rail is a full-bleed 1440x612 band, so on desktop the cursor rests
  // inside it most of the time and a hover-pause froze the loop outright.
  const holdUntil = useRef(0);
  const frame = useRef<number | null>(null);

  // Track which card is centred so the counter below stays truthful.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      const cards = [...rail.querySelectorAll<HTMLElement>("[data-card]")];
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive(best);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-advance by exactly one card, reading the rail's live scroll position
  // each tick so a hand-scrolled rail resumes from where the visitor left it.
  //
  // It steps by a card's pitch rather than centring the next card: on desktop
  // the rail is far wider than one card (1440 vs ~245), so centring resolves
  // to a *negative* scrollLeft for every card before the midpoint, which the
  // browser clamps to 0 — the loop computed a target and went nowhere for the
  // first half of the rail. Stepping is also identical to centring on mobile,
  // where one card fills the viewport, so it's one formula for both.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || reduced) return;

    // Glide by writing scrollLeft per frame rather than calling
    // scrollTo({ behavior: "smooth" }).
    //
    // The smooth path does not survive this container: the rail is
    // `scroll-snap-type: x mandatory` with `snap-center`, and because the
    // rail (1440) is far wider than a card (240), the first three cards all
    // resolve to snap position 0 — measured snap points are
    // [0,0,0,260,536,812,1072,1072,1072]. Against that, the smooth scroll
    // was issued correctly every tick and never landed: instrumenting
    // scrollTo on the deployed page showed four identical
    // `{left: 276, behavior: "smooth"}` calls in 12s with scrollLeft still
    // 0. A direct scrollLeft write does stick (276, snapping to 260, and
    // holding there), so the tween drives it that way instead.
    const glide = (to: number) => {
      const from = rail.scrollLeft;
      const delta = to - from;
      if (Math.abs(delta) < 1) return;
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - started) / GLIDE_MS, 1);
        // easeInOutQuad — starts and ends at rest, so consecutive steps read
        // as one continuous drift rather than a series of jumps.
        const eased = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
        rail.scrollLeft = from + delta * eased;
        frame.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(step);
    };

    const id = setInterval(() => {
      if (Date.now() < holdUntil.current) return;
      const cards = rail.querySelectorAll<HTMLElement>("[data-card]");
      if (cards.length < 2) return;
      const pitch = cards[1].offsetLeft - cards[0].offsetLeft;
      const max = rail.scrollWidth - rail.clientWidth;
      // Wrap only once there's less than half a card left to travel, and
      // clamp the last step to `max` rather than skipping it. Wrapping on
      // "the next full step would overshoot" instead stranded the final
      // screen — the rail stopped a card short and looped from there. The
      // half-pitch tolerance also absorbs scroll-snap pulling the resting
      // position a few px off `max`, which would otherwise stick the loop.
      const atEnd = max - rail.scrollLeft < pitch * 0.5;
      glide(atEnd ? 0 : Math.min(rail.scrollLeft + pitch, max));
    }, ADVANCE_MS);

    return () => {
      clearInterval(id);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reduced]);

  const yieldToVisitor = () => {
    holdUntil.current = Date.now() + RESUME_AFTER_INPUT_MS;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  };

  return (
    <section className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28">
      <div className="mx-auto mb-12 max-w-[84rem] px-5 sm:px-8">
        <p className="text-[10px] font-bold tracking-[0.28em] text-[#df3409] uppercase">Every screen</p>
        <h2 className="mt-4 max-w-2xl font-[var(--font-f1)] text-[clamp(2.3rem,4.8vw,4.2rem)] leading-[0.94] font-bold tracking-[-0.05em] italic">
          NINE SCREENS.
          <br />
          ONE RACE WEEKEND.
        </h2>
      </div>

      <div
        ref={railRef}
        onWheel={yieldToVisitor}
        onTouchStart={yieldToVisitor}
        onTouchEnd={yieldToVisitor}
        onPointerDown={yieldToVisitor}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-6 sm:gap-9 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCREENS.map((screen, i) => (
          <motion.div
            key={screen.src}
            initial={reduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.05 }}
            data-card
            className="w-[58vw] max-w-[15rem] shrink-0 snap-center sm:w-[30vw] lg:w-[17vw]"
          >
            <PhoneFrame
              ariaLabel={`GridBeat ${screen.title} screen on iOS`}
              platform="ios"
              screenshotSrc={screen.src}
            />
            <div className="mt-4">
              <div className="text-[12px] font-bold text-white/80">{screen.title}</div>
              <div className="mt-1 text-[11px] leading-snug text-white/36">{screen.copy}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[84rem] items-center gap-3 px-5 sm:px-8">
        <div className="flex gap-1.5" role="presentation">
          {SCREENS.map((s, i) => (
            <span
              key={s.src}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === active ? 20 : 8,
                backgroundColor: i === active ? "#df3409" : "rgb(255 255 255 / 0.16)",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] tracking-[0.16em] text-white/28 uppercase">Swipe to take over &middot; iOS build</span>
      </div>
    </section>
  );
}
