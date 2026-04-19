import type { WorkSheet } from 'xlsx';
import type { Scenario } from './types';
import { cellAt, sheetBounds } from './cells';
import { coerceHeaderToPeriod } from './dates';

export interface YearColumn { col: number; year: number; periodDate: string; periodLabel: string }

// Find the row (within the first `maxScan` rows) with the most numeric year-like headers.
export function findHeaderRow(sheet: WorkSheet, opts?: { maxScan?: number; minYears?: number }): number | null {
  const b = sheetBounds(sheet);
  if (!b) return null;
  const maxScan = opts?.maxScan ?? 10;
  const minYears = opts?.minYears ?? 3;
  let bestRow = -1;
  let bestCount = 0;
  for (let r = b.r; r <= Math.min(b.r + maxScan, b.R); r++) {
    let count = 0;
    for (let c = b.c; c <= b.C; c++) {
      const p = coerceHeaderToPeriod(cellAt(sheet, r, c), 'annual');
      if (p) count++;
    }
    if (count > bestCount) { bestCount = count; bestRow = r; }
  }
  return bestCount >= minYears ? bestRow : null;
}

// Extract year-as-column mapping from a specific header row.
export function extractYearColumns(
  sheet: WorkSheet,
  headerRow: number,
  freq: 'annual' | 'quarterly' | 'monthly' = 'annual',
): YearColumn[] {
  const b = sheetBounds(sheet);
  if (!b) return [];
  const out: YearColumn[] = [];
  for (let c = b.c; c <= b.C; c++) {
    const p = coerceHeaderToPeriod(cellAt(sheet, headerRow, c), freq);
    if (!p) continue;
    const year = Number(p.periodDate.slice(0, 4));
    out.push({ col: c, year, periodDate: p.periodDate, periodLabel: p.periodLabel });
  }
  return out;
}

// Parse a scenario-and-year header cell like "ACTUAL 2022" or "Budget 2026".
export function parseScenarioHeader(v: unknown): { scenario: Scenario; year: number } | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const map: Record<string, Scenario> = {
    actual: 'actual', budget: 'budget', revised: 'revised',
    projected: 'projection', projection: 'projection', project: 'projection',
    indicative: 'projection',
  };
  // Workbook sometimes omits the space (e.g. "ACTUAL2023"). Accept \s* so the
  // no-space variant still parses without a dedicated regex in each adapter.
  const m = /^(actual|budget|revised|projected|projection|project|indicative)\s*(\d{4})$|^(\d{4})\s*(actual|budget|revised|projected|projection|project|indicative)$/i.exec(s);
  if (!m) return null;
  const scenarioText = (m[1] ?? m[4])!.toLowerCase();
  const year = Number(m[2] ?? m[3]);
  const scenario = map[scenarioText];
  if (!scenario) return null;
  return { scenario, year };
}

// Parse a standalone scenario word: "ACTUAL", "Budget", etc.
export function parseScenarioWord(v: unknown): Scenario | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (s === 'actual') return 'actual';
  if (s === 'budget' || s === 'budgeted') return 'budget';
  if (s === 'revised') return 'revised';
  if (s === 'projected' || s === 'projection' || s === 'projected (f)' || s === 'forecast' || s === 'proj') return 'projection';
  return null;
}
