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
   pane, and note the gap for a real-browser recheck.

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
