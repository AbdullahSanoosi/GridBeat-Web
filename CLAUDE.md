@AGENTS.md

# gridbeat-web — Notes for Claude

Next.js (App Router) web dashboard port of **GridBeat**, the Flutter F1 app at
`../GridBeat` (sibling directory). Same backends, same design language, new
desktop-first UI — this is not a wrapper or a WebView, every page is a real
Next.js route calling the backends directly.

**Why this exists / why Next.js and not Flutter Web:** the web dashboard needs
to be public-facing and shareable (unlike the Flutter app, which is for
existing users). Flutter Web's CanvasKit renderer, weak SEO/link-preview
support, and non-native browser feel all cut against that; Next.js gives real
HTML, fast first paint, and OG tags. This was an explicit decision made with
the user, not a default — don't revisit it without asking.

**The original phased plan** (Context, Phase 0–3 breakdown, explicit scope
exclusions) lived at `C:\Users\Abdullah Sanoosi\.claude\plans\sketch-out-the-phased-happy-salamander.md`
in the session that built this. That file may not persist across machines/
sessions — treat *this* file as the authoritative, up-to-date status instead
of hunting for that path.

---

## Status (update this section as work lands)

**Done — first-load splash screen:** `src/components/layout/splash-screen.tsx`
+ the `.splash-*` keyframes in `globals.css` — an F1 starting-light-gantry
sequence into the GRIDBEAT wordmark, then a fade. No Flutter equivalent to
port from (the Flutter app has no splash screen at all — this is a fresh
addition, not a port). Went through two passes: a first simple version (5
single dots), then a redesign after the user watched it and asked for
something "more sexy and grand." The current version: 5 light-gantry panels
(each a housing with 2 stacked bulbs igniting together, not lone dots,
matching real FIA start lights) ignite in turn, all black out
simultaneously, and that blackout instant is sold with a radial shockwave
flash burst plus 5 fanned speed-line streaks sweeping across; the wordmark
then scales/fades in with a letter-spacing convergence (starts wide-tracked,
settles to final tracking), followed by a tagline. Deliberately zero
JavaScript: pure CSS animation on statically server-rendered markup in the
root layout, specifically to paint instantly on first load with no
dependency on hydration and no client state to get out of sync (sidesteps
the hydration-mismatch bug class in gotcha #4 entirely, rather than needing
another `useMounted()` gate). Lives above `{children}` in `layout.tsx`,
which the App Router does not remount on client-side navigation, so it
plays once per hard load/refresh only — confirmed by navigating away
client-side after it finished and checking it stayed faded (didn't reset).
Respects `prefers-reduced-motion`.

A real bug was caught and fixed during the redesign, before it ever shipped:
the speed-line sweep keyframe referenced an undefined `var(--tw, 0deg)`,
which would have collapsed all 5 fanned streaks to the same angle by the
end of their animation. Fixed by giving each line its own `--angle` custom
property (`-16deg`/`-9deg`/`0deg`/`9deg`/`16deg`) referenced by both the
base transform and the keyframe's 0%/100% transform — CSS keyframes replace
the whole `transform` shorthand per keyframe rather than merging it, so the
angle has to be threaded through as a variable rather than hardcoded per
line, or the keyframe's own transform silently overwrites it. Confirmed
fixed by decomposing each line's final animation-finished transform matrix
back into an angle: line 0 → exactly -16°, line 4 → exactly +16°, etc.

**Verification note:** this environment's lack of frame compositing (gotcha
#6) affects CSS animations too, not just rAF/ResizeObserver/setInterval —
animations attach correctly (`animationPlayState: running`, correct
name/delay/duration/fill-mode) and the CSS itself parses with zero dropped
declarations (checked via `document.styleSheets`), but visually never
advances past frame 0 in this pane, and — a new finding this pass — `<video>`
seeking is *also* broken here: scrubbing a locally-recorded screen capture
to any timestamp always returned the same pre-navigation frame, across two
different capture methods (canvas-drawImage-to-dataURL and
canvas-toBlob-triggered-download), so a user-supplied recording couldn't be
reviewed frame-by-frame in this session either — add "video seeking" to the
gotcha #6 bucket alongside rAF/ResizeObserver/setInterval/CSS animations.
Verified as much as is mechanically possible here instead: manually
finished every animation via the Web Animations API (`el.getAnimations()
[0].finish()`) and confirmed every end-state is exactly correct — all 10
bulbs lit at `#D50000`, flash and speed-lines faded to 0 opacity with each
line's angle intact, wordmark at full opacity/scale/final letter-spacing,
tagline visible, overlay faded with `pointer-events: none`. The one thing
that could not be verified here, on either pass, is the smooth in-between
playback itself — the user confirmed the redesigned version looks good in
their own real browser.

**Done — Phase 0 (foundation):** Next.js 16 + TypeScript + Tailwind v4
scaffold, TanStack Query data layer with localStorage persistence, design
tokens ported from the Flutter app's `app_colors.dart`/`app_theme.dart`
(`src/lib/theme/colors.ts` + `src/app/globals.css`), custom Formula1/
Evangelion fonts copied into `public/fonts/`.

**Done — Phase 1 (dashboard pages):** Schedule, Standings, Race Archives
(Results), Stats (hub + per-metric leaderboards), Circuit Guide (index +
detail), Hall of Fame, News (ESPN + proxied X posts). Sidebar nav
(`src/components/layout/sidebar.tsx`) replaces the Flutter app's mobile
bottom pill.

**Done — Phase 2 (live timing):** the full WS state machine
(`src/lib/live/store.ts`, a Zustand port of `live_timing_provider.dart`),
REST bootstrap, session-change detection, and all four of the live page's
tabs: Tower (leaderboard + weather panel + fastest-lap overlay), Comms (race
control + pit stops + team radio playback), Map (Canvas track map with the
position-interpolation engine), Telemetry (multi-driver speed/throttle/
brake/gear/RPM + lap-time-trend comparison, `src/components/live/
telemetry-compare.tsx`, ports `telemetry_compare.dart`). Telemetry is
rendered as a 4th tab instead of the Flutter version's modal bottom sheet —
a sheet is a mobile pattern, a tab is the desktop-dashboard equivalent.
Recharts instead of fl_chart; since each driver's samples carry their own
timestamps (not a shared X axis), each `<Line>` gets its own `data` array
rather than the chart sharing one top-level dataset. **Verification caveat:**
the lap-time/current-lap-elapsed-seconds bucketing math was verified against
synthetic samples (a standalone Node script, not committed) since the only
live/replay session available during this session's testing wasn't actually
streaming CarData (WS inspection showed just one DriverList snapshot +
Heartbeats — a backend/session characteristic, not a component bug, same
class of thing as the race-control-empty-for-a-session note below). Re-verify
pixel output against a real live/replay session with actual CarData traffic
before trusting the chart rendering further.

**Done — live broadcast commentary audio:** ported from the Flutter repo's
`feature/commentary-audio` branch (not `develop`/`main` — that branch has
the actual commentary player; `develop` only has the `AudioStreamInfo`
model plumbing, `main` is far behind both). F1's own live-coverage HLS
stream (`AudioStreamInfo`/`audioStreamsFromJson`/`primaryCommentaryStream`
already existed in `src/lib/models/live.ts`; only the UI/playback layer and
two bugfixes were missing before this pass:
- `src/components/live/commentary-player.tsx` — a `COMMENTARY` toggle chip
  in the live page header (green when on, muted when off; hidden entirely
  when no stream is available yet, matching the Flutter version's
  conditional render), backed by an `HTMLAudioElement` + lazy-loaded
  `hls.js` for browsers without native HLS support (Safari plays `.m3u8`
  natively via `canPlayType`; every other browser needs the ~600KB hls.js,
  dynamically imported so it never loads for anyone who leaves commentary
  off). One effect keyed on `[stream?.uri, enabled, radioPlayingUrl]`
  collapses the Dart version's three separate `ref.listen` callbacks into a
  single sync function, reading fresh state via `useLiveTimingStore.getState()`
  inside the effect (same imperative-read idiom the track map already uses)
  rather than closing over the outer `stream` object, which is a new
  reference every render.
- `src/lib/live/radio-playback-store.ts` — a tiny standalone Zustand store
  (deliberately *not* folded into the main live-timing store, since it's UI
  coordination state, not WS-driven domain data) mirroring the Flutter
  version's `_playingUrlProvider`: lets the commentary player duck
  (auto-pause) itself while a team radio clip is playing and resume once it
  stops. `TeamRadioList` in `src/components/live/comms.tsx` was switched
  from local `useState` to this shared store so both components see the
  same "is a radio clip playing" signal.
- **Bugfix 1** (ported from the feature branch): `audioStreamsFromJson` now
  accepts F1's SignalR delta shape for `Streams` (an index-keyed object,
  `{"0": {...}}`) in addition to the plain-array snapshot shape — same
  quirk already worked around for `RaceControlMessages.Messages`. Since
  `AudioStreams` arrives exactly once per session, a shape this misses was
  gone for the rest of the session with nothing to retry.
- **Bugfix 2** (ported from the feature branch): `onRawMessage` in
  `src/lib/live/store.ts` now special-cases `msg.type === "AudioStreams"`
  to bypass the DVR playback buffer entirely and apply immediately — same
  treatment as the initial full-state snapshot. This one-shot event has no
  later update to supersede a lost one, so routing it through the buffer
  risked `trimBuffer` silently evicting it during a long pause/delay before
  it was ever applied. This bugfix is arguably *more* relevant on the web
  port than it was upstream, since the DVR buffer was ported into this repo
  in the same session as this commentary work — there was no window where
  the web port had the buffer without also having this fix.
- **A bug found (not ported from Flutter — new to this port) and fixed
  during verification:** the initial `audio.play()` error handler logged
  every rejection, including the benign `AbortError` that fires when a
  later effect run calls `.pause()` while an earlier `.play()` call is
  still pending (a well-known `HTMLMediaElement` race, not specific to this
  code). Fixed by checking `e.name === "AbortError"` and returning early
  before logging — note this checks `"name" in e`, not `instanceof
  DOMException`, because `DOMException` does not inherit from `Error` per
  spec and an `instanceof Error` check silently failed to match here.
- **Verified in a real browser with genuinely live production data:**
  intercepted `window.Audio` to get a direct handle on the underlying
  element (it's never attached to the DOM, so `document.querySelectorAll
  ('audio')` can't find it) and confirmed against the real F1 stream
  (`rdio.formula1.com`) — `paused: false`, `currentTime` continuously
  advancing, `readyState: 4`, zero playback errors. Confirmed the mute
  toggle pauses/resumes the *same* `Audio` instance (only one was ever
  constructed — the `loadedUrlRef` reload-avoidance optimization holds).
  Confirmed the full radio-ducking cycle end to end: starting a team radio
  clip paused commentary immediately, stopping the clip resumed it. Zero
  console errors across the entire sequence. This session's test
  environment happened to report `"maybe"` from `canPlayType('application/
  vnd.apple.mpegurl')` (i.e., it took the native-HLS path, not hls.js) —
  don't assume that generalizes to a real user's Chrome/Firefox, where
  `canPlayType` for HLS returns `""` and the hls.js path is what actually
  carries this feature; the native-path code was verified live here, the
  hls.js path was not (though hls.js itself is a mature, extremely widely
  used library for exactly this scenario).

**Done — driver/constructor detail pages:** `/driver/[driverId]`,
`/constructor/[constructorId]` — ports `driver_details_screen.dart`/
`constructor_details_screen.dart` + `enrichment_provider.dart`. Hero, bio,
career totals, all-time rankings, by-team rankings (driver)/best-circuit
(constructor), head-to-head + qualifying gap (driver)/records (constructor),
championship-history line chart + season points bar chart (Recharts, not
fl_chart), season stats table, race-by-race results grid (driver). Linked
from Standings, Hall of Fame, and the Stats leaderboard pages. Simplified vs.
Flutter: no go_router `extra` state to carry a live standing across
navigation, so the page fetches current-season standings itself and matches
on id — current-grid drivers/constructors render in "season mode"
(position/points KPIs), everyone else (retired/historical, entries from Hall
of Fame or a leaderboard) renders in "career mode". Also skips the Flutter
hero's floating/cropped headshot layering in favor of a plain rounded image,
consistent with this app's "new desktop-first UI, not a pixel port" design
intent.

**Done — race progression chart:** `/stats/quali-to-race` — ports
`race_progression_screen.dart` + `race_progression_provider.dart` +
`race_progression_chart.dart`. Season/race `<select>` pickers (native
dropdowns instead of the Flutter version's modal bottom sheets — a sheet is
a mobile picker pattern, a dropdown needs no extra chrome on desktop);
defaults to the most recently-synced race via `getSyncStatus()`, same as the
Flutter screen. The bump/slope chart (QUALI → GRID → RACE columns joined by
curved ribbons, colored by position gain/loss/hold) is a straight SVG port
of the Flutter version's Canvas `CustomPainter` — SVG instead of Canvas
specifically to sidestep the whole canvas+ResizeObserver feedback-loop bug
class from gotcha #5 below (nothing here writes back into the observed
container's own size, so there's no loop to create). The previously-dead
link from the Stats hub (`/stats/page.tsx`'s "QUALI → RACE PROGRESSION"
card) now resolves. Caught and fixed during this session: (1) a hydration
mismatch from rendering the season/round `<select>` values before
`useMounted()` flipped true — fixed by gating the whole picker+chart block
behind `mounted`, not just the chart; (2) the chart rendered blank because
`RaceProgressionChart`'s width came only from a `ResizeObserver` callback —
fixed by seeding the width with one synchronous `getBoundingClientRect()`
call before attaching the observer, the same "paint synchronously first"
idiom the track map already uses (see gotcha #6). Also reconfirmed gotcha
#6 itself: `ResizeObserver` doesn't fire at all in this session's testing
pane (isolated with a standalone test div, not just this component), so
don't trust an observer-only measurement to ever produce a first paint in
this environment — always seed synchronously too, regardless of component.
Verified in a real browser after both fixes: real qualifying/grid/race data
rendering (66 dots, 44 ribbons for a full 22-driver grid), zero console
errors beyond an unrelated hydration warning confirmed to be pre-existing
and site-wide (reproduces on `/schedule` and `/stats` too, pages untouched
this session) — not introduced by this feature, not investigated further as
out of scope.

**Done — client-side DVR/playback buffer:** ported into `src/lib/live/store.ts`
from `LiveTimingNotifier`'s `_buffer`/`_playhead`/`_playbackDelay`/`_paused`
fields — same constants as the Flutter version (100ms tick, 6x catch-up
multiplier, 15-min rolling buffer window). WS messages now land in a
timestamped buffer (`onRawMessage`) instead of being applied immediately;
`tickPlayback` (a `setInterval`) drains it into the existing `handleMessage`
once each message's age has passed the configured delay. The full-state
initial snapshot (`msg.type === undefined`) still applies immediately on
every reconnect, matching the Dart version's same carve-out. `resetPlaybackBuffer()`
is wired into both `forceRefresh()` and the session-change-detected branch
of `checkSessionChanged()`, matching the two call sites in the Flutter
original. Exposed as 4 new store actions (`setPlaybackDelay`, `pausePlayback`,
`resumePlayback`, `skipToLive`) plus the pre-existing `playbackDelayMs`/
`paused`/`bufferedMs` state fields (already present in `LiveSnapshot`,
previously unused). UI: `src/components/live/playback-control.tsx` — a
status chip in the live page header (LIVE / PAUSED / catching-up seconds /
"-Ns" behind) that opens a small anchored popover with the delay slider and
pause/skip-to-live buttons, ported from `_PlaybackChip`/`_PlaybackSheet` in
`live_timing_screen.dart` — a popover instead of the Flutter version's modal
bottom sheet, matching the same sheet-to-desktop-affordance swap used
elsewhere (Telemetry Compare, the race picker). **Verified in a real
browser:** delay slider, pause, resume, and skip-to-live all correctly
update the chip label and store state, and the leaderboard kept receiving
and rendering live messages throughout (proving they still flow through the
new buffered path, not stuck) — zero console errors beyond the pre-existing
unrelated hydration warning noted above. One thing this session's testing
pane could NOT verify: whether the catch-up multiplier keeps the buffer
near-zero under sustained real load — in this pane `document.hidden` is
permanently `true` (confirmed directly; `tabs_select`/focusing the pane
doesn't change it), so Chromium throttles the `setInterval` ticker hard and
the buffer visibly grows (confirmed up to 100+ seconds behind after ~15s
idle) purely from throttling, not app logic — `skipToLive()` still cleared
it instantly on every test, proving the drain mechanism itself is correct.
This is the same class of environment limitation as gotcha #6 below (add it
to that mental bucket: rAF, ResizeObserver, *and* setInterval cadence are
all suspect in this pane). Re-verify the catch-up-rate behavior specifically
in a real, focused browser tab before trusting it under genuinely heavy
message load.

**Done — 3D track map, Phase 1 (Live Timing → Map tab):** replaced the flat
Canvas 2D map with a react-three-fiber WebGL scene. This was a user
request ("more sexy and grand... like a 3D") after reviewing the old
implementation; researched three-.js/R3F vs. deck.gl+MapLibre vs. a fake-
isometric-canvas approach and went with R3F because MultiViewer's track
`{x,y}` (and the live WS's `PositionSample.x/y` — same coordinate space)
are local, circuit-relative units with an arbitrary origin/scale, not
geographic — a real-world geo basemap would need an unsolved per-circuit
local→lat/lng calibration with no clean data path found, so it was ruled
out. Pure render-layer swap: `useLiveTimingStore` selectors
(`sessionInfo`/`trackDots`/`positionHistory`/`carPositions`/`leaderboard`)
and `fetchTrackData()` in `lib/api/multiviewer.ts` are all untouched.
`src/components/live/track-map.tsx` (single file) → `src/components/live/
track-map/` (folder): `geometry.ts` (normalizes any circuit's points into a
fixed-size world — longest bounding-box dimension → 40 units, centered at
origin — so camera/car-size/line-width constants are circuit-independent;
builds the ribbon as a triangle-strip `BufferGeometry` via finite-
difference tangents + perpendicular offsets around a closed
`CatmullRomCurve3`), `use-playhead-positions.ts` (the old canvas version's
"virtual playhead" interpolation algorithm — bootstrap runway, resync
threshold, per-driver sample queue + GC — ported nearly verbatim, just
returning positions to a caller instead of driving a canvas redraw
itself), `track-ribbon.tsx` (the extruded track + corner markers),
`car-markers.tsx` (one emissive sphere + contact-shadow disc + billboarded
label per driver, positions written straight to each mesh's ref inside
`useFrame` — never through React state, matching the old code's discipline
of not re-rendering every animation frame), `scene.tsx` (the `<Canvas>`
root: tilted `PerspectiveCamera`, drei `OrbitControls` replacing the old
manual pan/zoom math, ambient+directional lighting, a dark ground plane,
subtle fog), `index.tsx` (client entry — container + reset-view button +
`next/dynamic(() => import("./scene"), { ssr:false })` so three.js/fiber/
drei, a meaningful bundle-weight addition, only loads once a user actually
opens the Map tab, same discipline as `commentary-player.tsx`'s lazy
`import("hls.js")`). New deps: `three`, `@react-three/fiber@^9` (the
React-19-compatible line — confirmed against this project's
`react@19.2.8`; v8 pairs with React 18), `@react-three/drei`.

**A genuinely new, stricter member of gotcha #6 below, found while
verifying this:** in this sandbox, a react-three-fiber `<Canvas>` cannot
render *even a single frame* — not just "playback doesn't visually
advance" like the old 2D canvas/CSS-animation cases, but frame zero itself
never paints, because R3F's whole render loop (including its first frame)
is scheduled via `requestAnimationFrame`, which never fires here at all;
unlike the hand-rolled 2D canvas code, there's no hook to force one
synchronous initial paint since R3F fully owns that loop internally. Two
knock-on findings from the same root cause, both confirmed directly: R3F's
canvas-sizing (via an internal `ResizeObserver`-based measure hook) also
never applies on mount for the same reason — the canvas stayed stuck at
the default 300×150 until a manual `window.dispatchEvent(new
Event('resize'))` forced it, at which point it correctly picked up the
real 959×598 container size (proving the component itself is correct, and
that R3F does have a `window`-resize-driven fallback path independent of
the broken `ResizeObserver` path) — and `useFrame` callbacks (which is
where the ported interpolation engine lives) never ran either, so car
marker groups stayed at their initial `visible={false}`/`position (0,0,0)`
state throughout testing here. **Verified as much as is mechanically
possible given that:** temporarily added an `onCreated` prop to `<Canvas>`
exposing `{ scene, camera, gl }` on `window` (removed before finishing,
never shipped) and walked the live Three.js scene graph directly — real
track geometry present (5,312-vertex closed ribbon, exact `#2E3133`
asphalt color match), corner markers with number labels, and all 23 driver
groups present with correct team colors sourced from the live feed (not
the static `colors.ts` table — `teamColorHex` reads the WS's own per-driver
hex, which is why values differ slightly from `colors.ts`'s hardcoded
list). `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean.
**Not verified here, same as every other rAF-dependent feature in this
project:** the actual visual result — camera framing, car movement,
whether the "sexy and grand" bar is met — needs the user's real browser,
where `requestAnimationFrame` fires normally and none of the above applies.

**Deferred to a later pass (not started):** Phase 2 — glow/trail polish
(drei `<Trail>`), a real DRS-active visual state per car (backed by actual
data — `drsActive()` in `lib/models/live.ts` already exists), corner-label
styling. Phase 3 (contingent/uncertain) — sector-colored track segments or
static DRS-zone markers, gated on whether MultiViewer's raw circuit JSON
actually contains marshal-sector/DRS-zone boundaries (not yet inspected);
a "follow driver" camera mode. Full plan at
`C:\Users\Abdullah Sanoosi\.claude\plans\swirling-wiggling-emerson.md` if
still reachable.

**Not started yet:**
- 3D Car Viewer, Learn F1/Evolution — explicitly out of scope per the
  original plan (mobile-only / lower priority; see that plan file if it's
  still reachable).
- Auth — not needed; the Flutter app's Google-OAuth-via-Supabase doesn't
  gate anything today either.

---

## Architecture

```
src/
├── app/                    # routes (App Router) — one folder per page
│   ├── live/                page.tsx has the Tower/Comms/Map tabs
│   ├── stats/[metricKey]/   dynamic leaderboard route
│   ├── circuits/[circuitId]/
│   └── api/x-posts/         server-side proxy (see Security below)
├── components/
│   ├── layout/sidebar.tsx   nav — add a link here whenever a new page lands
│   ├── live/                Tower/Comms/Map/weather/fastest-lap components
│   └── providers/           QueryProvider (TanStack Query + persistence)
├── hooks/use-mounted.ts     hydration-safe "has the client mounted" hook —
│                            see Gotchas, use this on every page with
│                            client-fetched data or locale-dependent formatting
├── lib/
│   ├── api/                 backend clients: stats-api, jolpica, openf1,
│   │                        live-api, multiviewer, supabase, enrichment, news
│   ├── live/                store.ts (Zustand state machine),
│   │                        websocket-client.ts (WS client)
│   ├── models/               live.ts, schedule.ts, standings.ts, etc. —
│   │                        TS ports of the Flutter app's data/models/*.dart
│   └── query/                ttl.ts (staleTime table), query-client.ts
```

**State management:** TanStack Query for all REST reads (staleTime per
`lib/query/ttl.ts`, mirrors the Flutter app's `cache_service.dart` TTL
table). Zustand for the live-timing WebSocket state (`useLiveTimingStore`) —
a singleton store shared app-wide, matching the Flutter app's provider
lifetime; pages don't own the WS connection, they just call
`useLiveTimingStore((s) => s.connect)` on mount and never disconnect on
unmount.

**Porting convention:** every `lib/api/*.ts` and `lib/models/*.ts` file has a
docstring naming the exact Flutter source file it was ported from. When
extending a feature, read that source file first rather than guessing at
field names/shapes — the backends are shared, so the Dart parsing logic is
usually still correct, just needs syntax translation.

---

## Backends (all shared with the Flutter app — see `../GridBeat/CLAUDE.md`)

| Source | Base URL (env var) | Used for |
|---|---|---|
| f1-stats-api (PostgREST) | `NEXT_PUBLIC_STATS_API_BASE_URL` = `https://f1stats.5928104.xyz` | Schedule, standings, archives, stats, hall of fame. **Note:** this is a different domain than the Flutter app's `f1stats.8582003.xyz` — the user explicitly confirmed the web app should use the `5928104.xyz` one. |
| gridbeat-backend (live) | `NEXT_PUBLIC_LIVE_API_BASE_URL` / `NEXT_PUBLIC_LIVE_WS_URL` | Live timing WS + REST bootstrap |
| Jolpica | `NEXT_PUBLIC_ERGAST_BASE_URL` | Race/qualifying results, pit stops |
| OpenF1 | `NEXT_PUBLIC_OPENF1_BASE_URL` | Qualifying sector/speed-trap detail |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` | Driver/constructor/circuit bios |
| MultiViewer | hardcoded in `lib/api/multiviewer.ts` | Circuit track geometry for the map |
| ESPN | hardcoded in `lib/api/news.ts` | News articles (public CORS, no proxy needed) |
| twitterapi.io | server-only `TWITTER_API_KEY`, via `/api/x-posts` | X posts feed |

**CORS confirmed working** on both custom backends (`f1stats.5928104.xyz`
and the live API) — verified via curl and a real browser fetch during
Phase 0. No backend changes needed for anything currently built.

### Security: don't regress the X-posts proxy

`x_posts_service.dart` in the Flutter app ships its twitterapi.io key
client-side with a comment flagging it as insecure/temporary. `/api/x-posts`
here exists specifically to fix that — the key lives only in `.env.local`'s
server-only `TWITTER_API_KEY` (no `NEXT_PUBLIC_` prefix) and the browser only
ever calls the same-origin proxy route. If you ever touch X-posts fetching,
keep the key server-side; don't reintroduce a client-side call to
twitterapi.io directly.

---

## Deployment (superseded plan below, then the actual decision)

**GitHub:** pushed to `github.com/AbdullahSanoosi/GridBeat-Web` (note the
repo name's casing differs from this local folder/npm package name —
that's fine, they're unrelated identifiers; don't rename the local folder
to "match", since this repo's own `.claude/launch.json` and the sibling
Flutter repo's `../GridBeat/.claude/launch.json` both reference this exact
folder name).

**Superseded: Cloudflare Pages + OpenNext adapter.** The original plan
(below, kept for context) was Cloudflare Pages with the OpenNext Cloudflare
adapter. After a discussion with another AI about deployment options, the
user redirected to self-hosting on the same VPS as the live API instead —
see "Actual decision" below. The Pages/adapter risk this was meant to
avoid (adapter lag behind a very recent Next.js release) is now moot since
there's no adapter in the path at all.

<details>
<summary>Original Cloudflare Pages plan (not used)</summary>

Host: Cloudflare Pages — decided over Vercel specifically because the user
already runs the backend infra through Cloudflare: both
`NEXT_PUBLIC_STATS_API_BASE_URL` (co-developer Sajjad's Oracle VPS) and
`NEXT_PUBLIC_LIVE_API_BASE_URL`/`NEXT_PUBLIC_LIVE_WS_URL` (the user's own
Oracle VPS) are fronted by Cloudflare Tunnels under domains the user
already manages in the same Cloudflare account. Would have needed the
[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)
(`@opennextjs/cloudflare`) since Next.js doesn't run on Cloudflare Workers
out of the box.

</details>

**Actual decision: self-hosted via Docker on the same Oracle VPS as the
live API.** SSH alias `f1box` (Oracle ARM/aarch64, Ubuntu 24.04, 2 vCPU,
11GB RAM — idle/plenty of headroom; see `~/.ssh/config` if the alias needs
re-adding on a new machine). This is the same box `gridbeat-backend`
already runs on (`~/f1-backend` there, Docker Compose, `network_mode:
host`, fronted by a **dashboard-managed** Cloudflare Tunnel — no local
`/etc/cloudflared/config.yml` exists on the box; every hostname's ingress
rule lives in the Cloudflare Zero Trust dashboard, not in a file this repo
or that box controls). Reusing this box sidesteps the adapter-compatibility
risk entirely (plain Node SSR via `next start`-equivalent, not Workers) and
means one less piece of infra to operate — at the cost of the live API and
the web dashboard now sharing a failure domain, and losing Cloudflare
Pages' free edge CDN/preview-deploys (the tunnel hostname can still be
orange-clouded through Cloudflare for caching if wanted later).

**What's set up (this repo, all committed except deploy-time secrets):**
- [next.config.ts](next.config.ts) — `output: "standalone"`.
- [Dockerfile](Dockerfile) — multi-stage (`deps` → `builder` → `runner`),
  `node:22-alpine` (multi-arch, works on the box's aarch64 without cross-
  compiling), copies `.env.production` into the `builder` stage before
  `next build` since `NEXT_PUBLIC_*` vars are inlined into the client
  bundle at *build* time, not read at runtime. Runs as a non-root
  `nextjs` user, `CMD ["node", "server.js"]` (the standalone-output
  entrypoint).
- [docker-compose.yml](docker-compose.yml) — mirrors `f1-backend`'s own
  compose file: `container_name: gridbeat-web`, `restart: always`,
  `network_mode: host`, `env_file: .env`. Host networking means the app
  just binds `PORT=3000` directly on the box, same pattern as the backend
  binding `8000`.
- [.dockerignore](.dockerignore) — excludes `node_modules`, `.next`,
  `.git`, `.env*`.

**Env var split (don't collapse these into one file):**
- `.env.production` — the `NEXT_PUBLIC_*` public vars only. Not committed
  (gitignored like `.env.local`), lives only on the VPS at
  `~/gridbeat-web/.env.production`, copied into the Docker **build**
  context so `next build` bakes them into the client bundle. No secrets in
  here, so baking them into image layers is fine.
- `.env` — just `TWITTER_API_KEY` (the one real secret). Also VPS-only,
  referenced by `docker-compose.yml`'s `env_file:` so it's supplied to the
  container's `process.env` at **runtime** only — never baked into an
  image layer, same spirit as the security note on the X-posts proxy
  above.

**How code got onto the box:** NOT via `git clone` from GitHub — the
working tree was packaged locally with `tar` (excluding
`node_modules`/`.next`/`.git`/`.env*`) and `scp`'d straight into
`~/gridbeat-web` on `f1box`, since the repo's `origin` push wasn't part of
this deploy and there was no reason to require it. This means **the VPS
copy will drift from GitHub** on the next code change unless you either
re-run the same tar/scp steps or switch the box over to `git pull` — pick
one deliberately next time rather than mixing both.

**Build note:** this box's Docker (29.1.3) does **not** have the `docker
compose` plugin subcommand — only the legacy standalone `docker-compose`
binary at `/usr/bin/docker-compose`. Use `sudo docker-compose build` /
`sudo docker-compose up -d` in `~/gridbeat-web` on the box, not `docker
compose`.

**Verified:** `sudo docker-compose build` completed clean (Next.js 16.3.3,
Turbopack, all 14 routes compiled, TypeScript passed). Container
`gridbeat-web` is up; `curl http://localhost:3000/` on the box returns a
307 to `/schedule` (the app's intentional root redirect) which then
resolves 200 — confirmed via `curl -L`. Not yet checked in a real browser
against the public hostname (that needs the Cloudflare-side step below
first).

**Done — Cloudflare Public Hostname:** `webapp.5928104.xyz` → `http://localhost:3000`
added to the same tunnel (`f1-tunnel`) already serving `api.5928104.xyz` and
`test.5928104.xyz` (4 routes total on that tunnel now — nowhere near
Cloudflare's account-wide cap of 1,000 routes / 1,000 tunnels, and route
*count* on one tunnel doesn't itself cost performance — `cloudflared`
multiplexes all hostnames over the same persistent edge connections
regardless of how many ingress rules exist). DNS didn't auto-create on the
first attempt (NXDOMAIN from both 1.1.1.1 and 8.8.8.8 right after adding the
hostname in the dashboard) but resolved correctly on retry. Verified in a
real browser against the public hostname: `/` → 307 → `/schedule` → 200,
real 2026 season data rendering, zero console errors, `Server: cloudflare`
header confirming it's actually going through the edge, not a direct hit.
A real domain will replace this at release time (not chosen yet); when that
happens, add the new hostname the same way rather than assuming DNS/tunnel
work carries over automatically.

The Cloudflare Access plan from the original write-up (free tier, up to 50
users, email allowlist during private beta, delete the policy to go public
later) is unchanged by this pivot — Access sits in front of a tunnel
hostname regardless of what's behind it, so it applies the same way to
`webapp.5928104.xyz` as it would have to a Pages deployment.

**Resource headroom check (f1box is shared with the live API):** pulled
`sar` history (sysstat, already running on the box, 10-min samples) for the
Dutch GP race day (2026-08-23, the last real live session) to see what a
live session actually costs this 2 vCPU/11GB box, before gridbeat-web
existed. During the ~13:00–15:20 UTC race window: CPU never dropped below
~94.5% idle (backend peaked around 5.5% of the 2 vCPUs), memory stayed at
3.8–5% used the entire time, network peaked at ~25 kB/s tx. All three
nowhere near a ceiling — the live backend's own footprint is a small
fraction of this box's capacity, so gridbeat-web sharing the box isn't a
near-term concern. `sysstat`'s `HISTORY` was bumped from the default 7 days
to 31 (`/etc/sysstat/sysstat` on the box) so this kind of retrospective
check stays possible for longer.

**Ongoing per-container monitoring (set up 2026-08-28, ahead of the Spanish
GP on 2026-09-13):** `~/monitor/docker-stats-log.sh` on `f1box` appends a
timestamped `docker stats --no-stream` snapshot (CPU%, mem, net I/O) for
every running container to `~/monitor/docker-stats.csv`, run every minute
by the `docker-stats.timer` systemd timer (mirrors the existing
`sysstat-collect.timer` pattern already on the box). Runs as the `ubuntu`
user via passwordless sudo (already configured on this box — confirmed with
`sudo -n true`), so it needs no interactive auth. Log rotates weekly via
`/etc/logrotate.d/docker-stats` (8 weeks kept, compressed). This gives a
per-container breakdown (gridbeat-web vs. f1-live-timing specifically,
unlike system-wide `sar`) to check after any future race weekend — ask
Claude to pull and summarize `~/monitor/docker-stats.csv` for the relevant
time window rather than re-deriving this setup from scratch.

---

## Environment setup

`.env.local` is gitignored (has real secrets) — copy `.env.example` and fill
in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public/
safe, same values as the Flutter app's `app_constants.dart`), and
`TWITTER_API_KEY` (from `../GridBeat/lib/features/news/data/x_posts_service.dart`,
server-only). Everything else in `.env.example` already has real default
values (the public backend URLs) since those aren't secret.

Dev server: `npm run dev` (port 3000). There's a `.claude/launch.json` in the
**Flutter** repo (`../GridBeat/.claude/launch.json`) configured to run this
app's dev server via `npm --prefix ../gridbeat-web run dev` — that's how the
Browser-pane preview tooling was driven during this build, since the working
directory for most of the session was the Flutter repo, not this one.

---

## Gotchas (all hit and fixed during the initial build — don't reintroduce)

1. **Tailwind v4 `@theme inline` self-reference.** `globals.css` briefly had
   `@theme inline { --color-background: var(--color-background); ... }` —
   giving a theme token the *same* var() name as itself, which is a circular
   reference that made every color "invalid at computed-value time" and
   silently killed contrast site-wide (looked like a rendering bug, wasn't —
   it was a CSS authoring bug). Fix: use plain `@theme` with literal values
   when there's no real indirection needed (no dynamic source like
   next/font). `@theme inline` is only for referencing a genuinely different
   existing CSS variable.

2. **Default font must be Formula1, not Evangelion.** In the Flutter app's
   `AppTextStyles`, "Formula1" covers titleLarge/titleNormal/labelLarge/
   labelNormal/labelSmall/labelMini — nearly everything (nav, table cells,
   headers). "Evangelion" is used for exactly one style (`body`, 18sp), not
   as a general default, and it's a thin/stylized face that looks
   blurry/low-contrast as dense UI text at small sizes. `body`'s
   `font-family` in `globals.css` must stay `var(--font-f1)` first.

3. **TanStack Query retries can get stuck in `fetchStatus: 'paused'`
   forever** in this environment/version combo, even with
   `networkMode: 'always'` set explicitly on the query (reproduced directly —
   the *first* attempt executes fine, but a *retry* after a failure re-enters
   a paused state that never resolves, so the UI hangs on a loading spinner
   forever instead of showing an error). Root-caused to the retry mechanism
   specifically, not online-detection generally. Fixed by setting
   `retry: false` in `lib/query/query-client.ts`'s defaults — a stuck
   spinner is worse than a shown error, and none of this app's queries
   benefit enough from auto-retry to be worth the risk. Don't re-enable
   `retry` without re-testing this failure mode first.

4. **Hydration mismatches from client-only data.** Every page here is
   client-fetched (no server-side query prefetch/dehydration set up), and
   some format dates/times in the viewer's local timezone — both can
   legitimately differ between the server's render and the client's first
   paint. Fix: `hooks/use-mounted.ts`'s `useMounted()` (built on
   `useSyncExternalStore`, not the `useEffect(() => setState(true))` idiom —
   that pattern trips `react-hooks/set-state-in-effect`). Gate
   query-dependent JSX behind `if (!mounted) return <fallback>` on any new
   page that fetches data or formats locale-dependent values.

5. **Canvas + `ResizeObserver` feedback loop broke the whole page's
   layout.** The track map's `<canvas>` originally used `className="h-full
   w-full"` inside a container that a `ResizeObserver` was watching — the
   canvas's own bitmap-size writes could feed back into the observed
   container's measured size, and on the user's real browser this compounded
   into runaway horizontal growth that pushed the entire page into overflow
   and squeezed the sidebar down to a sliver (did not reproduce in this
   session's own testing pane, which doesn't composite frames at all —
   caught only via the user's screenshot). Fixed in `track-map.tsx` by (a)
   `absolute inset-0` on the canvas so it's fully out of normal flow and its
   size can never influence its container, (b) guarding the resize handler
   against no-op writes, (c) `min-w-0` on the root layout's main content
   flex item as a defense-in-depth net against this whole bug class on any
   future wide-content page. If you add another `<canvas>` or similarly
   layout-sensitive element, take it out of flow the same way.

6. **This dev/testing environment doesn't visually composite frames** —
   `computer{action:"screenshot"}` fails outright ("Browser pane is not
   displayed"), `read_page`'s accessibility tree comes back empty (0x0
   viewport), and **`requestAnimationFrame` callbacks never fire at all**
   (confirmed: 0 callbacks in a 2-second test). This is why the track map
   needed a synchronous first paint before entering its rAF loop — without
   it the canvas would stay blank forever in a context like this one. When
   verifying anything in this environment: use `get_page_text`,
   `read_console_messages`, `read_network_requests`, and direct
   `javascript_tool` DOM/pixel inspection (e.g. `canvas.getContext('2d').
   getImageData(...)` to check non-empty pixels) — not screenshots, not
   `read_page`, and don't trust rAF-driven behavior to run at all. Layout
   bugs specifically (like #5 above) may need the *user's* real browser to
   catch, since this pane can silently fail to reproduce them. Two more
   confirmed members of this same bucket: `ResizeObserver` never fires
   either (isolated with a bare test `<div>`, not just app code — see the
   race progression chart's entry above for the fix pattern: seed the
   measurement synchronously, don't rely on the observer's first callback),
   and `document.hidden` is permanently `true` in this pane (confirmed
   directly; `tabs_select`/"focusing" the pane doesn't clear it) — Chromium
   throttles `setInterval`/`setTimeout` hard in a backgrounded tab, so
   anything timer-cadence-sensitive (the live-timing DVR buffer's 100ms
   catch-up ticker is the current example) will look artificially slow or
   stuck here even when the underlying logic is correct. When a feature's
   correctness depends on a timer firing at its intended rate, verify the
   *mechanism* (e.g. does the action that's supposed to instantly clear a
   backlog actually clear it?) rather than the *steady-state rate* in this
   pane, and note the gap for a real-browser recheck. A fourth confirmed
   member: plain CSS `@keyframes` animations (the splash screen's F1
   starting lights, e.g.) attach correctly (`animationPlayState: running`,
   correct name/delay/duration/fill-mode, CSS parses with zero dropped
   declarations) but never visually advance past frame 0 here — same root
   cause, no compositor frames being produced at all. `Element.getAnimations
   ()[0].finish()` (Web Animations API) still works as a way to check an
   animation's *end state* is correct without needing real frame
   advancement — use that instead of trying to observe the animation play.
   A fifth: `<video>` seeking is also broken — scrubbing a locally-recorded
   screen capture to any timestamp returns the same pre-navigation frame
   every time (confirmed across two capture methods), so a user-supplied
   recording can't be reviewed frame-by-frame here either. If a user shares
   a recording to show a bug/result, don't burn time trying to scrub it in
   this pane — ask them to describe it or share stills instead. A sixth,
   found while building the 3D track map: a react-three-fiber `<Canvas>`
   can't render even *one* frame here (stricter than the plain-canvas/CSS
   cases above, which could at least force a synchronous first paint) —
   R3F's whole render loop, including frame zero, is scheduled via rAF
   internally with no hook to bypass it. Its `ResizeObserver`-based
   auto-sizing is also silent here, but does have a `window`-resize
   fallback path that isn't broken — dispatching a synthetic
   `window.dispatchEvent(new Event('resize'))` after mount correctly
   triggers R3F to measure and resize the canvas to its real container
   size, which is a useful unstick if a WebGL canvas seems stuck at the
   default 300×150. To verify a Three.js scene's *contents* here (as
   opposed to its rendered pixels), temporarily wire `<Canvas onCreated=
   {(state) => { window.__debug = state }}>`, walk `state.scene.traverse()`
   to inspect real geometry/materials/positions, then remove the hook
   before finishing — don't leave it shipped.

---

## Verified-working state (as of the last session)

Live-tested against the real backend's actual data (a completed Dutch GP
race replay) with zero console errors: full leaderboard with correct sector
colors/tyres/PIT/DNF/gap columns, weather panel, race control feed (empty
for this session — see the code comment in `store.ts` on why that's a
faithful port of a real Flutter-app asymmetry, not a bug), pit stops, team
radio with transcripts, fastest-lap overlay wiring, and the track map's data
pipeline (position interpolation engine confirmed producing non-empty canvas
output via pixel inspection, though the *visual* layout bug in gotcha #5 was
only caught by the user's own browser, not this session's testing pane —
after that fix, re-verify in a real browser before trusting it further).

Every page passes `npx tsc --noEmit` and `npm run lint` clean — treat any
new code that doesn't as unfinished, not "good enough."
