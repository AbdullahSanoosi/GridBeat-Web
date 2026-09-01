# GridBeat Web — Parity Roadmap

Bringing the web dashboard to parity with the Flutter app at
`../gridbeat`, using the same backends. This is the working tracker: update
the status boxes as work lands, and keep the gap table honest.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Where things actually stand

Line counts are a rough proxy for how much screen a feature has, not a
quality measure — but the shape of the gap is real.

| Feature | Flutter | Web | State |
|---|---:|---:|---|
| Stewards' Room (`fia_docs`) | 3811 | 900 | **Phase 1 done** |
| Race Details (`/race-details/:id`) | 3333 | 1731 | **Phase 2 done** |
| Learn F1 hub + chapters | 1058 | — | **No web route** |
| Circuit Guide detail | 1853 | 314 | **Phase 3 done** |
| Circuit Guide index | 768 | 282 | **Phase 3 done** |
| Driver details | 2463 | 617 | Thin |
| Constructor details | 1798 | 431 | Thin |
| Results / archives | 995 | 281 | **Phase 3 done** |
| Standings | 811 | 286 | **Phase 3 done** |
| Schedule | 782 | 278 | **Phase 3 done** |
| Stats hub | 526 | 118 | **Phase 3 done** |
| Hall of Fame (3 screens) | 1427 | 255 | **Phase 3 done** |
| News | 478 | 126 | Thin |
| Live Timing | 2634 | 369 | **At parity** |
| Race progression | 421 | 137 | At parity |
| Stats leaderboard | 326 | 118 | At parity |
| Car Viewer, Onboarding, Settings, Notifications | 3291 | — | Out of scope (mobile-only) |

### Backend surface the web app does not touch yet

All live on the stats API (`f1stats.5928104.xyz`, PostgREST, 22 tables):

| Table | Rows | Used by web? |
|---|---:|---|
| `lap_leaders` | 35,313 | No |
| `practice_results` | 3,947 | No |
| `fia_decisions` | 1,507 | Yes — Phase 1 |
| `sprint_results` | 590 | No |
| `grid_entries` | 481 | Yes — Phase 1 |
| `car_upgrades` | 401 | Yes — Phase 1 |
| `penalty_points` | 27 | Yes — Phase 1 |
| `tyre_notices` | 22 | Yes — Phase 1 |
| `computed_stats` | 58,331 | Partially — 114 metric keys exist, the Stats hub surfaces a handful |

---

## Phase 1 — Stewards' Room `/stewards-room`

The single biggest gap: a complete feature with ~1,950 rows behind it and
no web presence at all. Source: `fia_docs/presentation/fia_docs_screen.dart`
(3811 lines), `fia_docs/providers/fia_docs_provider.dart`, models in
`fia_docs/data/models/`.

Five tabs, matching the app: WEEKEND · POINTS · GRID · TYRES · UPGRADES.

- [x] **1.1** API client — `lib/api/fia-docs.ts` covering `fia_decisions`,
      `penalty_points`, `tyre_notices`, `car_upgrades`, `grid_entries`,
      plus `getFiaRounds` for the weekend selector
- [x] **1.2** Models — `lib/models/fia-docs.ts`, ported from
      `fia_docs_models.dart` / `weekend_timeline.dart`
- [x] **1.3** Route shell + tab bar + weekend selector, sidebar link
- [x] **1.4** WEEKEND tab — decision timeline, day by day, category filters,
      superseded provisionals folded away
- [x] **1.5** POINTS tab — Super Licence danger zone with per-award ledger
- [x] **1.6** GRID tab — the real starting grid from the `starting_grid`
      documents (position, driver, team, the qualifying time that earned the
      slot, pit-lane starters), laid out staggered like a real grid, with
      each of the weekend's grids selectable. `grid_entries` is the *entry
      list* — who may start, a different question — so it's the fallback
      shown only before a grid is published.
- [x] **1.7** TYRES tab — nominated compounds + per-axle pressure/camber
- [x] **1.8** UPGRADES tab — car upgrade filings per team
- [x] **1.9** Verified against live data (R12 Dutch GP: 73 documents, 22 cars,
      13 drivers carrying points, 23 upgrade items from 6 teams); no overflow
      at 320px on any tab; `tsc` + `lint` + `build` clean

**Two things worth remembering from this phase:**

1. `pressure_camber` nests **axle → compound → limits**
   (`{front: {slick: {min_start_psi, camber_limit_deg, min_expected_psi}}}`),
   not the flat `{front: {min_start_pressure, max_camber}}` the Dart model's
   field names suggest. Caught by probing the live API before building UI.
2. Penalty points sum `points_awarded` across non-expired awards — **not**
   the FIA's `running_total`. Live data proves why: Bearman's `running_total`
   reads 10 against a true active total of 4. Note that
   `stats_api_service.dart`'s own comment still says to prefer
   `running_total`; it is stale, and `fia_docs_provider.dart` supersedes it.
   The Flutter `PenaltyPointsEntry.hasUnseenAwards` is consequently dead
   (`activePoints` and `awardsOnRecord` are assigned the same value), so it
   wasn't ported.

**Fixed after first review (all three found by looking at real payloads):**

- `complianceChecks` split `notes` on newlines *and* bullets, so the PDF's
  whole letterhead (title, date, recipients, "Pstartf:") rendered as bogus
  checks. `•` is the only reliable anchor — split on that alone and drop
  everything before the first bullet. Bullets wrap mid-sentence, so collapse
  whitespace rather than treating it as a delimiter.
- Document bodies were gated on `fact || decision || reason`, which hid 48 of
  73 documents that carry only `raw_text` or `content_data`. Every document
  has *something* (verified: 73/73), so `doc-detail.tsx` now renders each
  `content_data` type as a real table — race/practice/qualifying
  classifications, starting grids, championship points, PU elements, parts
  replaced, lap-time tables — and falls back to the text layer otherwise.
  67 of 67 visible documents now open.
- POINTS tab relabelled PENALTY POINTS.
- Document bodies rendered as one collapsed wall of prose.
  `formatted-text.tsx` classifies lines into **headers** (all-caps ≤14 words,
  or a short line ending in `:`), **bullets** (`•`/`-`, including the
  marker-on-its-own-line form) and **paragraphs**, per the Flutter
  `_parseTextBlocks` / `_FormattedText` pair, with red small-caps field
  labels from `_DetailFieldLabel`.

  **The important part isn't in the Dart version.** Porting the parser
  straight across still produced a wall, because these documents come in two
  populations and only one of them has paragraphs. Measured over all 207
  raw-text-only documents in the season, **median line length** separates
  them cleanly:

  | Shape | Median line | Count | Example | Handling |
  |---|---:|---:|---|---|
  | PROSE | 57–99 | 121 | Self Scrutineering, Race Director's Notes | wrapped lines merge into paragraphs |
  | FRAGMENT | 3–10 | 86 | Power Unit Information, Entry List, Competition Visa | every line is one table cell — merging is destructive |

  A first attempt discriminated on *"does the document contain a blank
  line"*; that barely worked, because **82% have blank lines either way**.
  Median line length is the real signal — the two populations don't overlap.

  In FRAGMENT documents headers and bullets still render as themselves (the
  Pirelli notice is fragment-shaped but carries 17 genuine bullets); only
  runs of ≥4 bare cells collapse into a responsive 2/3/4-column grid, which
  turns a 122-row tower into a scannable block. A line resuming in lowercase
  is wrapped continuation in both modes, reuniting "its correspondent
  interval" with its bullet. Empty blocks are dropped (a bullet marker
  followed immediately by another was emitting a bare dot).

  Verified on real R12 data: Power Unit Information 132 blocks, longest 80
  chars (was ~800), 0 empty; Pirelli 17 bullets with the wrapped one joined;
  Self Scrutineering still merges to 6 prose blocks with a 405-char paragraph
  intact.

- **Finally: rebuild forms and charts from the PDF's own layout.** Opening
  the source PDFs with PyMuPDF showed the row structure is intact in the
  file — `ROUND No. ┃ R12`, `VENUE ┃ Zandvoort`,
  `Compound ┃ FL ┃ FR ┃ RL ┃ RR` — and that `raw_text` is that table
  flattened **column-major**, which is why no amount of text heuristics
  could recover it. It was never a formatting problem; the rows were gone
  before the text reached the database.

  `/api/fia-doc` (route + `unpdf`) now fetches the PDF server-side —
  fia.com sends no CORS headers, so the browser can't — extracts positioned
  text runs, and regroups them into rows (baseline y, 3pt tolerance) and
  cells (x gap > 10pt, with sub-gaps preserved as spaces so
  "Overtake notactive" doesn't happen). `pdf-layout.tsx` renders those rows:
  a single wide cell is a heading or sentence, several cells are a table
  row. Page 1 is skipped — every FIA document opens with a cover sheet whose
  From/To/Date/Title metadata already lives in columns.

  Guards: only `www.fia.com` over https is fetchable (**SSRF** — the `url`
  arrives via the client even though it originates in a `pdf_url` column;
  verified a non-fia host returns 403), 20s timeout, and `Cache-Control:
  max-age=86400` plus `staleTime: Infinity` client-side since a published
  document never changes. The flattened text stays behind a
  `SHOW EXTRACTED TEXT` toggle as a fallback for PDFs that can't be read.

  Verified: Power Unit Information returns 57 real rows and renders the
  genuine 7-column table
  `8.5 MJ | 9.0 MJ | 7.5 MJ | 9.0 MJ | 9.0 MJ | 2411 m | 100 kW/s`.

  Residual noise is honest and irreducible: a power-curve *graph*'s axis
  labels ("350", "300", "(kW)") are text in the PDF, so they appear.

- [x] **1.10 The upstream fix — landed, this is now the real path.**
  `fia_docs.py` gained `_extract_rows()` and stores the rebuilt rows in a
  new `fia_decisions.content_rows` column, so every client gets the real
  layout straight from the API with no PDF refetch. `raw_text` is untouched.
  927 existing documents backfilled via `backfill_fia_rows.py`.

  Two bugs the web-side prototype had, both fixed upstream and worth not
  re-introducing here: **page 0 must not be skipped** (only the pure-table
  document family has a letterhead-only first page; everything else starts
  its body there, and skipping it truncated a scrutineering report
  mid-sentence), and **rotated pages need their own row axis** (the
  90-degree championship-points sheets have rows running down x, so
  grouping by y shredded them into one-word fragments — `Page`, `de`,
  `QAT`). Details in `../f1-stats-api/CLAUDE.md`.

  Web side: `DocPage` now lives in `lib/models/fia-docs.ts` with
  `rows: string[][]`, matching the column exactly — `/api/fia-doc` was
  changed to emit the same shape so there is no adapter. `PdfLayout` takes
  optional `pages`; when the API supplied them the query is `enabled:
  false` and nothing is fetched. The route stays as the fallback for any
  document whose `content_rows` is null.

- **Then: stop showing the raw text layer at all by default.** Fixing the
  formatting made the dump *tidier*, not *wanted* — most of these PDFs are
  letterhead and chart labels, and rendering them buried the two or three
  sentences that matter. The detail view now mirrors the app's sheet
  exactly: `DOC n` chip, session in the category colour, publish time, a
  bold title, `ISSUED BY …`, a red driver pill (`#55 · Carlos Sainz`), then
  **FACT / DECISION / REASON** and any structured table. The raw text layer
  survives behind a `SHOW RAW TEXT` toggle, offered only for documents with
  no parsed fields and no structured content. Power Unit Information opened
  to 2,281 characters of noise; it now opens to 184 with the dump one click
  away.

**Deferred from Phase 1:** the PU-elements allocation view
(`pu_allocation.dart`, `puUsageProvider`) — it reads a parsed
`content_data` sheet off a decision rather than its own table, and belongs
with the TECH document rendering rather than a tab of its own.

> Never link out to fia.com — every document renders natively from parsed
> fields. This is a durable project rule.

## Phase 2 — Race Details `/race-details/[raceId]` — done

Source: `schedule/presentation/race_details_screen.dart` (3333 lines).
`raceId` is `${season}-${round}` — this app's own primary key for a race
everywhere else, not a raw Jolpica id the schema doesn't carry.

- [x] **2.1** Route + data layer — `getFullRaceResults`/`getFullSprintResults`/
      `getFullQualifyingResults`/`getFullPracticeResults`/`getPitStops`/
      `getLapLeaders` added to `lib/api/stats-api.ts`; models + gap/interval
      math ported to `lib/models/race-details.ts`. Reuses `F1Driver`/
      `F1Constructor`/`driverFromRow`/`constructorFromRow` from
      `standings.ts` (both now exported) instead of a third copy.
- [x] **2.2** Banner — bundled circuit asset (`bundledCircuitImage()` in
      `components/race-details/circuit-asset.tsx`), not the network SVG —
      the durable boundary from `../gridbeat/CLAUDE.md` holds: only the
      CIRCUIT tab uses `image_url`.
- [x] **2.3** RACE tab — full classification, grid → finish deltas, winner
      hero + podium + fastest-lap/pit records, per-row interval/gap/
      fastest-lap tiles.
- [x] **2.4** QUALIFYING tab — Q1/Q2/Q3 splits, pole highlight, click-to-
      expand OpenF1 sector times + speed trap (`fetchSectorDetail`, ported
      from `openF1QualifyingProvider`).
- [x] **2.5** PRACTICE tab — FP1/FP2/FP3 (or FP1/SQ on a sprint weekend)
      sub-tabs, gap-to-fastest math. 3,947-row `practice_results` now has a
      UI for the first time.
- [x] **2.6** SPRINT tab — conditional on sprint weekends, trimmed banner/
      rows (no time/fastest-lap columns — `sprint_results` never had them).
- [x] **2.7** PIT STOPS + LAP LEADERS — **new, no Flutter equivalent**: the
      app only ever surfaced the *fastest* pit stop; this adds the full
      stop list. `lap_leaders` (35,313 rows, zero UI in either app before
      this) now renders as a segmented lap-by-lap leader timeline —
      consecutive same-driver laps merged into stints, colored by team.
- [x] **2.8** CIRCUIT tab — network SVG (`image_url`, plain `<img>` since
      the host isn't in `next.config`'s `remotePatterns` and next/image
      additionally requires `dangerouslyAllowSVG` for SVGs) + spec chips +
      link to the full `/circuits/:id` guide rather than duplicating it.
- [x] **2.9** Linked from the Schedule hero card + table rows and the Race
      Archives table rows (both via `router.push`, row-level `onClick`).
- [x] **2.10** Verified against live 2026 data across every tab.

**Two real bugs found and fixed during verification, both upstream of the
new UI, not introduced by it:**

- `getSchedule()` filtered `/races` by `season` but never *selected* it, so
  every `F1Race.season` was `""` — harmless until something finally read it
  (my new `${season}-${round}` links), at which point every schedule-page
  link 404'd to `/race-details/-1`. One-line fix: added `season` to the
  select list.
- A driver's `time_millis` isn't comparable to the leader's once they're
  lapped or retired (confirmed live: R12 2026, Albon retired lap 66/72 with
  a *smaller* elapsed time than the leader's 72-lap total) — diffing them
  went negative, and JS's `%` (unlike Dart's, which the original
  `_fmtGapMs` relied on) keeps the dividend's sign, so the GAP TO LEADER
  tile rendered `+-35.530`. Fixed two ways: `RaceResultRow` now routes the
  DNF/DNS/DSQ/DNQ/lapped status word to that tile instead of the raw diff
  (widened from only catching "+N Laps"), and `fmtGapMs` itself takes
  `Math.abs()` as defense in depth.

**Also found, flagged, not fixed here (out of scope — a backend ingest
bug, not a frontend one):** every 2026 `practice_results` row for Max
Verstappen is attributed to `driver_id=vergne` (Jean-Éric Vergne) instead
of `max_verstappen`, because the `drivers` table's `vergne` row carries
Verstappen's real code "VER" instead of Vergne's actual "JEV". Confirmed
live via the API — 30 rows across all 12 rounds, every session type. Spun
off as a separate task (`task_4a1b92ee`) with full repro/diagnosis rather
than guessing at the OpenF1 driver-number mapping from the frontend.

## Phase 3 — Fill the thin pages

- [x] **3.1** Schedule — hero now counts down live to the next *session*
      on the calendar (`nextSession()`, not just Sunday's race — through a
      Friday, FP1 is what's actually next), circuit backdrop art (bundled
      PNG, network SVG fallback for circuits like Madrid without one),
      SPRINT WEEKEND badge. Calendar rows got the same circuit-color
      accent bar + thumbnail + COMPLETED/SPRINT badges as the Flutter
      `_CalendarTile`, replacing a plain HTML table. Links into Race
      Details (done as part of 2.9). Verified: real countdown ticking,
      all 24 circuit thumbnails resolving (bundled or network fallback),
      zero console errors in an isolated tab, no mobile overflow at 375px.
- [x] **3.2** Standings — ported `standings_screen.dart`'s `_DriverBanner`/
      `_ConstructorBanner`: a "CHAMPIONSHIP LEADER" hero above the list with
      a team-color glow and the leader's real headshot/logo (`getDriverDetail`/
      `getConstructorDetail`, same fetchers the driver/constructor detail
      pages already use). Rows replaced a plain HTML table with the
      `_StandingRow` card shape — team-tinted podium position tile, accent
      bar, team-color subtitle. ("Position deltas"/"per-driver form"/
      "constructor grouping" in the original roadmap wording don't
      correspond to anything in `standings_screen.dart` — grep found no
      such feature; not invented here, ported what's actually there
      instead.) No season selector in the Flutter source either, matching
      this page's existing current-season-only behavior. Verified: real
      2026 standings (Antonelli 242 pts leading drivers, Mercedes 425 pts
      leading constructors), both leader images loading, zero console
      errors in an isolated tab, no mobile overflow.
- [x] **3.3** Results — season picker already existed (a `<select>`, kept —
      Flutter's own `_SeasonStrip` is a pill scroller, a mobile picker
      pattern this app already translates to a native dropdown elsewhere).
      Ported `_ArchiveHero`'s rotating "FROM THE VAULT" trivia fact (real
      history, verbatim from the Flutter source, not fabricated —
      deterministic by the current minute) and `_RaceCard`'s circuit-color
      accent bar + round badge + gold "P1" winner badge, replacing the
      plain HTML table. ("Podium art"/"winner/pole columns" in the
      original roadmap wording again don't match anything in
      `results_screen.dart` — grep found no pole-position column anywhere;
      ported the real `_RaceCard` design instead of inventing one.)
      Verified: real winner data rendering per round, WDC/WCC tabs
      unaffected, zero console errors in an isolated tab, no mobile
      overflow.
- [x] **3.4** Circuit Guide index — done, extended after the user flagged
      real data was missing. Was silently showing only the current season's
      ~23 circuits (`getSchedule`-filtered); now splits into a "CALENDAR"
      section and a "PAST CIRCUITS" section using the **correct** boundary —
      curated (in `circuit-facts.ts`'s 26) vs. not, matching
      `pastCircuitsProvider`'s actual filter (`CircuitFacts.all`'s ids),
      not "on this year's schedule". Those aren't the same set: a curated
      circuit can be off a given year's calendar without losing its
      hand-written facts (Imola, this cycle). Added `_FeaturedHero` (next
      race, real character tags) and `_FilterRow` (ALL/STREET/HIGH-SPEED/
      TECHNICAL/FLOWING chips over the curated set's `character` tags —
      port of `_Filter.apply`, verbatim tag-matching logic). Past-circuit
      rows now show real season range + race count (`first_gp`/`last_gp`/
      `gps` from `computed_stats`, entity_type=circuit — `buildPastCircuits()`
      in the new `circuit-stats.ts`, ported from `past_circuits_provider.dart`),
      not just a name — Nürburgring reads "1951–2020 · 41 races", Paul
      Ricard "1971–2022 · 18 races", real and verified against the API.
      Cards deliberately stay light (image + name + locality, no
      per-circuit stats) — `getCircuitDetail()` is a multi-query Supabase
      call, too expensive to fire once per card on an index of 78; that's
      the detail page's job.
      **Bug found and fixed during verification:** kept the old page's
      `["circuit-guide", …]` query key while changing its cached shape
      from `Row[]` to an object — a stale `Row[]` rehydrating from
      localStorage crashed on `.past.length` (arrays have no `.past`).
      Renamed the key.

- [x] **3.5** Circuit Guide detail — done, in three passes, the last one
      prompted directly by the user pointing at a real screenshot ("circuit
      details still not loading… the track looks shit").

      **Pass 1** shipped the live-data half only (hero, real length/laps/
      turns/top-speed, fastest-lap/pit, podiums) and deliberately deferred
      `circuit_facts.dart`'s 26-circuit curated content as too large to
      transcribe safely inline.

      **Pass 2**, prompted by the user hitting that exact gap live on
      Monza: ported `circuit_facts.dart` → `lib/models/circuit-facts.ts`
      **programmatically** — a Python script parsed the Dart struct
      literals directly (regex-driven field/string/list extraction,
      respecting `\'` escapes) rather than hand-typing 26 circuits × 19
      fields, verified field-by-field before writing the `.ts` file
      (caught Suzuka's `direction` being `"Both (figure-8)"`, not
      Clockwise/Anticlockwise — the union type had to widen to `string`).
      Wired in as the documented Supabase fallback.

      Also in pass 2, **the "make it sexy" half**: the network SVGs were
      never meant to be shown in stored colors — Flutter's
      `CircuitTrackImage` recolors every one with
      `ColorFilter.mode(color, BlendMode.srcIn)`; the web version was
      showing them raw (Monza's fill is `#241758`, near-black, invisible
      on a dark surface). Ported as `components/shared/track-image.tsx`.
      **Bug found while building it:** a direct browser `fetch()` of the
      SVG is CORS-blocked (confirmed in the console) — a plain `<img>`
      never surfaced this since image loads aren't subject to the same
      restriction reading response *content* is. Fixed with
      `/api/circuit-svg`, mirroring `/api/fia-doc`'s existing proxy
      pattern for the identical class of problem.

      **Pass 3**, after the user checked the mobile Flutter source
      directly and confirmed real data and a real design were still
      missing — read `circuit_guide_screen.dart`/
      `circuit_guide_detail_screen.dart`/`past_circuits_provider.dart`/
      `stats_provider.dart` in full rather than the structural skim pass
      1/2 relied on, and found:
      - `_CircuitRecordsSection` — a DRIVERS/TEAMS toggle over three
        "most X at this circuit" mini-leaderboards (wins/poles/podiums),
        top 5 with a "VIEW ALL N" drill-down. Reads `computed_stats`
        directly (`driver_circuit`/`constructor_circuit` entity types,
        `entity_id` pattern `<id>__<circuitId>`) — **already had
        `getCircuitLeaderboard`/`getCircuitDriverStats` in
        `stats-api.ts` from earlier in the session, just never wired
        into any UI.** Built `components/circuits/circuit-records.tsx`
        + the `/circuits/:id/leaderboard` sub-route (query-param based,
        not Flutter's router `extra` state — a URL here has to be a
        real, shareable address) for the full ranked list.
      - `_CareerFirstsCard` (maiden win/pole/podiums here) and
        `_WinningGridSlotCard` (per-grid-slot win-count bars) — both
        `computed_stats` reads, zero Supabase dependency. Built
        `components/circuits/circuit-firsts.tsx`.
      - **The real architectural bug** underlying "still not loading":
        `getCircuitDetail()` returned `null` — short-circuiting *before*
        it ever computed lap/pit records from `computed_stats` — the
        instant Supabase had no bio row. That silently dropped real, live
        data behind an unrelated failure, and worse, it was dropping
        *fresher* data in favor of an *older* fallback: confirmed live,
        Monza's real `fastest_lap_alltime` is Norris, 1:20.901, 2025 —
        newer than the curated fallback's Barrichello 2004 figure, which
        is what the coupled version was showing instead. Fixed by
        fetching `getStatsForEntity(circuitId)` independently of
        Supabase, matching the Flutter architecture exactly
        (`entityStatsProvider` has no Supabase dependency at all).
      - `_PastCircuitScreen` — circuits with no curated facts (the 52
        "past" ones) get a *lighter but still real* page in Flutter:
        season range + race count, lap/pit records, and every Circuit
        Records/Career Firsts/Winning Grid Slot section above, all
        computed straight from race data with no bio text required. The
        web version was showing these 52 circuits "No extended guide for
        this circuit yet" — a dead end for two-thirds of the guide. Now
        matches: a `PAST CIRCUIT` badge, active-years/races-held stat
        pair, and every live-stats section, exactly like Nürburgring's
        real page now shows (1951–2020, 41 races, Verstappen's 2020 lap
        record, Schumacher's 5 wins topping the leaderboard, Ascari's
        1951 maiden win).

      **A second, subtler bug found and fixed while building the
      `_CircuitRecordsSection` port** — verifying against a *second*
      circuit rather than assuming Monza's SVG shape generalized:
      Nürburgring's track path carries no `fill` attribute or style at
      all, relying on SVG's own initial fill value (black) — a
      `currentColor` wrapper only helps a shape that references it, and
      an unset `fill` never does. Fixed by adding a scoped `<style>`
      rule (`path,polygon,circle,ellipse,polyline{fill:currentColor}`)
      to the injected markup — deliberately **not** targeting `rect`,
      since a transparent background is exactly a bare `<rect fill=
      "none">` in some of these files, and a stylesheet rule beats a
      presentational attribute in specificity. Building *that* fix then
      broke something else — the existing "strip `fill:` out of an
      inline `style=`" regex stripped `style="fill: none;"` too
      (indiscriminately removing any `fill:` declaration, "none"
      included), leaving the background rect with an empty style that
      fell through to the same black default. Then a *third* bug in the
      fix for that: a naive `fill:\s*(?!none)` negative lookahead let
      `\s*` backtrack to zero characters, evaluating the lookahead
      *before* the space and letting "none" slip through anyway —
      resolved by moving the whitespace inside the lookahead itself
      (`fill:(?!\s*none\b)\s*`). Confirmed via a real screenshot: Monza,
      Nürburgring, and Silverstone all render a clean glowing white
      track outline on a genuinely transparent background, no stray
      black square.

      **Also found:** this local dev environment's Supabase credentials
      are a placeholder (`placeholder.supabase.co` — confirmed `net::
      ERR_NAME_NOT_RESOLVED` on every call, every page, not intermittent —
      see `CLAUDE.md`'s Supabase-placeholder note). The curated-facts
      fallback and the decoupled live-stats fetch together mean this no
      longer blocks the page from showing real content; Supabase-*sourced*
      content specifically (descriptions/podiums when they exist) still
      can't be visually verified as correct here, only that it degrades
      to the fallback instead of crashing.

      Verified: Monza, Nürburgring, and Silverstone all real-screenshot-
      confirmed with correct glow/recolor; Nürburgring's full page reads
      "PAST CIRCUIT · 1951–2020 · 41 races · Verstappen 1:28.139 (2020) ·
      Red Bull 18.979s pit (2013) · Schumacher 5 wins / Webber 2 poles /
      Schumacher 8 podiums · Ascari 1951 maiden win, Räikkönen 2003
      maiden pole · P1 37%, P2 34%, P3 12%…" — genuinely all real. The
      Silverstone "VIEW ALL 77" podiums drill-down renders 60+ real
      historical names back to Fangio and Farina. Zero console errors
      beyond the documented Supabase DNS failures, in fresh isolated
      tabs throughout. `tsc`/`lint`/`build` all clean.

- [x] **3.6** Stats hub — the catalog itself (`statsCategories`, 9
      categories × ~35 metrics ported from `stats_hub_screen.dart`) was
      **already a complete port**; only the page rendering it was thin —
      a plain flat list with no card styling, no data-freshness footer.
      ("All 114 metric keys" in the original roadmap wording overstates
      what the hub itself should show — the Dart source's own comment is
      explicit that niche variants (per-circuit, per-team, by-nation,
      firsts/lasts) belong on Driver/Constructor/Circuit detail screens,
      not this top-level hub; the hub is a **curated shortlist** by
      design, not the full catalog.) Added `_QualiToRaceEntry`'s gradient
      standout card and `_LastUpdatedFooter` — real sync freshness off
      `sync_status` (`getSyncStatus()` already existed, just never
      called from this page), reading "1 Sept 2026 · Through Dutch Grand
      Prix · Race" from live data. Category/metric rows got the bordered-
      card-with-dividers treatment in place of a bare link list. The
      leaderboard page itself (`/stats/[metricKey]`) already existed and
      needed no changes — confirmed still working (driver/constructor
      toggle, real 106-Hamilton-win data). Verified: all 9 categories
      render, zero console errors in an isolated tab, no mobile overflow.
- [x] **3.7** Hall of Fame — the data layer (`hall-of-fame.ts`) was
      **already a complete port**: the full all-time index since 1950
      (every driver/constructor, not a winners-only shortlist, matching
      `hall_of_fame_provider.dart`'s explicit "865 drivers, not a
      shortlist" comment), same stats-api sourcing, same titles-then-wins
      sort. ("Split driver/constructor screens" in the original roadmap
      wording doesn't match the source either — `hall_of_fame_screen.dart`
      is explicitly a *combined* screen with drivers/teams as tabs "instead
      of two separate nav-menu entries", which is exactly what this page
      already did.) The actual gap was visual: no hero for the #1 all-time
      entry, unlike every other listing page this phase touched. Added
      `DriverHero`/`ConstructorHero` (ports `_HeroChampion` — gold glow,
      archive photo faded in from the right via a CSS mask, "Nx WORLD
      CHAMPION"/"Nx CONSTRUCTORS' CHAMPION" chip, big win/podium/pole/DNF
      stats) using `drivers`/`constructors.image_url` — stats-api's own
      archive photo, not Supabase, so this works even with the placeholder
      credentials. Table rows gained rank numbers. Verified: Hamilton's
      hero shows his real 7 titles/106 wins/207 podiums/107 poles/35 DNFs
      with his photo loading; Ferrari's shows 16 titles/250 wins/845
      podiums — both checked against real F1 history, not just "renders
      without crashing". Zero console errors in an isolated tab, no mobile
      overflow.
- [x] **3.8** Driver + constructor details — audited against the Flutter
      source and found **no real gap**, same pattern as 3.6/3.7. Compared
      section-by-section, not by line count: `driver_details_screen.dart`
      (2463 lines) has Hero/HeroKpi/StatTile, Bio (Personal/Career
      BioGroups), Career Totals, All-Time Rankings (RankCard+NeighborRow),
      Rankings by Team, Circuit Performance, H2H Summary, Qualifying Gap,
      Championship History, Season Stats, Results by Year — every one of
      these is already present in [driver/[driverId]/page.tsx](src/app/driver/[driverId]/page.tsx)
      (618 lines). `constructor_details_screen.dart` (1798 lines) has
      About (Drivers/Technical/Team), Career Totals, All-Time Rankings,
      Circuit Performance (best-circuit), Championship History, Season
      Stats, Records — all present in
      [constructor/[constructorId]/page.tsx](src/app/constructor/[constructorId]/page.tsx)
      (431 lines) too. Spot-checked content depth, not just section names:
      the constructor Records section's 6 metric keys (`first_gp`,
      `last_gp`, `best_result`, `best_grid`, `best_wcc_rank`,
      `best_wdc_rank`) and their `P{n} · {season} · {driver}` value format
      match `_ConstructorRecordsSection`'s row-building logic exactly. The
      2463/1798-line Flutter files are MD3 widget boilerplate (padding/
      shimmer/icon wrappers per row) — TS + Tailwind expresses the same
      content in roughly a quarter of the lines. No code changes made;
      this item just needed the same "verify before declaring a gap" check
      already applied to 3.6/3.7, which turned up nothing to fix.

## Phase 4 — Learn F1 `/learn`

Source: `learn/` (7 chapters, `lessons.dart`, `legend_cars.dart`,
`penalty_guide.dart`). Web-appropriate chapters only.

- [ ] **4.1** `/learn` hub — 7 chapters, status badges
- [ ] **4.2** `/learn/penalties` — penalty guide with real incidents
- [ ] **4.3** `/evolution` — 10 legend cars, scrubbable timeline
- [ ] **4.4** `/tyres` — compound comparison
- [ ] Out of scope: `/car`, `/car-airflow` (3D viewer is mobile-only)

## Phase 5 — Polish

- [ ] **5.1** Loading skeletons everywhere (no bare "Loading…")
- [ ] **5.2** Empty/error states with real copy
- [ ] **5.3** Full responsive pass on every new route (320 → 1440)
- [ ] **5.4** OG tags + metadata per route
- [ ] **5.5** Re-verify the homepage WS connection cost before public launch

---

## Conventions (don't relearn these)

- Every `lib/api/*.ts` and `lib/models/*.ts` names the Flutter file it was
  ported from. Read that source before guessing at field shapes.
- `useMounted()` gates any client-fetched or locale-formatted JSX
  (hydration — CLAUDE.md gotcha #4).
- `tsc --noEmit` + `lint` + `build` clean is the bar for "done", plus a
  real-browser check. This pane doesn't composite frames (gotcha #6), so
  verify layout via DOM geometry when screenshots look wrong.
- Never link out to official sources; parse and render natively.
