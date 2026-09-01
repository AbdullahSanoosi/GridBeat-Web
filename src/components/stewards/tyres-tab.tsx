import { tyreColor } from "@/lib/theme/colors";
import {
  complianceChecks,
  type AxleSpecs,
  type CompoundKind,
  type TyreNotice,
} from "@/lib/models/fia-docs";

/**
 * Pirelli's compliance notice for the weekend — ports the TYRES tab of
 * fia_docs_screen.dart. Mandatory compounds plus the minimum starting
 * pressures and camber limits teams must run, per axle and per compound.
 */

const COMPOUNDS: { key: CompoundKind; label: string; color: string }[] = [
  { key: "slick", label: "SLICK", color: "var(--color-sector-yellow)" },
  { key: "intermediate", label: "INTERMEDIATE", color: "var(--color-sector-green)" },
  { key: "wet", label: "WET", color: "var(--color-info)" },
];

export function TyresTab({ notice, weekend }: { notice: TyreNotice | null; weekend: string }) {
  if (!notice) {
    return <p className="text-sm text-(--color-text-secondary)">No tyre notice published for this round yet.</p>;
  }

  const checks = complianceChecks(notice);

  return (
    <div className="flex flex-col gap-5">
      <p className="font-[var(--font-f1)] text-[10px] tracking-[0.16em] text-(--color-text-muted)">
        {weekend.toUpperCase()}
      </p>

      {notice.mandatoryCompounds && notice.mandatoryCompounds.length > 0 && (
        <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <h2 className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.18em] text-(--color-text-muted)">
            NOMINATED COMPOUNDS
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {notice.mandatoryCompounds.map((c) => (
              <span
                key={c}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 font-[var(--font-f1)] text-sm font-black"
                style={{
                  borderColor: tyreColor(c),
                  color: tyreColor(c),
                  backgroundColor: `color-mix(in srgb, ${tyreColor(c)} 14%, transparent)`,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AxleCard title="FRONT AXLE" axle={notice.front} />
        <AxleCard title="REAR AXLE" axle={notice.rear} />
      </div>

      {checks.length > 0 && (
        <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <h2 className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.18em] text-(--color-text-muted)">
            COMPLIANCE CHECKS
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-snug text-(--color-text-secondary)">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-sector-purple)" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AxleCard({ title, axle }: { title: string; axle: AxleSpecs | null }) {
  if (!axle) return null;
  const present = COMPOUNDS.filter((c) => axle[c.key] != null);
  if (present.length === 0) return null;

  return (
    <section className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
      <h2 className="font-[var(--font-f1)] text-[10px] font-bold tracking-[0.18em] text-(--color-text-muted)">
        {title}
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-(--color-text-muted)">
              <th className="pb-2 font-[var(--font-f1)] text-[9px] font-medium tracking-[0.14em]">COMPOUND</th>
              <th className="pb-2 text-right font-[var(--font-f1)] text-[9px] font-medium tracking-[0.14em]">
                MIN START
              </th>
              <th className="pb-2 text-right font-[var(--font-f1)] text-[9px] font-medium tracking-[0.14em]">
                MIN EXPECTED
              </th>
              <th className="pb-2 text-right font-[var(--font-f1)] text-[9px] font-medium tracking-[0.14em]">
                CAMBER
              </th>
            </tr>
          </thead>
          <tbody>
            {present.map((c) => {
              const s = axle[c.key]!;
              return (
                <tr key={c.key} className="border-t border-(--color-divider)">
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-xs font-medium">{c.label}</span>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {s.minStartPsi != null ? `${s.minStartPsi} psi` : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums text-(--color-text-secondary)">
                    {s.minExpectedPsi != null ? `${s.minExpectedPsi} psi` : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums text-(--color-text-secondary)">
                    {s.camberLimitDeg != null ? `${s.camberLimitDeg}°` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
