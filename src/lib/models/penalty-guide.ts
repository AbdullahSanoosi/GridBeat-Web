/**
 * Ported from GridBeat (Flutter) lib/features/learn/data/penalty_guide.dart —
 * a plain-English guide to what actually gets you penalised, keyed to the
 * offence categories that really occur in the FIA's decisions (read off the
 * real title/reason distribution, not guessed keywords — an earlier Flutter
 * pass guessed and left 165 of ~500 decisions unmatched).
 *
 * Ordered most-specific first — `classifyPenalty` returns the first match,
 * so "unsafe release" has to beat the generic "release", and the
 * deleted-lap bulletins have to land in Track Limits rather than being read
 * as a separate offence.
 */

export interface PenaltyKind {
  name: string;
  /** What the rule is, for someone who has never heard of it. */
  what: string;
  /** Why it exists — the part that makes the rule make sense. */
  why: string;
  /** What a driver typically gets for it. */
  typical: string;
  icon: string;
  accent: string;
  /** Lowercased fragments matched against a decision's title and reason. */
  match: string[];
}

export const PENALTY_KINDS: PenaltyKind[] = [
  {
    name: "Track limits",
    what: "Every corner has a white line. Put all four wheels beyond it and you have left the track.",
    why: "The line defines the circuit. Running wide is usually faster, so without the rule the track would quietly get bigger all weekend.",
    typical:
      "The lap time is deleted. Do it repeatedly in a race and it escalates to a black-and-white flag, then a time penalty.",
    icon: "\u{1F4CF}",
    accent: "#60A5FA",
    match: ["deleted lap", "leaving the track", "track limit", "gaining an advantage"],
  },
  {
    name: "Pit lane offences",
    what: "A strict speed limit, normally 80 km/h, and a red light at the pit exit that must be obeyed.",
    why: "Mechanics stand within a metre of moving cars. It is the one place on track where people are on foot.",
    typical: "A fine in practice. During the race it becomes a time penalty, because there the speed would have won time.",
    icon: "\u{1F6A5}",
    accent: "#F59E0B",
    match: ["pit lane speeding", "speeding in the pit", "red light at pit exit", "pit exit"],
  },
  {
    name: "Unsafe release",
    what: "The team let a car out of its pit box into the path of another car or with something not properly attached.",
    why: "A car leaving the box has no speed and no view. Getting it wrong at the busiest moment of a race is how pit lane collisions happen.",
    typical: "A time penalty for the driver and a fine for the team — the mistake is the crew's, but the car carries it.",
    icon: "\u{26A0}\u{FE0F}",
    accent: "#EF4444",
    match: ["unsafe release", "unsafe condition"],
  },
  {
    name: "Yellow flags",
    what: "Yellow means danger ahead — slow down, be ready to stop, and do not overtake. Double yellow means be prepared to stop completely.",
    why: "There may be a stopped car or a marshal on the track surface just out of sight. It is the rule that most directly protects lives.",
    typical: "Among the most heavily punished things in F1 — a grid penalty or time penalty plus penalty points, even for a small margin.",
    icon: "\u{1F7E1}",
    accent: "#FFD700",
    match: ["yellow flag", "double yellow", "yellow flags"],
  },
  {
    name: "Parc fermé breach",
    what: "From the start of qualifying the cars are impounded — teams may not change the setup before the race.",
    why: "It stops teams qualifying with a light, fast car and then rebuilding it into a different one for Sunday.",
    typical: "Starting from the pit lane, which usually costs more than the change was worth.",
    icon: "\u{1F512}",
    accent: "#A78BFA",
    match: ["parc ferme", "parc fermé", "changes made during"],
  },
  {
    name: "Causing a collision",
    what: "The stewards judged one driver predominantly to blame for contact.",
    why: "Racing incidents happen and often go unpunished. This is for when the stewards think one driver could reasonably have avoided it.",
    typical: "A 5 or 10 second time penalty, usually with penalty points on the licence.",
    icon: "\u{1F4A5}",
    accent: "#EF4444",
    match: ["collision", "causing a collision", "incident with"],
  },
  {
    name: "The 107% rule",
    what: "In Q1 you must set a lap within 107% of the fastest time, or you may not be permitted to start.",
    why: "A car far off the pace is a moving obstacle for everyone else. The stewards can still allow it if there is a good reason.",
    typical: "Usually permitted to start anyway, on the strength of practice pace — refusal is rare.",
    icon: "\u{23F1}\u{FE0F}",
    accent: "#34D399",
    match: ["107"],
  },
  {
    name: "Starting procedure",
    what: "Moving before the lights go out, or not being correctly placed in your grid box.",
    why: "Twenty cars accelerate from a standstill within a car's length of each other. The procedure is what keeps that survivable.",
    typical: "A 5 second time penalty, served at the first pit stop.",
    icon: "\u{1F6A6}",
    accent: "#F59E0B",
    match: [
      "starting procedure",
      "start procedure",
      "moving before",
      "reaching the grid",
      "permission to start",
    ],
  },
  {
    name: "Defending too hard",
    what: "You may make one move to defend your position. Moving back across to block again is not allowed.",
    why: "At 300 km/h the car behind commits to a side early. A second move takes away the room they were already using.",
    typical: "A time penalty, and penalty points if it was dangerous.",
    icon: "\u{2194}\u{FE0F}",
    accent: "#60A5FA",
    match: ["change of direction", "more than one change", "defending"],
  },
  {
    name: "Race Director's instructions",
    what: 'Specific instructions issued for the weekend — most often a maximum time for an out-lap, the "SC2-SC1" delta.',
    why: "Without it, drivers crawl on out-laps to build a gap for a fast lap, and the ones actually on a flying lap arrive at walking traffic.",
    typical: "A reprimand or grid penalty, depending on how far over the delta they were.",
    icon: "\u{1F4E2}",
    accent: "#A78BFA",
    match: [
      "sc2-sc1",
      "sc2 - sc1",
      "race directors instructions",
      "race director's instructions",
      "unnecessarily slowly",
      "safety car infringement",
    ],
  },
  {
    name: "Blue flags",
    what: "A blue flag means a faster car is about to lap you. You must let it past at the first safe opportunity.",
    why: "The leaders are racing each other. A driver a lap down holding them up would decide a race they are not part of.",
    typical: "A time penalty, or penalty points if it went on for several corners.",
    icon: "\u{1F535}",
    accent: "#60A5FA",
    match: ["blue flag"],
  },
  {
    name: "Red flag",
    what: "A red flag stops the session. Cars must slow immediately and return to the pit lane.",
    why: "It is called when the track is genuinely unsafe — a wrecked car, debris, or conditions too poor to continue.",
    typical: "A grid penalty for speeding under it, since the point is that nobody is racing any more.",
    icon: "\u{1F534}",
    accent: "#EF4444",
    match: ["red flag"],
  },
  {
    name: "Impeding",
    what: "Getting in the way of a driver on a flying lap, usually in qualifying.",
    why: "A qualifying lap is one shot at a clear track. Meeting a slow car in a fast corner ruins it, and the driver behind has nowhere to go.",
    typical: "A grid penalty of three places, or a reprimand if it was marginal.",
    icon: "\u{1F6AB}",
    accent: "#F59E0B",
    match: ["impeding", "impeded"],
  },
  {
    name: "Dangerous driving",
    what: "Driving judged erratic or dangerous without being a specific named offence — weaving on a straight, forcing another car off the road.",
    why: "A catch-all for behaviour the stewards consider unsafe even where no single rule names it.",
    typical: "Varies widely with severity, from a reprimand to a grid drop with penalty points.",
    icon: "\u{2757}",
    accent: "#EF4444",
    match: ["erratic", "dangerous driving", "forcing another driver"],
  },
  {
    name: "Technical breach",
    what: "The car itself did not comply — bodywork, DRS, or power unit parts outside what the regulations allow.",
    why: "The technical rules are what make it a contest of driving rather than of budget. Breaches are treated as absolute, not negotiable.",
    typical: "Usually disqualification from the session, because the advantage cannot be undone by a time penalty.",
    icon: "\u{1F527}",
    accent: "#60A5FA",
    match: ["technical regulations", "drs", "change to pu elements"],
  },
  {
    name: "Off-track duties",
    what: "Obligations away from driving — press conferences, media sessions, fan engagement, the drivers' parade.",
    why: "These are written into the rules because the championship sells access to the drivers, not only the racing.",
    typical: "A fine for the team, occasionally a reprimand for the driver.",
    icon: "\u{1F3A4}",
    accent: "#A78BFA",
    match: ["fan engagement", "media commitment", "press conference", "drivers parade", "parade"],
  },
];

/** The kind a decision belongs to, or null if it doesn't match one. Title first, then reason. */
export function classifyPenalty(title: string, reason: string | null): PenaltyKind | null {
  const t = title.toLowerCase();
  const r = (reason ?? "").toLowerCase();
  for (const kind of PENALTY_KINDS) {
    if (kind.match.some((needle) => t.includes(needle))) return kind;
  }
  for (const kind of PENALTY_KINDS) {
    if (kind.match.some((needle) => r.includes(needle))) return kind;
  }
  return null;
}
