"use client";

import { useQuery } from "@tanstack/react-query";
import { BrainCircuit } from "lucide-react";
import { getNews, type NewsArticle } from "@/lib/api/news";
import { useMounted } from "@/hooks/use-mounted";
import { Skeleton, SkeletonRows } from "@/components/shared/skeleton";
import type { StrategyBriefing } from "@/app/api/strategy-briefings/route";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const briefingDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Amber, matching the app's own strategy-briefing card. */
const AMBER = "#FFB300";

export default function NewsPage() {
  const mounted = useMounted();

  const newsQuery = useQuery({
    queryKey: ["news"],
    queryFn: getNews,
    staleTime: 0, // no cache — same as the Flutter provider, refetches every visit
  });

  const briefingsQuery = useQuery({
    queryKey: ["strategy-briefings"],
    queryFn: async (): Promise<StrategyBriefing[]> => {
      const res = await fetch("/api/strategy-briefings");
      if (!res.ok) throw new Error(`briefings failed: ${res.status}`);
      const json = await res.json();
      return json.briefings ?? [];
    },
    // The feed publishes about once a race weekend; the route caches for 6h.
    staleTime: 6 * 60 * 60 * 1000,
  });

  return (
    <main className="flex-1 px-8 py-8">
      <h1 className="mb-6 font-[var(--font-f1)] text-2xl font-bold">News</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
        <section>
          <h2 className="mb-3 text-xs font-bold tracking-widest text-(--color-text-muted)">
            RACE STRATEGY
          </h2>
          {!mounted || briefingsQuery.isLoading ? (
            <Skeleton className="h-56" />
          ) : briefingsQuery.isError ? (
            <p className="text-sm text-(--color-error)">Couldn&apos;t load briefings.</p>
          ) : (briefingsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-(--color-text-muted)">No briefings published yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <BriefingCard briefing={briefingsQuery.data![0]} featured />
              {briefingsQuery.data!.slice(1, 4).map((b) => (
                <BriefingCard key={b.link} briefing={b} />
              ))}
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

/**
 * Ports the Flutter `_StrategyBriefingCard`: amber accent stripe down the
 * left edge, a soft amber glow bleeding in from the top-right, the
 * "STRATEGY BRIEFING" eyebrow and Ruth Buscombe's byline.
 *
 * Links out to the author's own archive, the same as the app does and the
 * same as the ESPN headlines beside it — this is someone else's newsletter,
 * not GridBeat data to render natively.
 */
function BriefingCard({ briefing, featured }: { briefing: StrategyBriefing; featured?: boolean }) {
  const date = briefing.pubDate ? briefingDateFormatter.format(new Date(briefing.pubDate)) : "";

  return (
    <a
      href={briefing.link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) transition-colors hover:border-[color:var(--briefing-accent)]"
      style={{ "--briefing-accent": AMBER } as React.CSSProperties}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: AMBER }} />
      {featured && (
        <span
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full"
          style={{ background: `radial-gradient(circle, ${AMBER}26, transparent 70%)` }}
        />
      )}

      <div className={`relative ${featured ? "p-5 pl-6" : "p-4 pl-5"}`}>
        {featured && (
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
              style={{
                color: AMBER,
                borderColor: `${AMBER}66`,
                backgroundColor: `${AMBER}2e`,
              }}
            >
              <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div
                className="text-[10px] font-black tracking-[0.18em] uppercase"
                style={{ color: AMBER }}
              >
                Strategy briefing
              </div>
              <div className="mt-0.5 truncate text-[10px] text-(--color-text-muted)">
                {date ? `Ruth Buscombe · ${date}` : "By Ruth Buscombe"}
              </div>
            </div>
          </div>
        )}

        <div className={featured ? "text-[15px] leading-snug font-bold" : "text-[13px] leading-snug font-semibold"}>
          {briefing.title}
        </div>

        {featured && briefing.description && (
          <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-(--color-text-secondary)">
            {briefing.description}
          </p>
        )}

        {!featured && date && (
          <div className="mt-1.5 text-[10px] text-(--color-text-muted)">{date}</div>
        )}
      </div>
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
