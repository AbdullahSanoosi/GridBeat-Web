"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSectionStore } from "@/lib/nav/section-store";

/**
 * The dashboard shell's nav — a persistent left sidebar on desktop
 * (`lg:` and up), replacing the Flutter app's floating bottom pill
 * (scaffold_with_nav.dart). Below `lg`, it collapses to a top bar with a
 * hamburger-triggered slide-over drawer — the same nav content, just a
 * different affordance for a viewport too narrow for a persistent 240px
 * column. Grows as each route lands; only link routes that actually exist.
 */
const NAV_ITEMS = [
  { href: "/live", label: "Live Timing", icon: "🔴" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/standings", label: "Standings", icon: "🏆" },
  { href: "/stewards-room", label: "Stewards' Room", icon: "⚖️" },
  { href: "/results", label: "Race Archives", icon: "🗃️" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/circuits", label: "Circuit Guide", icon: "🗺️" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: "👑" },
  { href: "/learn", label: "Learn F1", icon: "🎓" },
  { href: "/news", label: "News", icon: "📰" },
] as const;

const COLLAPSE_KEY = "gridbeat-sidebar-collapsed";

const noopSubscribe = () => () => {};
const collapsedServerSnapshot = () => false;
function collapsedClientSnapshot(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Same useSyncExternalStore idiom as useMounted() — starts `false` on both
 * the server render and the client's first (hydration) pass so there's
 * nothing to mismatch, then picks up the real saved value right after.
 * `setCollapsed`'s own click handler is a plain event handler, not an
 * effect, so it can set React state directly with no lint issue.
 */
function useStoredCollapsed(): boolean {
  return useSyncExternalStore(noopSubscribe, collapsedClientSnapshot, collapsedServerSnapshot);
}

function NavLinks({
  pathname,
  onNavigate,
  collapsed,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const lastSection = useSectionStore((s) => s.lastSection);
  // A detail page (driver/constructor/race-details) matches no nav item's
  // own prefix at all — fall back to whichever section the visitor was
  // actually last on, so it isn't just permanently unhighlighted there.
  const matchesDirectly = NAV_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = matchesDirectly ? pathname.startsWith(item.href) : item.href === lastSection?.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-2.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              collapsed ? "justify-center px-0" : "px-3"
            } ${
              active
                ? "bg-(--color-primary) text-(--color-on-secondary)"
                : "text-(--color-text-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-text-primary)"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const storedCollapsed = useStoredCollapsed();
  // null = no click yet this session, defer to the stored value (itself
  // hydration-safe via useSyncExternalStore above); once clicked, the
  // explicit choice wins for the rest of the session.
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? storedCollapsed;
  const setLastSection = useSectionStore((s) => s.setLastSection);

  const toggleCollapsed = () => {
    const next = !collapsed;
    try {
      localStorage.setItem(COLLAPSE_KEY, String(next));
    } catch {}
    setCollapsedOverride(next);
  };

  // Record whichever nav section this pathname actually belongs to, so
  // detail pages with more than one entry point (driver/constructor from
  // Standings/Hall of Fame/Stats; race-details from Schedule/Race
  // Archives) can render a "back to X" link that matches where the
  // visitor really came from instead of a single hardcoded guess.
  useEffect(() => {
    const match = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
    if (match) setLastSection({ href: match.href, label: match.label });
  }, [pathname, setLastSection]);

  // The homepage is a full-bleed marketing/entry page, not a dashboard
  // screen — no persistent chrome boxing in the hero. Every other route
  // gets the normal sidebar/top-bar.
  if (pathname === "/") return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 py-3 lg:hidden">
        <Link href="/" className="font-[var(--font-f1)] text-lg font-bold tracking-tight">
          GRIDBEAT
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--color-border) text-(--color-text-secondary)"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80vw] flex-col border-r border-(--color-border) bg-(--color-surface) px-4 py-6">
            <div className="mb-8 flex items-center justify-between px-2">
              <span className="font-[var(--font-f1)] text-xl font-bold tracking-tight">GRIDBEAT</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-7 w-7 items-center justify-center rounded-full text-(--color-text-secondary) hover:bg-(--color-surface-elevated)"
              >
                ×
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop persistent sidebar — retractable to a slim icon rail so a
          wide dashboard page (Live Timing) can claim more width. */}
      <aside
        className={`hidden h-full shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface) py-6 transition-[width] duration-200 lg:flex ${
          collapsed ? "w-16 px-2" : "w-60 px-4"
        }`}
      >
        <div className={`mb-8 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between px-2"}`}>
          {collapsed ? (
            <Link href="/" className="font-[var(--font-f1)] text-lg font-bold tracking-tight" title="GridBeat">
              G
            </Link>
          ) : (
            <Link href="/" className="font-[var(--font-f1)] text-xl font-bold tracking-tight">
              GRIDBEAT
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-[10px] text-(--color-text-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-text-primary)"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <NavLinks pathname={pathname} collapsed={collapsed} />
      </aside>
    </>
  );
}
