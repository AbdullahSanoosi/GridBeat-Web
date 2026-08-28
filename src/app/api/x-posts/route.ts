/**
 * Server-side proxy for twitterapi.io, ported from GridBeat (Flutter)
 * lib/features/news/data/x_posts_service.dart. The Flutter version's own
 * source comment flagged the API key as "TEMPORARY: lives client-side for
 * prototyping... move to gridbeat-backend before shipping" — this route is
 * that move: TWITTER_API_KEY is read server-side only (no NEXT_PUBLIC_
 * prefix), the browser only ever calls this same-origin endpoint.
 *
 * GET /api/x-posts?handle=f1statsguru&cursor=...
 */
import { NextRequest, NextResponse } from "next/server";
import { parseXPost, type XPostsPage } from "@/lib/x-posts";

const TWITTERAPI_BASE = "https://api.twitterapi.io";
const DEFAULT_HANDLE = "f1statsguru";

export async function GET(request: NextRequest) {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TWITTER_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle") ?? DEFAULT_HANDLE;
  const cursor = searchParams.get("cursor");

  const upstreamParams = new URLSearchParams({
    userName: handle,
    includeReplies: "false",
  });
  if (cursor) upstreamParams.set("cursor", cursor);

  const res = await fetch(
    `${TWITTERAPI_BASE}/twitter/user/last_tweets?${upstreamParams.toString()}`,
    {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(20_000),
    },
  );

  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status !== "success") {
    const message = body?.msg ?? body?.message ?? `upstream ${res.status}`;
    return NextResponse.json({ error: `twitterapi.io: ${message}` }, { status: 502 });
  }

  const raw: unknown[] = body.data?.tweets ?? [];
  const page: XPostsPage = {
    posts: raw.map(parseXPost),
    nextCursor: body.next_cursor ? String(body.next_cursor) : null,
    hasMore: body.has_next_page === true,
  };

  return NextResponse.json(page);
}
