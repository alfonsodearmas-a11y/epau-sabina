// Prices_Summary: stacked commodity blocks, each with its own local header.
// Layout pattern (observed for "Chicken, Frozen/Fresh"):
//   row N   : commodity name at col 1, unit at col 2
//   row N+1 : year header at col 3+ ("2021", "2022", "2023")
//   row N+2..: month/subtype labels at col 1, prices in year cols
// Because markets/categories vary per block, we do a streaming scan: any row where
// col 1 text is followed by a row with year cells defines a new block.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { coerceHeaderToPeriod, slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'Prices_Summary';

export function runPricesSummary(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const caveat = ctx.caveats.get(SHEET) ?? null;

  let r = b.r + 1;
  while (r <= b.R) {
    if (isBlankRow(sheet, r, b.c, b.C)) { r++; continue; }
    if (isNavCell(cellAt(sheet, r, 0))) { r++; continue; }
    const headerA = cellAt(sheet, r, 1);
    const unitA = cellAt(sheet, r, 2);
    // If next non-blank row has year cells starting at col 3, treat (r) as commodity header
    let lookAhead = r + 1;
    while (lookAhead <= Math.min(r + 3, b.R) && isBlankRow(sheet, lookAhead, b.c, b.C)) lookAhead++;
    const yearCols: { col: number; periodDate: string; periodLabel: string }[] = [];
    for (let c = 2; c <= b.C; c++) {
      const p = coerceHeaderToPeriod(cellAt(sheet, lookAhead, c), 'annual');
      if (p) yearCols.push({ col: c, periodDate: p.periodDate, periodLabel: p.periodLabel });
    }
    if (yearCols.length >= 2 && typeof headerA === 'string' && headerA.trim()) {
      const commodity = headerA.trim();
      const unit = typeof unitA === 'string' && unitA.trim() ? unitA.trim() : 'G$';
      // Data rows follow lookAhead until a new header or end
      let dr = lookAhead + 1;
      while (dr <= b.R) {
        if (isBlankRow(sheet, dr, b.c, b.C)) { dr++; continue; }
        const subLabelRaw = cellAt(sheet, dr, 1);
        if (typeof subLabelRaw !== 'string' || !subLabelRaw.trim()) { dr++; continue; }
        const subLabel = subLabelRaw.trim();
        // Detect whether this row is actually the next block header — heuristic:
        // if any col 3+ at dr+1 has a year, dr is probably a new header. Break.
        let nextHasYears = false;
        for (let c = 2; c <= b.C; c++) {
          if (coerceHeaderToPeriod(cellAt(sheet, dr + 1, c), 'annual')) { nextHasYears = true; break; }
        }
        if (nextHasYears) break;
        const indicatorId = `price_${slugify(commodity)}_${slugify(subLabel)}`;
        let wrote = false;
        for (const yc of yearCols) {
          const raw = cellAt(sheet, dr, yc.col);
          if (raw === null || raw === undefined || raw === '') continue;
          const value = coerceNumber(raw, { sheet: SHEET, r: dr, c: yc.col }, ctx);
          if (value === null) continue;
          ctx.observations.push({
            indicatorId, periodDate: yc.periodDate, periodLabel: yc.periodLabel,
            value, scenario: 'actual',
          });
          wrote = true;
        }
        if (wrote) {
          ctx.indicators.set(indicatorId, {
            id: indicatorId, name: `${commodity} — ${subLabel}`, category: 'prices',
            subcategory: 'Market prices summary', unit, frequency: 'annual',
            source: 'Bureau of Statistics', sourceTab: SHEET, caveat,
          });
        }
        dr++;
      }
      r = dr;
      continue;
    }
    r++;
  }
}
