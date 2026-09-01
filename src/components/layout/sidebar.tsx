"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * The dashboard shell's nav — a persistent left sidebar on desktop
 * (`lg:` and up), replacing the Flutter app's floating bottom pill
 * (scaffold_with_nav.dart). Below `lg`, it collapses to a top bar with a
 * hamburger-triggered slide-over drawer — the same nav content, just a
 * different affordance for a viewport too narrow for a persistent 240px
 * column. Grows as each route lands; only link routes that actually exist.
 */
const NAV_ITEMS = [
  { href: "/live", label: "Live Timing" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/stewards-room", label: "Stewards' Room" },
  { href: "/results", label: "Race Archives" },
  { href: "/stats", label: "Stats" },
  { href: "/circuits", label: "Circuit Guide" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/learn", label: "Learn F1" },
  { href: "/news", label: "News" },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-(--color-primary) text-(--color-on-secondary)"
                : "text-(--color-text-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-text-primary)"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

      {/* Desktop persistent sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface) px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 px-2 font-[var(--font-f1)] text-xl font-bold tracking-tight">
          GRIDBEAT
        </Link>
        <NavLinks pathname={pathname} />
      </aside>
    </>
  );
}
