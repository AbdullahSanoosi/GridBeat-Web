/**
 * Ported from GridBeat (Flutter) lib/features/news/providers/news_provider.dart.
 * ESPN's site API sends open CORS headers, so this is called directly from
 * the browser (unlike twitterapi.io, which needs a key and goes through the
 * /api/x-posts proxy route instead).
 */

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: string | null;
  author: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function parseArticle(json: Json): NewsArticle {
  const webLink = json.links?.web;
  const images: Json[] = json.images ?? [];
  const headerImage = images.find((img) => img.type === "header") ?? images[0];

  return {
    title: json.headline ?? "",
    description: json.description ?? null,
    url: webLink?.href ?? "",
    imageUrl: headerImage?.url ?? null,
    sourceName: "ESPN",
    publishedAt: json.published ?? null,
    author: json.byline ?? null,
  };
}

export async function getNews(): Promise<NewsArticle[]> {
  const res = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/racing/f1/news?limit=50",
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!res.ok) throw new Error(`ESPN news failed: ${res.status} ${res.statusText}`);
  const body = await res.json();
  const articles: Json[] = body.articles ?? [];
  return articles.map(parseArticle).filter((a) => a.title.length > 0);
}
