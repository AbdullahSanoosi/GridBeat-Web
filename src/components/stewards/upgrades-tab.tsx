import { teamColor } from "@/lib/theme/colors";
import type { CarUpgrade } from "@/lib/models/fia-docs";

/**
 * Car upgrades filed with the Technical Delegate this weekend — ports the
 * UPGRADES tab of fia_docs_screen.dart. Grouped by team, since the
 * interesting read is "who brought what here", not a flat list.
 *
 * `reason` is the FIA's own category ("Performance - Local Load",
 * "Circuit specific"), so it's shown as a chip rather than prose.
 */
export function UpgradesTab({ upgrades, weekend }: { upgrades: CarUpgrade[]; weekend: string }) {
  if (upgrades.length === 0) {
    return <p className="text-sm text-(--color-text-secondary)">No car upgrades filed for this round yet.</p>;
  }

  const byTeam = new Map<string, CarUpgrade[]>();
  for (const u of upgrades) {
    const key = u.constructorName ?? u.teamName;
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key)!.push(u);
  }

  return (
    <div>
      <p className="mb-4 font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-(--color-text-muted)">
        {weekend.toUpperCase()} · {upgrades.length} ITEMS FROM {byTeam.size} TEAMS
      </p>

      <div className="flex flex-col gap-4">
        {[...byTeam.entries()].map(([team, items]) => {
          const color = teamColor(team);
          return (
            <section key={team} className="rounded-xl border border-(--color-border) bg-(--color-surface)">
              <div className="flex items-center gap-2.5 border-b border-(--color-divider) px-4 py-3">
                <span className="h-4 w-1 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="font-[var(--font-f1)] text-sm font-bold" style={{ color }}>
                  {team}
                </h2>
                <span className="ml-auto text-[11px] tabular-nums text-(--color-text-muted)">
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="divide-y divide-(--color-divider)">
                {items.map((u) => (
                  <li key={u.itemNumber} className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-sm font-semibold">{u.component}</span>
                      {u.reason && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider"
                          style={{
                            borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                            color,
                          }}
                        >
                          {u.reason.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {u.detail && (
                      <p className="mt-1.5 text-sm leading-snug text-(--color-text-secondary)">{u.detail}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
