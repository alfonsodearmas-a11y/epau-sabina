// Parse the 'List of Sheets' index tab. It holds MoF's own caveats for many series;
// capture verbatim and key by sheet name so downstream adapters can attach them
// to indicators from that sheet.
//
// Structure (observed): column B and C carry sheet name and caveat text in free-form.
// We walk the full bounds and accumulate any non-empty string associations between
// adjacent cells where a sheet name appears.

import type { WorkBook } from 'xlsx';
import type { IngestContext } from './types';
import { cellAt, sheetBounds } from './cells';

export function parseListOfSheets(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets['List of Sheets'];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const knownSheets = new Set(book.SheetNames.map((n) => n.toLowerCase()));
  // Walk rows; look for a cell whose string value (case-insensitively, trimmed) matches a sheet name.
  // If a neighbouring cell in the same row has a longer free-text string, treat it as a caveat or description.
  for (let r = b.r; r <= b.R; r++) {
    const rowVals: { c: number; text: string }[] = [];
    for (let c = b.c; c <= Math.min(b.c + 20, b.C); c++) {
      const v = cellAt(sheet, r, c);
      if (typeof v === 'string' && v.trim()) rowVals.push({ c, text: v.trim() });
    }
    if (rowVals.length < 2) continue;
    // Find a sheet-name match
    const nameIdx = rowVals.findIndex((x) => knownSheets.has(x.text.toLowerCase()));
    if (nameIdx < 0) continue;
    const sheetName = rowVals[nameIdx]!.text;
    // Longest other cell becomes the caveat/description
    const others = rowVals.filter((_, i) => i !== nameIdx);
    const longest = others.reduce<{ text: string } | null>(
      (best, cur) => (!best || cur.text.length > best.text.length ? cur : best),
      null,
    );
    if (longest && longest.text.length > 20) {
      // Resolve sheet name to its book-casing
      const canonical = book.SheetNames.find((n) => n.toLowerCase() === sheetName.toLowerCase())!;
      // Prefer the longest caveat we see for a given sheet
      const existing = ctx.caveats.get(canonical);
      if (!existing || longest.text.length > existing.length) ctx.caveats.set(canonical, longest.text);
    }
  }
}
