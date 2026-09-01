/**
 * Renders an FIA document's text layer. Built on `_FormattedText` /
 * `_parseTextBlocks` from the Flutter app's fia_docs_screen.dart, with a
 * layout decision the Dart version doesn't make — see "Two shapes" below.
 *
 * FIA PDFs carry no markup; the text layer is just lines. Lines classify
 * into headers, bullets and paragraphs so a document keeps its structure.
 *
 * ── Two shapes, measured not guessed ──────────────────────────────────
 * Across 207 raw-text-only documents in the 2026 season these split into
 * two populations, and **median line length** separates them cleanly:
 *
 *   PROSE     median 57–99 chars — real sentences (Self Scrutineering,
 *             Race Director's Notes, the procedures). Consecutive lines are
 *             a wrapped paragraph and should merge. 121 documents.
 *   FRAGMENT  median 3–10 chars — a flattened table or form, where every
 *             line is one cell: "VENUE", "Zandvoort", "CENTRELINE",
 *             "4.259 km" (Power Unit Information, Entry List, Competition
 *             Visa). Merging here is destructive; so is stacking 122 cells
 *             in a single column. 86 documents.
 *
 * An earlier version discriminated on "does the document contain a blank
 * line", which barely worked — 82% of these documents have blank lines
 * either way.
 *
 * In FRAGMENT documents, headers and bullets still render as themselves
 * (the Pirelli notice is fragment-shaped but carries 17 real bullets); only
 * runs of bare cells collapse into a compact grid.
 */

type Block =
  | { kind: "header"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "para"; text: string };

const collapseWs = (s: string) => s.replace(/\s+/g, " ").trim();

/** A line that is *only* a marker — its text follows on later lines. */
const isBulletMarker = (line: string) => line === "•" || line === "-";

const startsWithBullet = (line: string) => line.startsWith("• ") || /^-\s+\S/.test(line);

const stripBulletPrefix = (line: string) =>
  line.startsWith("•") ? line.slice(1).trim() : line.replace(/^-\s+/, "").trim();

/**
 * A line resuming in lowercase is wrapped text continuing the block above —
 * this is what reunites "its correspondent interval" with its bullet.
 */
const isContinuation = (line: string) => /^[a-z]/.test(line);

/** All-caps runs and short colon-terminated lines are how these mark sections. */
function looksLikeHeader(line: string): boolean {
  if (line.length === 0 || line.length > 90) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  const isAllCaps = letters.length >= 4 && letters === letters.toUpperCase();
  const wordCount = line.split(/\s+/).length;
  if (isAllCaps && wordCount <= 14) return true;
  if (line.endsWith(":") && wordCount <= 8) return true;
  return false;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Typical line too short to be a sentence ⇒ a flattened table, not prose. */
function isFragmentDoc(raw: string): boolean {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 12) return false;
  return median(lines.map((l) => l.length)) <= 32;
}

function parseTextBlocks(raw: string): { blocks: Block[]; fragment: boolean } {
  const fragment = isFragmentDoc(raw);
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const breaksBlock = (l: string) =>
    l.length === 0 || isBulletMarker(l) || startsWithBullet(l) || looksLikeHeader(l);

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.length === 0) {
      i++;
      continue;
    }

    if (isBulletMarker(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !breaksBlock(lines[i].trim())) {
        buf.push(lines[i].trim());
        i++;
      }
      if (buf.length > 0) blocks.push({ kind: "bullet", text: collapseWs(buf.join(" ")) });
      continue;
    }

    if (startsWithBullet(line)) {
      const buf = [stripBulletPrefix(line)];
      i++;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (breaksBlock(l) || !isContinuation(l)) break;
        buf.push(l);
        i++;
      }
      blocks.push({ kind: "bullet", text: collapseWs(buf.join(" ")) });
      continue;
    }

    if (looksLikeHeader(line)) {
      blocks.push({ kind: "header", text: line });
      i++;
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i].trim();
      if (breaksBlock(l)) break;
      // In a fragment document only a wrapped (lowercase) line joins its
      // predecessor; every other line is its own cell.
      if (fragment && !isContinuation(l)) break;
      buf.push(l);
      i++;
    }
    blocks.push({ kind: "para", text: collapseWs(buf.join(" ")) });
  }

  return { blocks: blocks.filter((b) => b.text.length > 0), fragment };
}

/** A run of ≥4 consecutive cells is a table body — lay it out as a grid. */
const GRID_RUN = 4;

type Group = { kind: "block"; block: Block } | { kind: "cells"; cells: string[] };

function group(blocks: Block[], fragment: boolean): Group[] {
  if (!fragment) return blocks.map((block) => ({ kind: "block", block }) as Group);

  const out: Group[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].kind === "para") {
      let j = i;
      while (j < blocks.length && blocks[j].kind === "para") j++;
      const run = blocks.slice(i, j).map((b) => b.text);
      if (run.length >= GRID_RUN) {
        out.push({ kind: "cells", cells: run });
        i = j;
        continue;
      }
    }
    out.push({ kind: "block", block: blocks[i] });
    i++;
  }
  return out;
}

export function FormattedText({ text, emphasis }: { text: string; emphasis?: boolean }) {
  const { blocks, fragment } = parseTextBlocks(text);
  const groups = group(blocks, fragment);

  return (
    <div className="flex flex-col">
      {groups.map((g, i) => {
        const first = i === 0;

        if (g.kind === "cells") {
          return (
            <div
              key={i}
              className={`grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4 ${first ? "" : "mt-2"}`}
            >
              {g.cells.map((c, j) => (
                <span key={j} className="truncate text-[12px] leading-[1.6] text-(--color-text-secondary)" title={c}>
                  {c}
                </span>
              ))}
            </div>
          );
        }

        const b = g.block;

        if (b.kind === "header") {
          return (
            <p
              key={i}
              className={`font-[var(--font-f1)] text-[11px] leading-[1.4] font-extrabold tracking-[0.08em] text-(--color-primary) ${
                first ? "" : "mt-4"
              }`}
            >
              {b.text}
            </p>
          );
        }

        if (b.kind === "bullet") {
          return (
            <div key={i} className={`flex gap-2.5 ${first ? "" : "mt-2"}`}>
              <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-(--color-text-secondary)/80" />
              <p className="text-[13px] leading-[1.5] text-(--color-text-secondary)">{b.text}</p>
            </div>
          );
        }

        return (
          <p
            key={i}
            className={`text-[13px] leading-[1.5] ${first ? "" : "mt-2"} ${
              emphasis ? "font-bold text-(--color-text-primary)" : "text-(--color-text-secondary)"
            }`}
          >
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
