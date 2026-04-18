// Capital Expenditure_Sector: title block at rows 2-5, header row 7 with
// "SECTOR AND SOURCE" at col 1 and years at col 3+. Row 8 is a unit sub-header.
// Data rows start at r=9; col 0 may carry a sector-number prefix.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';
import { extractYearColumns } from '../lib/headers';

const SHEET = 'Capital Expenditure_Sector';

export function runCapexSector(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const HEADER_ROW = 7;
  const DATA_START = 9;
  const LABEL_COL = 2; // col 2 has indicator like "Agriculture"; col 1 is a numeric index
  const caveat = ctx.caveats.get(SHEET) ?? null;
  const yearCols = extractYearColumns(sheet, HEADER_ROW, 'annual');
  if (!yearCols.length) {
    ctx.pushIssue({ sheet: SHEET, reason: 'No year columns found at Capital Expenditure header row.', severity: 'error' });
    return;
  }
  for (let r = DATA_START; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    const labelRaw = cellAt(sheet, r, LABEL_COL);
    if (typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
    const label = labelRaw.trim();
    if (/^G\$|^US\$|^\(|^TOTAL$/i.test(label)) continue;
    const id = `capex_sector_${slugify(label)}`;
    let wrote = false;
    for (const yc of yearCols) {
      const raw = cellAt(sheet, r, yc.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: yc.col }, ctx);
      if (value === null) continue;
      ctx.observations.push({
        indicatorId: id, periodDate: yc.periodDate, periodLabel: yc.periodLabel,
        value, scenario: 'actual',
      });
      wrote = true;
    }
    if (wrote) {
      ctx.indicators.set(id, {
        id, name: label, category: 'fiscal', subcategory: 'Capital expenditure by sector',
        unit: 'G$ thousands', frequency: 'annual',
        source: 'MoF PCMD', sourceTab: SHEET, caveat,
      });
    }
  }
}
