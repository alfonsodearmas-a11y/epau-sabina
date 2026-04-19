// NRF (Natural Resource Fund): Archetype D.
//
// Block 1 (rows 7–27) layout:
//   col B: outline marker ("A"/"B" for INFLOWS/OUTFLOWS; 1/2/3 ordinals)
//   col C: indicator name (skip this column for the id; col B is markers only)
//   col D+: scenario-year headers ("ACTUAL 2020", "BUDGET 2022", "ACTUAL2023", etc.)
// Later blocks (Annual Deposits, Cumulative, Adjusted Withdrawal Rule) are
// policy sensitivities and are not ingested here.
import type { WorkBook } from 'xlsx';
import type { IngestContext, ObservationRecord, Scenario } from '../lib/types';
import { cellAt, cellFormat, isBlankRow, sheetBounds } from '../lib/cells';
import { slugify } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';
import { isStructuralMarker, normalizeLabel } from '../lib/labels';
import { parseScenarioHeader } from '../lib/headers';

const SHEET = 'NRF';
const SOURCE = 'MoF NRF Quarterly Reports';
const UNIT = 'US$ thousands';
const CATEGORY = 'fiscal' as const;
const ID_PREFIX = 'nrf';

const COL_MARKER = 1;
const COL_NAME = 2;
const COL_DATA0 = 3;

interface HeaderCol { col: number; year: number; scenario: Scenario }

function findBlock1Header(book: WorkBook): { headerRow: number; cols: HeaderCol[] } | null {
  const sheet = book.Sheets[SHEET]!;
  const b = sheetBounds(sheet);
  if (!b) return null;
  for (let r = b.r; r <= Math.min(b.r + 15, b.R); r++) {
    const c2 = cellAt(sheet, r, COL_NAME);
    if (typeof c2 !== 'string' || c2.trim().toUpperCase() !== 'ITEM') continue;
    const cols: HeaderCol[] = [];
    for (let c = COL_DATA0; c <= b.C; c++) {
      const parsed = parseScenarioHeader(cellAt(sheet, r, c));
      if (!parsed) continue;
      if (parsed.year < 2000 || parsed.year > 2050) continue;
      cols.push({ col: c, year: parsed.year, scenario: parsed.scenario });
    }
    if (cols.length >= 3) return { headerRow: r, cols };
  }
  return null;
}

// Strip redundant "NRF " prefix (avoids ids like nrf_nrf_opening_balance) and
// rewrite the capitalized section totals so users can query them by intent.
function canonicalName(raw: string): string {
  const name = normalizeLabel(raw).replace(/^NRF\s+/i, '');
  const upper = name.trim().toUpperCase();
  if (upper === 'INFLOWS') return 'Total Inflows';
  if (upper === 'OUTFLOWS') return 'Total Outflows';
  return name;
}

export function runNRF(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const header = findBlock1Header(book);
  if (!header) {
    ctx.pushIssue({ sheet: SHEET, reason: 'Could not locate Block 1 scenario/year header (expected "ITEM" in col C).', severity: 'error' });
    return;
  }
  const caveat = ctx.caveats.get(SHEET) ?? 'Royalties recorded on cash basis; recent figures may be provisional pending audit.';

  // Block 1 ends when col B carries a multi-word block title (e.g. "Annual
  // Deposits and Withdrawals"); single-letter / lone-integer markers don't.
  let currentSection: string | null = null;
  const BALANCE_NAMES = /^(Opening Balance|Closing Balance|Balance \(excl\. interest\))$/i;
  const MEMO_NAMES = /^(Withdrawal Ceiling)$/i;

  for (let r = header.headerRow + 1; r <= b.R; r++) {
    const marker = cellAt(sheet, r, COL_MARKER);
    if (typeof marker === 'string') {
      const m = marker.trim();
      if (m.length >= 3 && !isStructuralMarker(m)) break;
      if (/^[A-Z]$/.test(m)) currentSection = m;
    }

    if (isBlankRow(sheet, r, b.c, b.C)) continue;

    const nameRaw = cellAt(sheet, r, COL_NAME);
    if (typeof nameRaw !== 'string') continue;
    const trimmed = nameRaw.trim();
    if (!trimmed) continue;
    if (isStructuralMarker(trimmed)) continue;
    if (/^(medium[- ]term|actual and projected)/i.test(trimmed)) continue;

    const name = canonicalName(trimmed);
    const indicatorId = `${ID_PREFIX}_${slugify(name)}`;

    let wrote = false;
    for (const hc of header.cols) {
      const raw = cellAt(sheet, r, hc.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: hc.col }, ctx, { format: cellFormat(sheet, r, hc.col) });
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
      const subcategory = BALANCE_NAMES.test(name) ? 'Natural Resource Fund — Balance'
        : MEMO_NAMES.test(name) ? 'Natural Resource Fund — Memorandum'
        : currentSection === 'A' ? 'Natural Resource Fund — Inflows'
        : currentSection === 'B' ? 'Natural Resource Fund — Outflows'
        : 'Natural Resource Fund';
      ctx.indicators.set(indicatorId, {
        id: indicatorId, name, category: CATEGORY,
        subcategory,
        unit: UNIT, frequency: 'annual',
        source: SOURCE, sourceTab: SHEET, caveat,
      });
    }
  }
}
