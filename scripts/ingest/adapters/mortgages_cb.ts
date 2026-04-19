// Mortgages_CB: two-row header (row 4 banks, row 5 'No. of Loans' / 'Value of Loans' pairs).
// Year in col 1, period ("End-Jun"/"End-Dec") in col 2. Semi-annual data.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'Mortgages_CB';

export function runMortgagesCB(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const BANK_ROW = 4;
  const METRIC_ROW = 5;
  const DATA_START = 6;
  const YEAR_COL = 1;
  const PERIOD_COL = 2;
  const FIRST_DATA_COL = 3;
  const caveat = ctx.caveats.get(SHEET) ?? null;

  // Build column → indicator mapping. Bank label spans two cols; metric row distinguishes.
  let currentBank = '';
  const columns: { col: number; bank: string; metric: string }[] = [];
  for (let c = FIRST_DATA_COL; c <= b.C; c++) {
    const bankCell = cellAt(sheet, BANK_ROW, c);
    if (typeof bankCell === 'string' && bankCell.trim()) currentBank = bankCell.trim();
    const metricCell = cellAt(sheet, METRIC_ROW, c);
    if (typeof metricCell !== 'string' || !metricCell.trim()) continue;
    columns.push({ col: c, bank: currentBank, metric: metricCell.trim() });
  }
  // Register indicators
  for (const col of columns) {
    const id = `mortgages_${slugify(col.bank)}_${slugify(col.metric)}`;
    const unit = /value/i.test(col.metric) ? 'G$' : 'count';
    ctx.indicators.set(id, {
      id, name: `${col.bank} — ${col.metric}`, category: 'monetary',
      subcategory: 'Commercial bank mortgage loans',
      unit, frequency: 'quarterly',
      source: 'Bank of Guyana', sourceTab: SHEET, caveat,
    });
  }
  // Year may carry across blank rows
  let currentYear: number | null = null;
  for (let r = DATA_START; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    const yr = cellAt(sheet, r, YEAR_COL);
    if (typeof yr === 'number' && yr >= 2000 && yr <= 2050) currentYear = yr;
    const period = cellAt(sheet, r, PERIOD_COL);
    if (typeof period !== 'string' || !currentYear) continue;
    // End-Jun → Q2 end (Jun 30), End-Dec → Q4 end (Dec 31)
    const isJun = /end-?jun/i.test(period);
    const isDec = /end-?dec/i.test(period);
    if (!isJun && !isDec) continue;
    const periodDate = isJun ? `${currentYear}-06-30` : `${currentYear}-12-31`;
    const periodLabel = isJun ? `Q2 ${currentYear}` : `Q4 ${currentYear}`;
    for (const col of columns) {
      const raw = cellAt(sheet, r, col.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: col.col }, ctx, { format: cellFormat(sheet, r, col.col) });
      if (value === null) continue;
      const id = `mortgages_${slugify(col.bank)}_${slugify(col.metric)}`;
      ctx.observations.push({
        indicatorId: id, periodDate, periodLabel, value, scenario: 'actual',
      });
    }
  }
}
