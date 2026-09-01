"use client";

import { useQuery } from "@tanstack/react-query";
import type { DocPage } from "@/lib/models/fia-docs";

/**
 * Renders a document the way it's laid out in the PDF.
 *
 * Rows normally arrive already extracted, in `fia_decisions.content_rows`
 * (f1-stats-api's `_extract_rows()`). `/api/fia-doc` is the fallback for
 * documents ingested before that column existed — it re-derives the same
 * shape from the PDF in the browser's stead, at the cost of a fetch.
 *
 * This replaces guessing at structure from the flattened `raw_text`: a row
 * that reads `ROUND No. ┃ R12` in the PDF renders as a two-column row here
 * instead of two orphaned fragments.
 *
 * Rows are classified by cell count — a single wide cell is a heading or a
 * sentence, several cells are a table row — so a document's real shape
 * carries through without hardcoding anything per document.
 */

async function fetchLayout(pdfUrl: string): Promise<DocPage[]> {
  const res = await fetch(`/api/fia-doc?url=${encodeURIComponent(pdfUrl)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `layout unavailable (${res.status})`);
  }
  const data = (await res.json()) as { pages: DocPage[] };
  return data.pages;
}

export function PdfLayout({ pdfUrl, pages }: { pdfUrl: string; pages?: DocPage[] | null }) {
  const stored = pages != null && pages.length > 0;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["fia-doc-layout", pdfUrl],
    queryFn: () => fetchLayout(pdfUrl),
    enabled: !stored, // nothing to fetch when the API already sent rows
    staleTime: Infinity, // a published document never changes
    retry: false,
  });

  const doc = stored ? pages : data;

  if (!stored && isLoading) {
    return (
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-(--color-surface-elevated)" />
        ))}
      </div>
    );
  }

  if (!stored && isError) {
    return (
      <p className="text-[12px] text-(--color-text-muted)">
        Couldn&apos;t read the original layout ({error instanceof Error ? error.message : "unknown error"}).
      </p>
    );
  }

  if (!doc || doc.length === 0) {
    return <p className="text-[12px] text-(--color-text-muted)">This document has no extractable text layer.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {doc.map((page) => (
        <div key={page.page} className="flex flex-col gap-1">
          {page.rows.map((row, i) => {
            // One wide cell = a heading or a sentence, not a table row.
            if (row.length === 1) {
              const text = row[0];
              const letters = text.replace(/[^A-Za-z]/g, "");
              const isHeading =
                text.length <= 90 && letters.length >= 4 && letters === letters.toUpperCase();
              return isHeading ? (
                <p
                  key={i}
                  className="mt-3 font-[var(--font-f1)] text-[11px] font-extrabold tracking-[0.08em] text-(--color-primary) first:mt-0"
                >
                  {text}
                </p>
              ) : (
                <p key={i} className="text-[12.5px] leading-[1.5] text-(--color-text-secondary)">
                  {text}
                </p>
              );
            }

            // A real table row — first cell reads as the label.
            return (
              // Cells wrap rather than force the page wide — an FIA table can
              // run to seven columns, which will not fit a phone.
              <div
                key={i}
                className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-(--color-divider)/60 py-1 last:border-0"
              >
                {row.map((cell, j) => (
                  <span
                    key={j}
                    className={`min-w-[5rem] flex-1 text-[12.5px] ${
                      j === 0 ? "font-medium text-(--color-text-primary)" : "text-(--color-text-secondary)"
                    }`}
                  >
                    {cell}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
