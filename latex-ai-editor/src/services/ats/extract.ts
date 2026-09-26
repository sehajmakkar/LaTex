import type { LayoutSignals } from "@/services/ats/types";

export type Extraction = { text: string; layout: LayoutSignals };

/** Private-use glyphs (icon fonts such as FontAwesome) and replacement characters. */
const UNREADABLE = /[-�]/g;

type TextItem = { str: string; transform: number[]; width: number };
type PageProxy = {
  view: number[];
  getTextContent: (opts: object) => Promise<{ items: TextItem[] }>;
};

/**
 * Rebuilds a page's text line by line from positioned text items, and records
 * where each text block starts so we can spot a second column.
 */
function analysePage(items: TextItem[], pageWidth: number) {
  const lines = new Map<number, { x: number; end: number; str: string }[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5] / 2) * 2;
    const x = item.transform[4];
    const row = lines.get(y) ?? [];
    row.push({ x, end: x + item.width, str: item.str });
    lines.set(y, row);
  }

  const textLines: string[] = [];
  /** Per row: start positions (1% of page width) of blocks beyond 30% of the width. */
  const rowStarts: number[][] = [];
  for (const y of [...lines.keys()].sort((a, b) => b - a)) {
    const row = lines.get(y)!.sort((a, b) => a.x - b.x);
    const segments: { x: number; end: number; str: string }[] = [];
    for (const piece of row) {
      const last = segments[segments.length - 1];
      if (last && piece.x - last.end < pageWidth * 0.04) {
        last.str += (piece.x - last.end > 1 ? " " : "") + piece.str;
        last.end = piece.end;
      } else {
        segments.push({ ...piece });
      }
    }
    textLines.push(segments.map((s) => s.str.trim()).join("   "));
    rowStarts.push(segments.filter((s) => s.x > pageWidth * 0.3).map((s) => Math.round((s.x / pageWidth) * 100)));
  }
  return { text: textLines.join("\n"), rowStarts };
}

/**
 * A second column shows up as many rows whose text starts at the same x
 * position past 30% of the width (a left-aligned sidebar or main column).
 * Right-aligned dates start at varying positions, so they don't add up.
 */
function detectColumns(rowStarts: number[][]): boolean | null {
  if (rowStarts.length === 0) return null;
  const counts = new Map<number, number>();
  for (const starts of rowStarts) {
    for (const x of new Set(starts)) counts.set(x, (counts.get(x) ?? 0) + 1);
  }
  let best = 0;
  for (const x of counts.keys()) {
    const aligned = (counts.get(x - 1) ?? 0) + (counts.get(x) ?? 0) + (counts.get(x + 1) ?? 0);
    best = Math.max(best, aligned);
  }
  return best >= 8 && best / rowStarts.length >= 0.15;
}

export async function extractPdf(buffer: Buffer): Promise<Extraction> {
  // Import the library file directly: pdf-parse's index.js runs a debug self-test
  // when it thinks it's the entry module.
  const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = ("default" in pdfParseModule ? pdfParseModule.default : pdfParseModule) as (
    data: Buffer,
    options?: { pagerender?: (page: PageProxy) => Promise<string> }
  ) => Promise<{ numpages: number; text: string }>;

  const rowStarts: number[][] = [];
  const result = await pdfParse(buffer, {
    pagerender: async (page) => {
      const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const analysis = analysePage(content.items, page.view[2] - page.view[0]);
      rowStarts.push(...analysis.rowStarts);
      return analysis.text;
    },
  });

  const text = result.text.replace(/\n{3,}/g, "\n\n").trim();
  return {
    text: text.replace(UNREADABLE, " "),
    layout: {
      fileType: "pdf",
      pages: result.numpages,
      hasTextLayer: text.replace(/\s/g, "").length > 100,
      multiColumn: detectColumns(rowStarts),
      tables: null,
      images: null,
      unreadableChars: (text.match(UNREADABLE) ?? []).length,
    },
  };
}

export async function extractDocx(buffer: Buffer): Promise<Extraction> {
  const mammoth = await import("mammoth");
  const [raw, html] = await Promise.all([mammoth.extractRawText({ buffer }), mammoth.convertToHtml({ buffer })]);
  const text = (raw.value || "").replace(/\n{3,}/g, "\n\n").trim();
  return {
    text: text.replace(UNREADABLE, " "),
    layout: {
      fileType: "docx",
      pages: null,
      hasTextLayer: text.replace(/\s/g, "").length > 100,
      multiColumn: null,
      tables: (html.value.match(/<table/g) ?? []).length,
      images: (html.value.match(/<img/g) ?? []).length,
      unreadableChars: (text.match(UNREADABLE) ?? []).length,
    },
  };
}

export function extractTxt(buffer: Buffer): Extraction {
  const text = buffer.toString("utf-8").trim();
  return {
    text,
    layout: {
      fileType: "txt",
      pages: null,
      hasTextLayer: text.length > 100,
      multiColumn: null,
      tables: null,
      images: null,
      unreadableChars: (text.match(UNREADABLE) ?? []).length,
    },
  };
}
