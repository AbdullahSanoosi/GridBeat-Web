/**
 * Shared types + parsing for the X posts feed, ported from GridBeat (Flutter)
 * lib/features/news/data/x_posts_service.dart. Parsing runs server-side now
 * (inside app/api/x-posts/route.ts) — the browser never talks to
 * twitterapi.io directly, so it never sees the raw tweet shape or the API key.
 */

export interface XPost {
  id: string;
  url: string;
  text: string;
  createdAt: string | null; // ISO string, or null if unparseable
  likeCount: number;
  replyCount: number;
  retweetCount: number;
  viewCount: number;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
  isRetweet: boolean;
  imageUrls: string[];
}

export interface XPostsPage {
  posts: XPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function parseXPost(json: Json): XPost {
  // Retweets: prefer the retweeted content, keep the reposter's author info
  // so the UI can label it "@handle reposted".
  const rt = json.retweeted_tweet ?? null;
  const content = rt ?? json;
  const author = json.author ?? {};
  const contentAuthor = content.author ?? author;

  const media = content.extendedEntities?.media ?? [];
  const imageUrls: string[] = media
    .filter((m: Json) => m?.type === "photo")
    .map((m: Json) => m?.media_url_https)
    .filter((u: unknown): u is string => typeof u === "string");

  return {
    id: String(content.id ?? ""),
    url: content.url ?? `https://x.com/${contentAuthor.userName}/status/${content.id}`,
    text: content.text ?? "",
    createdAt: parseTwitterDate(content.createdAt),
    likeCount: Number(content.likeCount ?? 0),
    replyCount: Number(content.replyCount ?? 0),
    retweetCount: Number(content.retweetCount ?? 0),
    viewCount: Number(content.viewCount ?? 0),
    authorName: contentAuthor.name ?? "",
    authorHandle: contentAuthor.userName ?? "",
    authorAvatarUrl: contentAuthor.profilePicture ?? null,
    authorVerified: contentAuthor.isBlueVerified === true,
    isRetweet: rt != null,
    imageUrls,
  };
}

/** Twitter timestamps look like "Tue Dec 10 07:00:30 +0000 2024". */
function parseTwitterDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const parts = s.split(" ");
  if (parts.length < 6) return null;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[parts[1]];
  const day = Number(parts[2]);
  const [hour, minute, second] = parts[3].split(":").map(Number);
  const year = Number(parts[5]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;
  const date = new Date(Date.UTC(year, month, day, hour, minute, second));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
