// NRF (Natural Resource Fund): Archetype D — scenario-header tables.
// Layout (observed): the sheet has stacked blocks for inflows/outflows/balance,
// with a header row that mixes year cells and scenario words like "ACTUAL"/"BUDGET"/"PROJECTED".
// Approach:
//   1. Scan rows for a composite header: a row containing scenario words + an adjacent row with years.
//   2. For every (scenario, year) column, ingest the numeric value on indicator rows.
//   3. Indicator label is col B; rows are skipped if blank or obvious subtotal/subheader.
import type { WorkBook } from 'xlsx';
import type { IngestContext, ObservationRecord, Scenario } from '../lib/types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'NRF';
const SOURCE = 'MoF NRF Quarterly Reports';
const UNIT = 'US$ thousands';
const CATEGORY = 'fiscal' as const;
const ID_PREFIX = 'nrf';

interface HeaderCol { col: number; year: number; scenario: Scenario }

function findHeader(book: WorkBook): HeaderCol[] {
  const sheet = book.Sheets[SHEET]!;
  const b = sheetBounds(sheet);
  if (!b) return [];
  // Heuristic: look for a row with at least 3 year-like numeric cells. The row above/same as
  // it typically carries scenario words. We scan rows 0-15.
  type Row = { r: number; years: Map<number, number>; scenarios: Map<number, Scenario> };
  const rows: Row[] = [];
  for (let r = b.r; r <= Math.min(b.r + 20, b.R); r++) {
    const years = new Map<number, number>();
    const scenarios = new Map<number, Scenario>();
    for (let c = b.c; c <= b.C; c++) {
      const v = cellAt(sheet, r, c);
      if (typeof v === 'number' && v >= 2000 && v <= 2050 && Number.isInteger(v)) years.set(c, v);
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (s === 'actual') scenarios.set(c, 'actual');
        else if (s === 'budget' || s === 'budgeted') scenarios.set(c, 'budget');
        else if (s === 'revised') scenarios.set(c, 'revised');
        else if (s === 'projected' || s === 'projection' || s === 'forecast') scenarios.set(c, 'projection');
        // Composite "ACTUAL 2022"
        const m = /^(actual|budget|revised|projected|projection)\s+(\d{4})$|^(\d{4})\s+(actual|budget|revised|projected|projection)$/i.exec(v);
        if (m) {
          const sc = (m[1] ?? m[4])!.toLowerCase();
          const yr = Number(m[2] ?? m[3]);
          const scenario: Scenario = sc === 'actual' ? 'actual' : sc === 'budget' ? 'budget' : sc === 'revised' ? 'revised' : 'projection';
          years.set(c, yr);
          scenarios.set(c, scenario);
        }
      }
    }
    rows.push({ r, years, scenarios });
  }
  // Pick the row with most year hits; then combine with scenario row (same row or row-1)
  const yearRow = rows.slice().sort((a, b) => b.years.size - a.years.size)[0];
  if (!yearRow || yearRow.years.size < 2) return [];
  const scenarioCandidates = rows.filter((r) => r.r <= yearRow.r && r.scenarios.size > 0).sort((a, b) => b.scenarios.size - a.scenarios.size);
  const scenarioRow = scenarioCandidates[0] ?? { r: yearRow.r, years: new Map(), scenarios: new Map() };
  const headerCols: HeaderCol[] = [];
  for (const [col, year] of yearRow.years) {
    const scenario = scenarioRow.scenarios.get(col) ?? yearRow.scenarios.get(col) ?? 'actual';
    headerCols.push({ col, year, scenario });
  }
  return headerCols.sort((a, b) => a.col - b.col);
}

export function runNRF(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const header = findHeader(book);
  if (!header.length) {
    ctx.pushIssue({ sheet: SHEET, reason: 'Could not locate scenario/year header in NRF sheet.', severity: 'error' });
    return;
  }
  const headerMinRow = Math.max(...header.map(() => 0)); // placeholder; we walk all rows below first header col
  const headerRowIndex = 0; // used only to start data scan
  const caveat = ctx.caveats.get(SHEET) ?? 'Royalties recorded on cash basis; recent figures may be provisional pending audit.';

  // Data rows: every row with a label in col B that's not a subheader/unit row.
  for (let r = b.r; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    const labelRaw = cellAt(sheet, r, 1);
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    if (typeof labelRaw !== 'string') continue;
    const label = labelRaw.trim();
    if (!label) continue;
    // Skip unit declarations and section titles
    if (/^US\$|^G\$|^\$US/.test(label)) continue;
    if (/^MEDIUM[- ]TERM|^ACTUAL|^PROJECTED|^BUDGET/i.test(label)) continue;
    // Skip rows where the label cell equals a scenario word (those ARE header rows)
    if (/^(actual|budget|revised|projected|projection)$/i.test(label)) continue;
    const indicatorId = `${ID_PREFIX}_${slugify(label)}`;
    let wrote = false;
    for (const hc of header) {
      const raw = cellAt(sheet, r, hc.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: hc.col }, ctx);
      if (value === null) continue;
      const obs: ObservationRecord = {
        indicatorId,
        periodDate: `${hc.year}-01-01`,
        periodLabel: String(hc.year),
        value,
        scenario: hc.scenario,
      };
      ctx.observations.push(obs);
      wrote = true;
    }
    if (wrote) {
      ctx.indicators.set(indicatorId, {
        id: indicatorId, name: label, category: CATEGORY,
        subcategory: 'Natural Resource Fund',
        unit: UNIT, frequency: 'annual',
        source: SOURCE, sourceTab: SHEET, caveat,
      });
    }
  }
  // Silence unused var lints (headerMinRow / headerRowIndex are kept for future row-bound guards).
  void headerMinRow; void headerRowIndex;
}
