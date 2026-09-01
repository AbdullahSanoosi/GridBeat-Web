"use client";

import { useEffect, useState } from "react";

/**
 * Ports CircuitTrackImage (lib/core/widgets/app_widgets.dart) — the app
 * never shows these SVGs in their raw stored colors. Flutter recolors with
 * `ColorFilter.mode(color, BlendMode.srcIn)`: every non-transparent pixel
 * becomes one flat color, alpha/shape only. A plain `<img src=".svg">`
 * can't do that (an <img> is opaque to CSS `fill`), so this fetches the
 * SVG as text and rewrites every `fill="#..."` to `currentColor`, then
 * renders it inline — `color` on the wrapper does the recoloring, and a
 * `drop-shadow` glow (no Flutter equivalent — this is the "make it sexy"
 * pass) rides along for free since it's a real inline `<svg>` now, not an
 * opaque image.
 *
 * This is why the Monza page looked "shit": the raw SVG's own fill is a
 * near-black navy (#241758) that all but disappears against a dark
 * surface — never meant to be shown unrecolored. Fetched through
 * `/api/circuit-svg` rather than the source URL directly: that host sends
 * no `Access-Control-Allow-Origin` header, so a direct browser `fetch()`
 * of the markup is CORS-blocked (confirmed — the network tab shows it
 * plainly) even though a plain `<img src>` would have rendered the same
 * URL uncolored with no error, which is exactly why that was the
 * previous, silently-degraded approach.
 *
 * Two independent recoloring mechanisms are needed, not one — found by
 * actually checking a second circuit rather than assuming Monza's file
 * shape generalized: Monza's track shapes carry explicit `fill="#hex"`
 * attributes (handled by the text-replace below), but Nürburgring's carry
 * *no* fill attribute or style at all — the track shape was relying on
 * SVG's own initial fill value, which is **black**, not `currentColor`.
 * A `currentColor` wrapper only helps a shape that actually references it;
 * an unset `fill` never does. The `<style>` block below forces `fill:
 * currentColor` on `path`/`polygon`/`circle`/`ellipse`/`polyline` (real
 * track/marker geometry) via a real stylesheet rule, which — by CSS
 * specificity — beats a plain presentational `fill="..."` attribute but
 * loses to an inline `style="fill:...` on the same element, so a
 * genuinely-transparent `fill="none"` background stays untouched either
 * way (both files' backgrounds use one of those two forms). Deliberately
 * **not** targeting `rect`: Monza's transparent background is a bare
 * `<rect fill="none">` — a *presentational attribute*, weaker than a
 * stylesheet rule — so a `rect` selector here would repaint it solid and
 * bury the track under a full-canvas fill.
 */
export function TrackImage({
  url,
  color = "#ffffff",
  glow,
  className,
}: {
  url: string;
  /** currentColor for every shape in the SVG — matches CircuitTrackImage's default `Colors.white`. */
  color?: string;
  /** Optional glow color behind the line art (drop-shadow blur) — has no Flutter equivalent. */
  glow?: string;
  className?: string;
}) {
  // Keyed on `url` rather than reset in the effect (which would need a
  // synchronous setState at the top of it, flagged by react-hooks/set-
  // state-in-effect): stale markup from a previous `url` fails this check
  // and renders nothing until the new fetch resolves, so a circuit change
  // can't briefly show the old track.
  const [loaded, setLoaded] = useState<{ url: string; markup: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/circuit-svg?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`${res.status}`))))
      .then((svg) => {
        if (cancelled) return;
        const recolored = svg
          .replace(/fill="(?!none")[^"]*"/gi, 'fill="currentColor"')
          // Strips a non-"none" `fill:` out of an inline style="..." so the
          // stylesheet fallback below can take over — "none" is left
          // completely alone (a real bug here once cost a transparent
          // background rect its transparency: stripping *all* fill:
          // declarations indiscriminately, including "none", left the
          // style attribute empty, which fell through to SVG's black
          // initial fill on an element the stylesheet deliberately never
          // targets — see the class note below).
          .replace(/(style="[^"]*)fill:(?!\s*none\b)\s*[^;"]*;?([^"]*")/gi, "$1$2")
          // Catches shapes with no fill at all (SVG's initial value is
          // black, not currentColor) — see the "two mechanisms" note above.
          .replace(
            /<svg([^>]*)>/i,
            '<svg$1><style>path,polygon,circle,ellipse,polyline{fill:currentColor}</style>',
          );
        setLoaded({ url, markup: recolored });
      })
      .catch(() => {
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!loaded || loaded.url !== url) return null;
  const markup = loaded.markup;

  return (
    <div
      // These SVGs carry no width/height attribute (viewBox only), so an
      // injected <svg> defaults to the browser's intrinsic 300x150 unless
      // told otherwise — the child selector is what makes it fill its box.
      className={`[&>svg]:h-full [&>svg]:w-full ${className ?? ""}`}
      style={{ color, filter: glow ? `drop-shadow(0 0 24px ${glow})` : undefined }}
      // The SVG source is our own backend's static asset (f1-stats-api's /images/circuits/*.svg),
      // not user input — same trust boundary as the plain <img src> this replaces.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
