/**
 * First-load splash: an F1 starting-light sequence ("lights out and away we
 * go") into the GRIDBEAT wordmark, then a fade to reveal the dashboard.
 *
 * Each `.splash-rig-panel` mirrors a real FIA light gantry: a housing with
 * two stacked bulbs that ignite together, five panels lighting in turn,
 * then every panel blacking out simultaneously — not five lone dots.
 *
 * Deliberately zero JavaScript — pure CSS animation (keyframes in
 * globals.css) on statically server-rendered markup, so it paints instantly
 * on first load with no dependency on hydration completing. This sidesteps
 * the whole class of hydration-mismatch bug this app has hit before (see
 * CLAUDE.md gotcha #4): there's no client state to get out of sync, so
 * there's nothing to mismatch. It lives in the root layout, which the App
 * Router does not remount on client-side navigation, so it plays once per
 * hard load/refresh, never on in-app navigation between pages.
 */
export function SplashScreen() {
  const panelDelays = [0.1, 0.26, 0.42, 0.58, 0.74];

  return (
    <div className="splash-overlay" aria-hidden="true">
      <div className="splash-vignette" />
      <div className="splash-flash" />
      <div className="splash-speedlines">
        {panelDelays.map((_, i) => (
          <span key={i} className={`splash-speedline splash-speedline-${i}`} />
        ))}
      </div>

      <div className="splash-rig" role="presentation">
        {panelDelays.map((delay, i) => (
          <div key={i} className="splash-rig-panel">
            <span className="splash-bulb" style={{ animationDelay: `${delay}s` }} />
            <span className="splash-bulb" style={{ animationDelay: `${delay}s` }} />
          </div>
        ))}
      </div>

      <div className="splash-brand">
        <div className="splash-wordmark font-[var(--font-f1)]">GRIDBEAT</div>
        <div className="splash-tagline">LIVE TIMING DASHBOARD</div>
      </div>
    </div>
  );
}
