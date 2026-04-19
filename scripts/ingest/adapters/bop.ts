// BOP: dedicated Year + Period columns, quarterly values stacked (often only Q4 observed).
// Header at row 5: "Year | Period | Current Account | Capital Account | Errors And Omission | Overall Balance"
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify, isoToQuarter, yearToAnnual } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'BOP';

export function runBOP(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const HEADER = 5;
  const DATA_START = 6;
  const YEAR_COL = 1;
  const PERIOD_COL = 2;
  const FIRST_DATA_COL = 3;
  const caveat = ctx.caveats.get(SHEET) ?? null;

  // Read header labels from row 5 starting at col 3
  const labels: { col: number; name: string }[] = [];
  for (let c = FIRST_DATA_COL; c <= b.C; c++) {
    const raw = cellAt(sheet, HEADER, c);
    if (typeof raw === 'string' && raw.trim()) labels.push({ col: c, name: raw.trim() });
  }
  if (!labels.length) {
    ctx.pushIssue({ sheet: SHEET, reason: 'No BOP column headers found at row 6.', severity: 'error' });
    return;
  }
  for (const lbl of labels) {
    const id = `bop_${slugify(lbl.name)}`;
    ctx.indicators.set(id, {
      id, name: lbl.name, category: 'external', subcategory: 'Balance of payments',
      unit: 'US$ millions', frequency: 'quarterly',
      source: 'Bank of Guyana', sourceTab: SHEET, caveat,
    });
  }
  for (let r = DATA_START; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    const yearRaw = cellAt(sheet, r, YEAR_COL);
    const periodRaw = cellAt(sheet, r, PERIOD_COL);
    let periodDate: string | null = null;
    let periodLabel = '';
    let frequency: 'annual' | 'quarterly' = 'annual';
    if (typeof periodRaw === 'string') {
      const q = /^(\d{4})Q([1-4])$/i.exec(periodRaw.trim());
      if (q) {
        const y = Number(q[1]);
        const qn = Number(q[2]);
        const p = isoToQuarter(`${y}-${String(qn * 3).padStart(2, '0')}-15`);
        if (p) { periodDate = p.periodDate; periodLabel = p.periodLabel; frequency = 'quarterly'; }
      }
    }
    if (!periodDate && typeof yearRaw === 'number' && yearRaw >= 1980 && yearRaw <= 2050) {
      const p = yearToAnnual(yearRaw);
      periodDate = p.periodDate; periodLabel = p.periodLabel; frequency = 'annual';
    }
    if (!periodDate) continue;
    for (const lbl of labels) {
      const raw = cellAt(sheet, r, lbl.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: lbl.col }, ctx, { format: cellFormat(sheet, r, lbl.col) });
      if (value === null) continue;
      const id = `bop_${slugify(lbl.name)}`;
      ctx.observations.push({
        indicatorId: id, periodDate, periodLabel, value, scenario: 'actual',
      });
      // Upgrade indicator frequency if we saw a quarterly observation
      if (frequency === 'quarterly') {
        const ind = ctx.indicators.get(id)!;
        ind.frequency = 'quarterly';
      }
    }
  }
}
