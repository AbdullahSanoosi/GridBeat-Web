/** Ported from GridBeat (Flutter) lib/features/schedule/data/models/schedule_models.dart. */
import type { Row } from "@/lib/api/types";

export interface SessionTime {
  date: string;
  time: string | null;
}

/** True only when a real UTC time was provided by the API. */
export function hasTime(s: SessionTime): boolean {
  return !!s.time;
}

/**
 * Local Date for a session. Falls back to midnight UTC only as a last
 * resort — callers should check hasTime() before displaying the clock time.
 */
export function sessionDateTime(s: SessionTime): Date {
  const t = s.time ?? "00:00:00Z";
  const normalised = t.endsWith("Z") || t.includes("+") ? t : `${t}Z`;
  const parsed = new Date(`${s.date}T${normalised}`);
  return Number.isNaN(parsed.getTime()) ? new Date(s.date) : parsed;
}

export interface NamedSession {
  name: string;
  session: SessionTime;
}

export interface RaceSessions {
  fp1: SessionTime | null;
  fp2: SessionTime | null;
  fp3: SessionTime | null;
  qualifying: SessionTime | null;
  sprintQualifying: SessionTime | null;
  sprint: SessionTime | null;
}

export function allSessions(s: RaceSessions): NamedSession[] {
  const out: NamedSession[] = [];
  if (s.fp1) out.push({ name: "Practice 1", session: s.fp1 });
  if (s.fp2) out.push({ name: "Practice 2", session: s.fp2 });
  if (s.fp3) out.push({ name: "Practice 3", session: s.fp3 });
  if (s.sprintQualifying) out.push({ name: "Sprint Qualifying", session: s.sprintQualifying });
  if (s.sprint) out.push({ name: "Sprint", session: s.sprint });
  if (s.qualifying) out.push({ name: "Qualifying", session: s.qualifying });
  return out;
}

/**
 * The next session to run anywhere on the calendar — practice, sprint
 * qualifying, sprint, qualifying or the race itself, whichever comes first.
 *
 * A weekend is five or six sessions, so "next race" is the wrong unit for
 * anything answering "what's on next": through a Friday, the next thing to
 * happen is FP1, not Sunday's grand prix.
 */
export interface UpcomingSession {
  race: F1Race;
  /** "Practice 1", "Qualifying", "Race", … */
  name: string;
  at: Date;
  /** False when the API gave a date but no UTC time. */
  timed: boolean;
}

export function nextSession(races: F1Race[], now: Date = new Date()): UpcomingSession | null {
  let best: UpcomingSession | null = null;
  for (const race of races) {
    const candidates: { name: string; s: SessionTime }[] = allSessions(race.sessions).map((n) => ({
      name: n.name,
      s: n.session,
    }));
    if (race.date) candidates.push({ name: "Race", s: { date: race.date, time: race.time ?? null } });

    for (const c of candidates) {
      const at = sessionDateTime(c.s);
      if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) continue;
      if (!best || at.getTime() < best.at.getTime()) {
        best = { race, name: c.name, at, timed: hasTime(c.s) };
      }
    }
  }
  return best;
}

export interface F1Circuit {
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
}

export interface F1Race {
  season: string;
  round: string;
  raceName: string;
  circuit: F1Circuit;
  date: string;
  time: string | null;
  sessions: RaceSessions;
}

function supaSession(r: Row, prefix: string): SessionTime | null {
  const date = r[`${prefix}_date`] as string | null;
  if (!date) return null;
  return { date, time: (r[`${prefix}_time`] as string | null) ?? null };
}

/** Parses a flat row from StatsApiService.getSchedule() (see lib/api/stats-api.ts). */
export function raceFromRow(r: Row): F1Race {
  return {
    season: String(r.season ?? ""),
    round: String(r.round ?? ""),
    raceName: (r.race_name as string) ?? "",
    circuit: {
      circuitId: (r.circuit_id as string) ?? "",
      circuitName: (r.circuit_id as string) ?? "",
      locality: (r.locality as string) ?? "",
      country: (r.country as string) ?? "",
    },
    date: (r.race_date as string) ?? "",
    time: (r.race_time as string | null) ?? null,
    sessions: {
      fp1: supaSession(r, "fp1"),
      fp2: supaSession(r, "fp2"),
      fp3: supaSession(r, "fp3"),
      qualifying: supaSession(r, "qualifying"),
      sprintQualifying: supaSession(r, "sprint_qualifying"),
      sprint: supaSession(r, "sprint"),
    },
  };
}

export function raceDateTime(race: F1Race): Date {
  return sessionDateTime({ date: race.date, time: race.time });
}

export function isUpcoming(race: F1Race): boolean {
  return raceDateTime(race).getTime() > Date.now();
}
