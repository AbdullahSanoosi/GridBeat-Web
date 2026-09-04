import { NextResponse, type NextRequest } from "next/server";
import { MARKETING_HOST, DASHBOARD_HOST } from "@/lib/hosts";

/**
 * Splits the marketing homepage onto its own domain from the dashboard.
 *
 * Both are the same Next.js app/container behind the same Cloudflare tunnel
 * (see CLAUDE.md's Deployment section) — this is a routing decision, not a
 * second deployment. `gridbeat.app` shows only `/`; every dashboard route
 * hit there bounces to the real one on `dashboard.gridbeat.app` instead of
 * 404ing (all of the homepage's own CTAs already use relative hrefs like
 * `/live`, so they resolve correctly either way). `dashboard.gridbeat.app`
 * is the app itself — its `/` goes straight to the schedule, matching the
 * app's own pre-marketing-homepage behavior, rather than showing the
 * marketing hero a second time on the app domain.
 *
 * Deliberately scoped to these two exact hostnames only. Local dev and the
 * staging hostname (`webapp.5928104.xyz`) fall through untouched — there's
 * no separate staging-marketing domain, so staging keeps today's single-host
 * behavior (`/` = hero, everything else = dashboard) for testing changes.
 */
const DASHBOARD_PREFIXES = [
  "/schedule",
  "/standings",
  "/results",
  "/stats",
  "/circuits",
  "/hall-of-fame",
  "/driver",
  "/constructor",
  "/live",
  "/news",
  "/learn",
  "/evolution",
  "/race-details",
  "/stewards-room",
  "/api",
];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.replace(/^www\./, "");
  const { pathname, search } = req.nextUrl;

  if (host === MARKETING_HOST) {
    const isDashboardRoute = DASHBOARD_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isDashboardRoute) {
      // Permanent: this path space isn't coming back to this domain.
      return NextResponse.redirect(new URL(`https://${DASHBOARD_HOST}${pathname}${search}`), 308);
    }
    return NextResponse.next();
  }

  if (host === DASHBOARD_HOST && pathname === "/") {
    // Matches the app's original (pre-marketing-homepage) `redirect("/schedule")`.
    return NextResponse.redirect(new URL(`https://${DASHBOARD_HOST}/schedule`), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
