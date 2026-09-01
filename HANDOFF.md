# GridBeat — Handoff

Orientation for anyone (human or model) picking this up cold. It is the
**map and the judgment**, not a repeat of the detail: `CLAUDE.md` in each
repo is the authority on that repo's specifics and is long for good reason.

**Read in this order:**

1. This file — topology, design concepts, working agreements.
2. `GridBeat-Web/CLAUDE.md` — the web app's status, architecture, and the
   six numbered **Gotchas**. The gotchas are not optional reading; most of
   them cost hours to find and every one is still live.
3. `GridBeat-Web/ROADMAP.md` — the tracker. Phases 1–2 done, Phases 3–5 open.
4. `f1-stats-api/CLAUDE.md` — the backend, its deploy steps, and its own
   hard-won rules.

---

## 1. The three repos

All under `/Users/sajjad/Documents/Projects/GridBeat/`:

| Repo | What it is | Git |
|---|---|---|
| `gridbeat` | The **Flutter app**. The original product, and the design/behaviour reference for everything on the web. | git repo |
| `GridBeat-Web` | The **Next.js 16 web dashboard + marketing site**. Where most active work happens. | `github.com/CodesBySA/GridBeat-Web` |
| `f1-stats-api` | The **backend**: Postgres + PostgREST + Python ingest, on an Oracle VM. | `github.com/CodesBySA/f1-stats-api`, but the server copy is **not** a git checkout — deploy by `scp` |

The web app is a **port, not a wrapper**. Same backends, same design
language, new desktop-first UI. When extending a feature, open the Flutter
source it was ported from before guessing at field names — every
`lib/api/*.ts` and `lib/models/*.ts` names its source file in a docstring.
The backends are shared, so the Dart parsing logic is usually still correct
and just needs syntax translation.

Mobile patterns get **translated, not copied**: the Flutter app's modal
bottom sheets become tabs, popovers, or native `<select>` dropdowns on
desktop. That is a deliberate, repeated decision, not drift.

---

## 2. Design concepts

This section is the part that exists nowhere else. It is what the user
actually means by "sexy", learned across many rejected iterations.

### The bar

The user rejects **generic** above all. Real rejections, verbatim: *"the
home page is fucking generic"*, *"looks too generic"*, *"dont be generic"*,
*"dont embarrass yourself"*. What passed, and why:

- **Show the product, don't describe it.** The homepage hero *is* a live
  20-row timing wall running behind the brand — not a screenshot beside a
  paragraph. Sector bars fill yellow→green→purple, lap times land, and when
  a gap closes the two rows physically swap.
- **Real data or modelled data, never fake data.** See §3.
- **Structure that means something.** The homepage spine is one lap of
  Suzuka driven by scroll, with feature groups arriving as each sector
  lights up — *three* sectors because a lap genuinely has three, not
  decorative `01 / 02 / 03` numbering.
- **Craft in the small stuff.** `PhoneFrame` is a real device frame —
  brushed titanium rail with a multi-stop gradient so edges catch light,
  bezel inset, Dynamic Island, diagonal glass reflection, side buttons.
  Everything sized in **percentages of frame width**, so one component is
  sharp at a 96px thumbnail and a 260px hero.

### Tokens

Ported from the Flutter app's `app_colors.dart` / `app_theme.dart` into
`src/lib/theme/colors.ts` + `src/app/globals.css`. Use the CSS variables
(`--color-primary`, `--color-surface`, `--color-text-muted`, …) — never
hardcode a hex in a component.

**Fonts:** `Formula1` is the default and covers nearly all UI (nav, tables,
headers, labels). `Evangelion` maps to exactly one Flutter style (`body`,
18sp) and looks blurry as dense small text — do not promote it to a
default. `body`'s `font-family` must stay `var(--font-f1)` first.

**Team colours follow the entity, never the rank.** A filter that changes
which drivers are shown must not repaint the survivors. Where the live feed
provides a per-driver `teamColorHex`, prefer it over the static table.

### Motion

`motion` (motion.dev v13, `motion/react`) is the animation library.

- Reorder animations come from Motion's `layout` prop — an array reorder
  becomes the same slide the real timing tower does on an overtake.
- **SVG draw-on uses Motion's native `pathLength`**, never a hand-rolled
  `strokeDasharray` in `style`. Motion owns the whole `style` object once a
  MotionValue is in it, so a static dasharray alongside one never updates —
  this silently produced a line that never drew.
- Deterministic initial state, motion starts after mount — otherwise
  hydration mismatch (gotcha #4).
- Respect `prefers-reduced-motion`.

### Charts

Recharts (already a dependency) for standard charts; hand-rolled SVG when
the shape is bespoke (the telemetry trace, the quali→race bump chart).
**Prefer SVG over `<canvas>`** for new chart work — it sidesteps the
canvas + `ResizeObserver` feedback-loop bug class in gotcha #5 entirely.

The `dataviz` skill's validator was run on the championship palette: CVD
ΔE 24.6, normal-vision 35.0, contrast ≥3:1 all pass. The lightness-band
check **fails** because McLaren papaya and Mercedes petronas are genuinely
bright — kept anyway, because team identity is non-negotiable semantics,
and mitigated with direct labels + logos so identity is never colour-alone.
If you add a chart, do the same: validate, then justify any deliberate fail.

### Responsiveness

Every screen size, always — the user asks for this explicitly and checks.
Add `min-w-0` to flex items holding wide content (gotcha #5). Wide content
scrolls inside its own container; the page body never scrolls sideways.

---

## 3. The data-honesty rules

These are product rules, not preferences. Breaking them is a bug.

1. **Never link out to official sources.** GridBeat does not hand the user
   off to fia.com or anywhere else — every document renders natively from
   parsed fields. This is durable and repeatedly reaffirmed.
2. **Never invent data.** The homepage's session strip reads the real
   WebSocket and falls back to the next scheduled round — it never claims
   `LIVE` when it isn't. The `TowerWall` uses the real leaderboard when a
   session exists and skips its simulation timer entirely in that case.
3. **Model honestly, and say so.** The Monza telemetry trace is *derived* —
   real centreline geometry, real corner radii, a real lateral-grip +
   braking + traction model, labelled as a model and never as a captured
   session. Its braking events land on the real corners on their own; the
   labels were placed *after* checking they matched.
4. **Verify before declaring data missing.** Render the actual source
   before telling the user something isn't extractable. This rule exists
   because a whole formatting saga was spent on heuristics before anyone
   opened the PDF and found the rows were intact all along.
5. **Simulated pace must be plausible.** An early tower had P1 routinely
   slower than P6; it read as noise. Lap time now rises with position, with
   one purple run per lap.

---

## 4. Architecture

### Web app

```
src/
├── app/                    # routes (App Router), one folder per page
│   ├── live/               # Tower / Comms / Map / Telemetry tabs
│   ├── stewards-room/      # WEEKEND · POINTS · GRID · TYRES · UPGRADES
│   ├── stats/[metricKey]/  # dynamic leaderboard
│   └── api/                # x-posts proxy, fia-doc layout fallback
├── components/{layout,live,home,stewards,providers}/
├── hooks/use-mounted.ts    # hydration gate — use on every client-fetched page
└── lib/
    ├── api/                # backend clients (one file per backend)
    ├── live/               # store.ts (Zustand WS machine), websocket-client.ts
    ├── models/             # TS ports of the Flutter data/models/*.dart
    ├── home/               # baked circuit paths + derived telemetry
    └── query/              # ttl.ts (staleTime table), query-client.ts
```

**State:** TanStack Query for all REST reads, staleTimes in
`lib/query/ttl.ts` mirroring the Flutter `cache_service.dart` table.
Zustand for live timing (`useLiveTimingStore`) — a singleton, app-wide,
matching the Flutter provider lifetime. Pages call `connect()` on mount and
never disconnect on unmount.

`retry: false` is set globally and is **load-bearing** — retries could get
stuck in `fetchStatus: 'paused'` forever in this environment, hanging the
UI on a spinner. Don't re-enable without re-testing that failure mode.

### Backends

| Source | Env var | Used for |
|---|---|---|
| f1-stats-api (PostgREST) | `NEXT_PUBLIC_STATS_API_BASE_URL` = `https://f1stats.5928104.xyz` | schedule, standings, archives, stats, hall of fame, FIA documents |
| gridbeat-backend (live) | `NEXT_PUBLIC_LIVE_API_BASE_URL` / `_WS_URL` | live timing WS + REST bootstrap |
| Jolpica | `NEXT_PUBLIC_ERGAST_BASE_URL` | race/qualifying results, pit stops |
| OpenF1 | `NEXT_PUBLIC_OPENF1_BASE_URL` | qualifying sector / speed-trap detail |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | driver/constructor/circuit bios |
| MultiViewer | hardcoded in `lib/api/multiviewer.ts` | circuit track geometry |
| ESPN | hardcoded in `lib/api/news.ts` | news articles |
| twitterapi.io | server-only `TWITTER_API_KEY` via `/api/x-posts` | X posts |

The web app deliberately uses `f1stats.5928104.xyz` while the Flutter app
uses `f1stats.8582003.xyz`. **This difference is intentional and
user-confirmed** — don't "fix" it.

**`config.ts` validates every env var eagerly at module load.** A blank
`NEXT_PUBLIC_SUPABASE_URL` 500s *every* page, not just the ones that use
Supabase. Env is not hot-reloaded — restart the dev server after editing
`.env.local`.

**Security:** the twitterapi.io key must stay server-side, behind
`/api/x-posts`. The Flutter app ships it client-side with a comment
flagging it as temporary; the proxy exists specifically to fix that. Don't
regress it.

### PostgREST notes

22 tables. `count=exact` returns totals in `Content-Range`. Embedded
relations work (`fia_decisions(season,round,title,races(race_name))`).
**There is no `DISTINCT`** — fold client-side (see `getFiaRounds`). Always
give `order` a unique tiebreak (`published_at.desc,id.desc`); without one,
identical requests can return different rows under `limit`.

---

## 5. Deploy runbooks

### f1-stats-api → Oracle VM

```bash
ssh -i "/Users/sajjad/Documents/Oracle Server/ssh-key-2026-07-04.key" ubuntu@100.114.14.60
```

The key must be mode `600`. `~/f1-stats-api` is a symlink to
`/data/gridbeat/f1-stats-api`. Python 3.12 in `./venv`; **`pymupdf` is not
in the system Python** — always use `./venv/bin/python`.

- **Python change:** `scp` the file to `ubuntu@100.114.14.60:~/f1-stats-api/`.
  Takes effect on the next sync run; nothing to restart.
- **Schema change:** the documented flow is `scp schema.sql` then
  `psql < schema.sql` (idempotent). For a single additive column it is
  lower-risk to run just that one `alter table ... add column if not
  exists` and still `scp` the file so it stays the source of truth.
  Either way, follow with `notify pgrst, 'reload schema';` — PostgREST
  caches the schema and will not serve a new column without it.
- **Order matters:** add the column *before* deploying code that writes to
  it. The FIA sync runs every 10 minutes and will hit it.
- **Postgres:** `docker exec -i f1stats_postgres psql -U f1stats -d f1stats`
- **Scripts run outside systemd need the unit's env:**
  `cd ~/f1-stats-api && set -a && . ./.env.sync && set +a && ./venv/bin/python <script>.py`
  Without it psycopg falls back to a local socket and fails.
- **Timers:** `f1-fia-sync.timer` every 10 min (FIA documents),
  `f1-sync.timer` hourly (everything else).
  Check with `sudo systemctl start f1-fia-sync.service` +
  `journalctl -u f1-fia-sync.service -n 20 --no-pager -o cat`.

### GridBeat-Web → `f1box`

Self-hosted Docker on the same VPS as the live API (SSH alias `f1box`).
That box has **only the legacy `docker-compose` binary** — use
`sudo docker-compose build` / `up -d`, not `docker compose`. Served at
`webapp.5928104.xyz` through a dashboard-managed Cloudflare Tunnel.

`.env.production` (public `NEXT_PUBLIC_*`, baked in at **build** time) and
`.env` (just `TWITTER_API_KEY`, supplied at **runtime**) are separate on
purpose — don't collapse them. The VPS copy was `scp`'d, not `git clone`d,
so it will drift from GitHub unless you re-tar or switch it to `git pull`.

---

## 6. Working agreements

How the user actually works, learned across the project:

- **They check the real browser and send screenshots.** This pane misses
  layout bugs entirely (gotcha #6). Assume anything visual is unverified
  until they confirm it or you've proven it via DOM geometry.
- **"Do all of it" means all of it.** When they ask for a feature ported,
  they mean every referenced sub-component too: *"if any components are
  being referenced, go to that component implementation and implement those
  too"*.
- **They will push back on hedging and on generic output.** Ship the real
  thing.
- **Read the app's code rather than running the simulator** — *"the
  simulator takes too many tokens"*.
- **The bar for "done"** is `npx tsc --noEmit` + `npm run lint` +
  `npm run build` all clean, plus a real-browser check. Code that doesn't
  pass all three is unfinished, not "good enough".
- **Fix root causes upstream.** The FIA document work is the model: the
  client-side workaround shipped first because it unblocked the user, but
  the real fix went into the ingest so every client benefits.

---

## 7. Environment limits (this pane, not the product)

Full detail is gotcha #6 in `CLAUDE.md`. The short version: **this testing
pane does not composite frames.** Confirmed broken here:

`requestAnimationFrame` · `ResizeObserver` · `setInterval` cadence
(`document.hidden` is permanently `true`) · CSS `@keyframes` visual
advancement · `<video>` seeking · react-three-fiber (cannot render even
frame zero) · screenshots · `read_page`

Consequences: seed every measurement synchronously before attaching an
observer; verify *mechanisms* (does skip-to-live clear the backlog?) rather
than *rates*; use `get_page_text`, `read_console_messages`,
`read_network_requests` and `javascript_tool` DOM inspection instead of
screenshots; use `el.getAnimations()[0].finish()` to check an animation's
end state. `document.scrollWidth` can also go **stale** after heavy DOM
mutation — a 170px "overflow" was chased here that did not exist, so
corroborate an overflow with `body`/`main` measurements and an actual
scroll attempt before believing it.

---

## 8. What landed most recently

**Race Details, `/race-details/[raceId]`** (Roadmap Phase 2 — done).

The schedule and Race Archives pages used to dead-end: a race row linked
nowhere. This is a full port of `race_details_screen.dart` (3333 lines) —
six tabs (SCHEDULE, PRACTICE, SPRINT, QUALIFYING, RACE, CIRCUIT), same
"time passed, not data-presence" visibility rule the Flutter version uses.
`raceId` is `${season}-${round}` — this app's own primary key for a race
everywhere else.

New: `lib/api/stats-api.ts` (`getFullRaceResults`/`getFullSprintResults`/
`getFullQualifyingResults`/`getFullPracticeResults`/`getPitStops`/
`getLapLeaders`), `lib/models/race-details.ts` (row parsers + the
interval/gap-to-leader math, ported carefully as two *different*
formatters — easy to conflate, the Flutter source has separate ones), and
`components/race-details/` (one shared `ResultRow` shell reused across
RACE/SPRINT/PRACTICE/QUALIFYING instead of four copies).

Two things exist that have never existed in the Flutter app either: a full
pit-stop list, and a **leaders-by-lap timeline** off `lap_leaders` — a
35,313-row table with zero UI anywhere before this (consecutive same-driver
laps merged into colored stints).

Two real, pre-existing upstream bugs surfaced during verification, both
fixed:

- `getSchedule()` filtered `/races` by `season` but never selected the
  column — every `F1Race.season` was `""` since this function existed;
  harmless until this route's links were the first code to ever read it,
  at which point every click 404'd to `/race-details/-1`. Added `season`
  to the select list.
- A lapped/retired driver's `time_millis` isn't comparable to the leader's
  (confirmed live: R12 2026, Albon retired lap 66/72 with a *smaller*
  recorded time than the leader's 72-lap total) — the raw diff went
  negative, and JS's `%` keeps the dividend's sign (Dart's doesn't, which
  is why the original Flutter code never surfaced this), producing a
  literal `+-35.530` in the GAP TO LEADER tile. Fixed at both the display
  layer (route DNF/DNS/DSQ/DNQ/lapped rows to the status word instead of
  the raw diff) and the formatter itself (`Math.abs()` as defense in
  depth).

One more bug found and **deliberately not fixed here** — it's a backend
ingest issue, not a frontend one: every 2026 `practice_results` row for Max
Verstappen is attributed to `driver_id=vergne` (Jean-Éric Vergne) because
the `drivers` table's `vergne` row carries Verstappen's real code `"VER"`
instead of Vergne's actual `"JEV"`. 30 rows, all 12 rounds. Confirmed live
via the API and spun off as its own task with full repro — don't re-derive
this investigation if it comes up again; check whether that task landed.

Verified against real 2026 season data across all six tabs in a fresh
browser tab (isolated from prior-page console noise per gotcha #6):
`tsc` + `lint` + `build` clean, zero console errors, real classification/
qualifying/practice/sprint data rendering with correct gap math, the OpenF1
sector-time click-to-expand working, the lap-leaders chart rendering real
lead changes, both link entry points (Schedule hero + table rows, Race
Archives table rows) resolving correctly.

---

**Earlier: the FIA document layout fix, end to end** (roadmap item 1.10).

The problem: `fia_decisions.raw_text` is each PDF's text in pymupdf's
reading order, which for a table is **column-major**. `ROUND No.`, `R12`,
`VENUE`, `Zandvoort` arrive as four unrelated lines. The row structure was
destroyed before it was ever stored, so every client-side heuristic
attempted (median line length, blank-line runs, fragment-run grouping) was
doomed by construction.

The fix, in `f1-stats-api/fia_docs.py`:

- `_extract_rows()` rebuilds rows from glyph positions and stores them in a
  new `fia_decisions.content_rows` jsonb column. `raw_text` is untouched.
- `_letterhead_lines()` identifies cover fields by **diffing
  `_strip_letterhead()`'s input against its output**, rather than
  re-matching labels — the letterhead has at least two different row
  layouts and hand-matching both invites false positives.
- `_PROJECTIONS` picks the row axis from `page.rotation`. `get_text()`
  reports unrotated coordinates even on a `/Rotate` page, so the 90-degree
  championship-points sheets need grouping by x, not y.
- `test_extract_rows.py` builds its own PDFs — no network, no fixtures.
- `backfill_fia_rows.py` fills existing rows; idempotent and resumable.

Web side: `DocPage` moved into `lib/models/fia-docs.ts` as
`{ page, rows: string[][] }`, matching the column exactly. `/api/fia-doc`
was changed to emit that same shape so there is **no adapter**, and it is
now only a fallback — `PdfLayout` takes optional `pages` and sets the query
`enabled: false` when the API already supplied them.

Verified: 60 distinct document types extract with zero errors; the PU
elements, Pirelli compound, entry list and championship points tables all
read as real rows; sync service green; PostgREST serving the column;
`tsc` + `lint` + `build` clean.

**Backfill: complete.** 927/927 documents have `content_rows` populated.
Confirmed in the browser: opening the Pirelli Preview document produced
**zero** `/api/fia-doc` requests — the stored column is what's rendering,
with the route now genuinely just a fallback for anything ingested after
this point that hasn't synced yet (there shouldn't be any, since
`sync_fia.py` now writes `content_rows` on every new document going
forward).

---

## 9. Where to pick up

`ROADMAP.md` is the tracker and has the detail. Phases 1 and 2 are done. In
order from here:

- **Phase 3 — fill the thin pages.** Schedule, Standings, Results, Circuit
  Guide, the Stats hub (114 metrics behind it), Hall of Fame, driver and
  constructor details all render a fraction of what the app does.
- **Phase 4 — Learn F1** (`/learn`, `/learn/penalties`, `/evolution`,
  `/tyres`).
- **Phase 5 — polish.** Skeletons, empty states, a responsive pass, OG
  tags, and one open decision: the homepage opens a live WebSocket for
  **every visitor**, not just `/live` users. Re-weigh that before a public
  launch.

Also open, smaller: the PU-elements allocation view deferred from Phase 1,
and `PhoneFrame` still renders a CSS recreation because the user's real app
screenshots never landed — it already takes a `screenshotSrc` prop, so
dropping the images in is the whole job.
