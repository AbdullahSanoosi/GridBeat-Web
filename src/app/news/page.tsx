"use client";

import { useQuery } from "@tanstack/react-query";
import { getNews, type NewsArticle } from "@/lib/api/news";
import { useMounted } from "@/hooks/use-mounted";
import { SkeletonRows } from "@/components/shared/skeleton";
import type { XPost, XPostsPage } from "@/lib/x-posts";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NewsPage() {
  const mounted = useMounted();

  const newsQuery = useQuery({
    queryKey: ["news"],
    queryFn: getNews,
    staleTime: 0, // no cache — same as the Flutter provider, refetches every visit
  });

  const postsQuery = useQuery({
    queryKey: ["x-posts"],
    queryFn: async (): Promise<XPostsPage> => {
      const res = await fetch("/api/x-posts");
      if (!res.ok) throw new Error(`x-posts failed: ${res.status}`);
      return res.json();
    },
    staleTime: 0,
  });

  return (
    <main className="flex-1 px-8 py-8">
      <h1 className="mb-6 font-[var(--font-f1)] text-2xl font-bold">News</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]">
        <section>
          <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">
            LATEST FROM @F1STATSGURU
          </h2>
          {!mounted || postsQuery.isLoading ? (
            <SkeletonRows count={5} className="h-24" />
          ) : postsQuery.isError ? (
            <p className="text-sm text-(--color-error)">Couldn&apos;t load posts.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {postsQuery.data?.posts.slice(0, 5).map((post) => <XPostCard key={post.id} post={post} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">
            LATEST HEADLINES
          </h2>
          {!mounted || newsQuery.isLoading ? (
            <SkeletonRows count={6} className="h-20" />
          ) : newsQuery.isError ? (
            <p className="text-sm text-(--color-error)">Couldn&apos;t load news.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {newsQuery.data?.map((article) => <NewsCard key={article.url} article={article} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function XPostCard({ post }: { post: XPost }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-primary)"
    >
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="font-medium">{post.authorName}</span>
        <span className="text-(--color-text-muted)">@{post.authorHandle}</span>
      </div>
      <p className="line-clamp-4 text-sm text-(--color-text-secondary)">{post.text}</p>
      {post.createdAt && (
        <div className="mt-2 text-xs text-(--color-text-muted)">
          {dateFormatter.format(new Date(post.createdAt))}
        </div>
      )}
    </a>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4 transition-colors hover:border-(--color-primary)"
    >
      {article.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized-fine editorial thumbnail
        <img
          src={article.imageUrl}
          alt=""
          className="h-20 w-32 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0">
        <div className="font-medium">{article.title}</div>
        {article.description && (
          <p className="mt-1 line-clamp-2 text-sm text-(--color-text-secondary)">
            {article.description}
          </p>
        )}
        <div className="mt-2 text-xs text-(--color-text-muted)">
          {article.sourceName}
          {article.publishedAt &&
            ` · ${dateFormatter.format(new Date(article.publishedAt))}`}
        </div>
      </div>
    </a>
  );
}
