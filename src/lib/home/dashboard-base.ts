import { headers } from "next/headers";
import { MARKETING_HOST, DASHBOARD_HOST } from "@/lib/hosts";

/**
 * Absolute origin to prefix a dashboard-route link with, for the homepage's
 * own outbound CTAs (the header nav, the sector cards, "See full standings",
 * etc.) — empty string everywhere except the marketing-only production host.
 *
 * This exists because `next/link`'s client-side router doesn't know that
 * `src/middleware.ts` will redirect a same-looking `/schedule` href to a
 * different origin: a `<Link href="/schedule">` click does a same-origin
 * client-side transition and pushState()s the address bar to
 * `gridbeat.app/schedule` regardless of what the background fetch's 308
 * eventually resolves to — confirmed live (that's the exact bug this fixes,
 * not a hypothetical). A fully-qualified href sidesteps the client router
 * entirely: `next/link` treats a foreign-origin href as external and lets
 * the browser do a normal top-level navigation, which is what actually
 * lands on `dashboard.gridbeat.app`.
 *
 * Returns "" on the dashboard host, staging, and local dev, so those keep
 * today's plain relative links — this only ever adds a prefix, never
 * changes the path itself.
 */
export async function getDashboardBase(): Promise<string> {
  const host = (await headers()).get("host")?.replace(/^www\./, "");
  return host === MARKETING_HOST ? `https://${DASHBOARD_HOST}` : "";
}
