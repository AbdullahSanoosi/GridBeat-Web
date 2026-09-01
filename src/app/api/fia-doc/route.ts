import { NextResponse } from "next/server";
import { getDocumentProxy } from "unpdf";

/**
 * Reconstructs an FIA document's real table layout from its PDF.
 *
 * Why this exists: `fia_decisions.raw_text` is the PDF's text layer
 * flattened column-major, which destroys row structure. The PDF itself has
 * it — `ROUND No. ┃ R12`, `Compound ┃ FL ┃ FR ┃ RL ┃ RR` — so the rows are
 * recoverable, just not from the stored text. This route fetches the PDF
 * server-side (fia.com sends no CORS headers, so the browser can't),
 * extracts positioned text runs, and groups them back into rows and cells
 * by coordinate.
 *
 * Page 1 of every FIA document is the cover sheet (From / To / Document /
 * Date / Title / Enclosed / signature) — metadata already held in columns,
 * so it's skipped.
 *
 * SSRF: only fia.com PDFs are fetchable. The `url` parameter comes from a
 * `pdf_url` column, but it still arrives via the client, so it is validated
 * here rather than trusted.
 */

const ALLOWED_HOST = "www.fia.com";

/** Same row when baselines are within this many points. */
const ROW_TOLERANCE = 3;
/** Horizontal gap that separates one cell from the next. */
const CELL_GAP = 10;

import type { DocPage } from "@/lib/models/fia-docs";

interface TextItem {
  str: string;
  transform: number[];
  width: number;
}

function isAllowed(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== ALLOWED_HOST) return null;
  return url;
}

/** Groups positioned text runs back into visual rows, then cells. */
function toRows(items: TextItem[]): string[][] {
  const withText = items.filter((i) => i.str.trim().length > 0);
  if (withText.length === 0) return [];

  const buckets = new Map<number, TextItem[]>();
  for (const item of withText) {
    // transform[5] is the baseline y; PDF origin is bottom-left.
    const key = Math.round(item.transform[5] / ROW_TOLERANCE);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  const rows: string[][] = [];
  // Descending y = top of the page first.
  for (const key of [...buckets.keys()].sort((a, b) => b - a)) {
    const line = buckets.get(key)!.sort((a, b) => a.transform[4] - b.transform[4]);

    const cells: string[] = [];
    let current = line[0].str;
    for (let i = 1; i < line.length; i++) {
      const prev = line[i - 1];
      const item = line[i];
      const gap = item.transform[4] - (prev.transform[4] + prev.width);
      if (gap > CELL_GAP) {
        cells.push(current.trim());
        current = item.str;
      } else {
        // pdf.js splits a word across runs with no gap; a small positive gap
        // is a real space that would otherwise be lost ("Overtake notactive").
        current += (gap > 0.5 ? " " : "") + item.str;
      }
    }
    cells.push(current.trim());

    const cleaned = cells.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (cleaned.length > 0) rows.push(cleaned);
  }
  return rows;
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const url = isAllowed(raw);
  if (!url) return NextResponse.json({ error: "url not permitted" }, { status: 403 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GridBeat/1.0)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `fia.com returned ${res.status}` }, { status: 502 });
    }

    const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
    const pages: DocPage[] = [];

    // Skip page 1 — the cover sheet is metadata we already hold in columns.
    const start = pdf.numPages > 1 ? 2 : 1;
    for (let n = start; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const rows = toRows(content.items as unknown as TextItem[]);
      if (rows.length > 0) pages.push({ page: n, rows });
    }

    return NextResponse.json(
      { pages },
      {
        // These documents never change once published.
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `could not read the PDF: ${message}` }, { status: 502 });
  }
}
