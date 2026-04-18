// Prices_Summary: stacked commodity blocks. Each block is:
//   row N   : col 1 = commodity name, col 2 = unit (e.g. "Per KG")
//   row N+1 : year headers at col 3+ (e.g. 2021, 2022, 2023)
//   rows N+2..N+13 : col 2 = month abbreviation ("Jan" .. "Dec"), col 3+ = monthly price
// Some blocks carry summary rows off to the right ("Average Price", "YoY Growth"); we
// ignore them and only ingest the monthly time series.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { coerceHeaderToPeriod, slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'Prices_Summary';

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

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
    const c1 = cellAt(sheet, r, 1);
    const c2 = cellAt(sheet, r, 2);
    const commodity = typeof c1 === 'string' ? c1.trim() : '';
    const unit = typeof c2 === 'string' ? c2.trim() : '';
    // A commodity block header looks like: col 1 = long name, col 2 = unit
    // (not a month), and the next non-blank row has year cells at col 3+.
    const looksLikeCommodity = commodity.length > 2 && unit.length > 0 && !(unit.toLowerCase() in MONTH_MAP);
    if (!looksLikeCommodity) { r++; continue; }

    // Find the year row
    let yearRow = r + 1;
    while (yearRow <= Math.min(r + 5, b.R) && isBlankRow(sheet, yearRow, b.c, b.C)) yearRow++;
    const yearCols: { col: number; year: number }[] = [];
    for (let c = 3; c <= Math.min(b.c + 15, b.C); c++) {
      const p = coerceHeaderToPeriod(cellAt(sheet, yearRow, c), 'annual');
      if (p) yearCols.push({ col: c, year: Number(p.periodDate.slice(0, 4)) });
    }
    if (yearCols.length < 1) { r++; continue; }

    const indicatorId = `price_${slugify(commodity)}`;
    let wrote = false;
    // Scan up to ~16 rows below for month data (12 + blanks)
    const endScan = Math.min(yearRow + 18, b.R);
    for (let dr = yearRow + 1; dr <= endScan; dr++) {
      if (isBlankRow(sheet, dr, b.c, b.C)) continue;
      const monthRaw = cellAt(sheet, dr, 2);
      if (typeof monthRaw !== 'string') continue;
      const monthKey = monthRaw.trim().slice(0, 3).toLowerCase();
      const monthNum = MONTH_MAP[monthKey];
      if (!monthNum) continue;
      for (const yc of yearCols) {
        const raw = cellAt(sheet, dr, yc.col);
        if (raw === null || raw === undefined || raw === '') continue;
        const value = coerceNumber(raw, { sheet: SHEET, r: dr, c: yc.col }, ctx);
        if (value === null) continue;
        const iso = `${yc.year}-${String(monthNum).padStart(2, '0')}-01`;
        const label = `${monthRaw.trim().slice(0, 3)} ${yc.year}`;
        ctx.observations.push({
          indicatorId, periodDate: iso, periodLabel: label, value, scenario: 'actual',
        });
        wrote = true;
      }
    }
    if (wrote) {
      ctx.indicators.set(indicatorId, {
        id: indicatorId, name: commodity, category: 'prices',
        subcategory: 'Market prices summary', unit, frequency: 'monthly',
        source: 'Bureau of Statistics', sourceTab: SHEET, caveat,
      });
    }
    // Advance past this block — jump to just after the last scanned row so
    // we don't re-read its values as a fresh commodity header.
    r = endScan + 1;
  }
}
