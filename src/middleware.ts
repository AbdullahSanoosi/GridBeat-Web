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
 *
 * The dashboard itself is gated behind HTTP Basic Auth while it's not ready
 * for public traffic — see `isDashboardAuthorized` below. That gate is keyed
 * to `DASHBOARD_HOST` the same way everything else here is, so it only ever
 * applies on `dashboard.gridbeat.app`; staging and local dev are unaffected
 * regardless of whether the credentials are configured.
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

/**
 * HTTP Basic Auth, checked against two server-only env vars (no
 * `NEXT_PUBLIC_` prefix, so they never reach the client bundle — set only
 * in `.env` on the box, read at runtime, same treatment as `TWITTER_API_KEY`
 * in the Security section of CLAUDE.md).
 *
 * Unconfigured means "no gate" rather than "lock everyone out" — a missing
 * env var should never silently 401 production, so an empty/unset
 * credential pair returns authorized.
 */
function isDashboardAuthorized(req: NextRequest): boolean {
  const user = process.env.DASHBOARD_BASIC_AUTH_USER;
  const pass = process.env.DASHBOARD_BASIC_AUTH_PASS;
  if (!user || !pass) return true;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return false;
  return decoded.slice(0, sep) === user && decoded.slice(sep + 1) === pass;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.replace(/^www\./, "");
  const { pathname, search } = req.nextUrl;

  if (host === DASHBOARD_HOST && !isDashboardAuthorized(req)) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="GridBeat Dashboard", charset="UTF-8"' },
    });
  }

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
