"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The desktop dashboard shell's nav — a persistent left sidebar, replacing
 * the Flutter app's floating bottom pill (scaffold_with_nav.dart). Grows
 * as each route lands; only link routes that actually exist.
 */
const NAV_ITEMS = [
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/results", label: "Race Archives" },
  { href: "/stats", label: "Stats" },
  { href: "/circuits", label: "Circuit Guide" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/news", label: "News" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface) px-4 py-6">
      <Link href="/schedule" className="mb-8 px-2 font-[var(--font-f1)] text-xl font-bold tracking-tight">
        GRIDBEAT
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
