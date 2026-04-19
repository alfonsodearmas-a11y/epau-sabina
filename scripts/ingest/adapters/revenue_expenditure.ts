// Revenue & Expenditure: 119 cols. Row 4 holds scenario words (ACTUAL / REVISED /
// BUDGET / PROJECTED), row 5 holds the year. Labels at col 2 (col 1 is an optional
// hierarchical index like "1.1"). Multi-decade coverage 1964 → present.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';
import { parseScenarioWord } from '../lib/headers';
import type { Scenario } from '../lib/types';

const SHEET = 'Revenue & Expenditure';

export function runRevenueExpenditure(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const SCENARIO_ROW = 4;
  const YEAR_ROW = 5;
  const DATA_START = 7;
  const LABEL_COL = 2;
  const caveat = ctx.caveats.get(SHEET) ?? null;

  const headerCols: { col: number; year: number; scenario: Scenario }[] = [];
  for (let c = b.c; c <= b.C; c++) {
    const yr = cellAt(sheet, YEAR_ROW, c);
    if (typeof yr !== 'number' || yr < 1900 || yr > 2100 || !Number.isInteger(yr)) continue;
    const scen = parseScenarioWord(cellAt(sheet, SCENARIO_ROW, c)) ?? 'actual';
    headerCols.push({ col: c, year: yr, scenario: scen });
  }
  if (!headerCols.length) {
    ctx.pushIssue({ sheet: SHEET, reason: 'No year/scenario header columns found.', severity: 'error' });
    return;
  }
  for (let r = DATA_START; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    const labelRaw = cellAt(sheet, r, LABEL_COL);
    if (typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
    const label = labelRaw.trim();
    if (/^G\$|^US\$|^\$US|^Table\s/i.test(label)) continue;
    const idx = cellAt(sheet, r, 1);
    const idxStr = idx != null ? String(idx).trim() : '';
    const indicatorId = `rev_exp_${slugify(idxStr ? `${idxStr}_${label}` : label)}`;
    let wrote = false;
    for (const hc of headerCols) {
      const raw = cellAt(sheet, r, hc.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: hc.col }, ctx, { format: cellFormat(sheet, r, hc.col) });
      if (value === null) continue;
      ctx.observations.push({
        indicatorId, periodDate: `${hc.year}-01-01`, periodLabel: String(hc.year),
        value, scenario: hc.scenario,
      });
      wrote = true;
    }
    if (wrote) {
      ctx.indicators.set(indicatorId, {
        id: indicatorId, name: idxStr ? `${idxStr} ${label}` : label, category: 'fiscal',
        subcategory: 'Central government revenue and expenditure',
        unit: 'G$ millions', frequency: 'annual',
        source: 'MoF FMD', sourceTab: SHEET, caveat,
      });
    }
  }
}
