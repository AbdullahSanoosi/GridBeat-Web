import { NextResponse } from "next/server";

/**
 * Proxies a circuit-track SVG server-side. f1-stats-api's static file host
 * sends no `Access-Control-Allow-Origin` header, so a browser-side
 * `fetch()` for the SVG's raw markup (needed to recolor it — see
 * `components/shared/track-image.tsx`) is blocked by CORS even though a
 * plain `<img src>` renders it fine (an <img> tag isn't subject to the
 * same-origin fetch restriction the way reading response *content* is).
 * Same shape as `/api/fia-doc`'s proxy, for the same reason: this host
 * just doesn't set CORS headers, so the request has to originate
 * server-side instead.
 *
 * SSRF: only f1-stats-api's own image host is fetchable. The `url` param
 * comes from a `circuits.image_url` column, but it still arrives via the
 * client, so it's validated here rather than trusted.
 */
const ALLOWED_HOST = "f1stats.8582003.xyz";

function isAllowed(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== ALLOWED_HOST) return null;
  if (!url.pathname.endsWith(".svg")) return null;
  return url;
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const url = isAllowed(raw);
  if (!url) return NextResponse.json({ error: "host not allowed" }, { status: 403 });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream returned ${res.status}` }, { status: 502 });
    }
    const svg = await res.text();
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        // Track artwork never changes once uploaded.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `could not fetch the SVG: ${message}` }, { status: 502 });
  }
}
