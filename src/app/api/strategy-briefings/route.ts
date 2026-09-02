import { NextResponse } from "next/server";

/**
 * Ruth Buscombe's race strategy briefings, ported from the Flutter app's
 * `services/rss_service.dart` (same feed, same parsing rules, same 6-hour
 * cache — briefings publish about once a race weekend).
 *
 * Proxied rather than fetched from the browser for two reasons: the
 * Mailchimp archive sends no `Access-Control-Allow-Origin`, and the raw feed
 * is ~950KB because every item carries its full campaign HTML. Parsing here
 * means the client receives a few KB of teasers instead.
 */
const FEED_URL =
  "https://us5.campaign-archive.com/feed?u=9562e7f7d56479943a0deac93&id=7c6ea49296";

export const revalidate = 21600; // 6h, matching the app's CacheService TTL

export interface StrategyBriefing {
  title: string;
  link: string;
  /** HTML-stripped teaser. */
  description: string;
  pubDate: string | null;
}

/** Inner text of a named tag, unwrapping an optional CDATA section. */
function tagText(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`, "i");
  return re.exec(block)?.[1]?.trim() ?? null;
}

/**
 * RSS `<link>` is usually plain text between the tags, but some Mailchimp
 * feeds emit the URL as a bare text node right after `</title>` instead —
 * the Dart version handles both, so this does too.
 */
function itemLink(block: string): string | null {
  const plain = tagText(block, "link");
  if (plain?.startsWith("http")) return plain;
  return /<\/title>\s*(https?:\/\/[^\s<]+)/.exec(block)?.[1] ?? null;
}

/**
 * Drops `<style>`/`<script>` blocks *with their contents* before stripping
 * tags — otherwise Mailchimp's inline CSS leaks into the teaser as text.
 * That was a real bug in the Flutter version, fixed there and kept fixed here.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** RFC 2822: "Thu, 25 Jul 2024 09:00:00 +0000" */
function parseDate(value: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(20_000),
      next: { revalidate },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `feed ${res.status}` }, { status: 502 });
    }

    const xml = await res.text();
    const briefings: StrategyBriefing[] = [];

    for (const match of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)) {
      const block = match[1];
      const title = tagText(block, "title");
      const link = itemLink(block);
      if (!title || !link) continue;

      const plain = stripHtml(tagText(block, "description") ?? "");
      briefings.push({
        title,
        link,
        description: plain.length > 180 ? `${plain.slice(0, 180)}…` : plain,
        pubDate: parseDate(tagText(block, "pubDate")),
      });
    }

    return NextResponse.json(
      { briefings: briefings.slice(0, 6) },
      { headers: { "cache-control": `public, s-maxage=${revalidate}, stale-while-revalidate=3600` } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "feed unavailable" },
      { status: 502 },
    );
  }
}
