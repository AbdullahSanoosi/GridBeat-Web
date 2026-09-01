import { create } from "zustand";

/**
 * Remembers the last top-level nav section (Standings, Hall of Fame,
 * Race Archives, Stats, Schedule, ...) the user was actually on, so a
 * detail page reached from more than one place (driver/constructor pages
 * from Standings/Hall of Fame/a Stats leaderboard; race-details from
 * Schedule/Race Archives) can render a "back to X" link that points where
 * the visitor actually came from instead of a single hardcoded guess, and
 * the sidebar can highlight that section instead of nothing at all.
 *
 * Session-only (no persistence) — a direct load straight onto a detail
 * page has no prior section to report, so callers fall back to a sensible
 * default in that case.
 */
export interface NavSection {
  href: string;
  label: string;
}

interface SectionStore {
  lastSection: NavSection | null;
  setLastSection: (section: NavSection) => void;
}

export const useSectionStore = create<SectionStore>((set) => ({
  lastSection: null,
  setLastSection: (section) => set({ lastSection: section }),
}));
