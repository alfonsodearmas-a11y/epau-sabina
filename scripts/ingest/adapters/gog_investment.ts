// GOG Investment: Archetype D — scenarios in row 4 (Actual/Actual/Revised/Budget), years in row 5.
import type { WorkBook } from 'xlsx';
import type { IngestContext, Scenario } from '../lib/types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';
import { parseScenarioWord } from '../lib/headers';

const SHEET = 'GOG Investment';

export function runGogInvestment(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;

  const SCENARIO_ROW = 4;
  const YEAR_ROW = 5;
  const DATA_START = 6;
  const LABEL_COL = 1;

  const headerCols: { col: number; year: number; scenario: Scenario }[] = [];
  for (let c = b.c; c <= b.C; c++) {
    const yearCell = cellAt(sheet, YEAR_ROW, c);
    const scenCell = cellAt(sheet, SCENARIO_ROW, c);
    if (typeof yearCell === 'number' && yearCell >= 2000 && yearCell <= 2050 && Number.isInteger(yearCell)) {
      const scenario = parseScenarioWord(scenCell) ?? 'actual';
      headerCols.push({ col: c, year: yearCell, scenario });
    }
  }
  if (!headerCols.length) {
    ctx.pushIssue({ sheet: SHEET, reason: 'No year/scenario headers found in GOG Investment.', severity: 'error' });
    return;
  }
  const caveat = ctx.caveats.get(SHEET) ?? null;
  for (let r = DATA_START; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    const labelRaw = cellAt(sheet, r, LABEL_COL);
    if (isNavCell(labelRaw)) continue;
    if (typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
    const label = labelRaw.trim();
    if (/^G\$|^US\$|^\$US/.test(label)) continue;
    const indicatorId = `gog_investment_${slugify(label)}`;
    let wrote = false;
    for (const hc of headerCols) {
      const raw = cellAt(sheet, r, hc.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: hc.col }, ctx);
      if (value === null) continue;
      ctx.observations.push({
        indicatorId,
        periodDate: `${hc.year}-01-01`,
        periodLabel: String(hc.year),
        value,
        scenario: hc.scenario,
      });
      wrote = true;
    }
    if (wrote) {
      ctx.indicators.set(indicatorId, {
        id: indicatorId, name: label, category: 'fiscal',
        subcategory: 'Government investment by sector',
        unit: 'G$ billions', frequency: 'annual',
        source: 'MoF PCMD', sourceTab: SHEET, caveat,
      });
    }
  }
}
