// Generic runners that consume per-sheet configs and emit indicators + observations.
// Keep shape assumptions narrow — edge cases become bespoke adapters instead.

import type { WorkBook } from 'xlsx';
import type { Category, Frequency, IngestContext, IndicatorRecord, ObservationRecord } from './types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from './cells';
import { coerceHeaderToPeriod, slugify } from './dates';
import { coerceNumber } from './numbers';
import { extractYearColumns, findHeaderRow } from './headers';

export interface ConfigBase {
  sheet: string;
  archetype: 'A' | 'A-date' | 'B' | 'C';
  category: Category;
  source: string;
  idPrefix: string;
  unit: string;
  frequency: Frequency;
  subcategory?: string;
}

export interface ArchetypeAConfig extends ConfigBase {
  archetype: 'A' | 'A-date';
  headerRow: number;       // 0-indexed row containing year/date headers
  labelCol: number;        // 0-indexed col containing indicator label (e.g. 1 for col B)
  dataStartRow: number;    // 0-indexed first row of data
  dataEndRow?: number;     // optional; defaults to sheet bounds
  skipLabelPatterns?: RegExp[]; // rows whose label matches any are skipped (subheaders, blanks)
  isEstimateCols?: number[];
  // Optional alternate unit column (e.g. Oil Trajectory has "Units" in col C per row)
  unitCol?: number;
}

export interface ArchetypeBConfig extends ConfigBase {
  archetype: 'B';
  headerRow: number;       // row containing column labels (indicator names)
  dataStartRow: number;    // first data row (col A contains year)
  dataEndRow?: number;
  yearCol: number;         // col containing the year (usually 0 or 1)
  labelCols: number[];     // cols to ingest, one indicator each. If omitted, all non-empty header cells.
  // Composite header support: row labels from headerRow,
  // unit suffix (e.g. "(G$M)") is stripped off for indicator id but kept in name.
}

export interface ArchetypeCConfig extends ConfigBase {
  archetype: 'C';
  headerRow: number;       // row containing column labels (indicator names)
  dataStartRow: number;
  dataEndRow?: number;
  dateCol: number;         // col containing the period (Excel serial or date string)
  labelCols: number[];
}

// ---------- Archetype A runner ----------
export function runArchetypeA(book: WorkBook, cfg: ArchetypeAConfig, ctx: IngestContext): void {
  const sheet = book.Sheets[cfg.sheet];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const yearCols = extractYearColumns(sheet, cfg.headerRow, cfg.frequency);
  if (!yearCols.length) {
    ctx.pushIssue({ sheet: cfg.sheet, row: cfg.headerRow + 1, reason: `No year/date headers found in header row.`, severity: 'error' });
    return;
  }
  const endRow = cfg.dataEndRow ?? b.R;
  const caveat = ctx.caveats.get(cfg.sheet) ?? null;
  for (let r = cfg.dataStartRow; r <= endRow; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    const labelRaw = cellAt(sheet, r, cfg.labelCol);
    if (!labelRaw || typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
    const label = labelRaw.trim();
    if (cfg.skipLabelPatterns?.some((re) => re.test(label))) continue;
    if (isNavCell(labelRaw)) continue;
    const indicatorId = `${cfg.idPrefix}_${slugify(label)}`;
    const unit = cfg.unitCol != null ? (String(cellAt(sheet, r, cfg.unitCol) ?? cfg.unit) || cfg.unit) : cfg.unit;
    const indicator: IndicatorRecord = {
      id: indicatorId,
      name: label,
      category: cfg.category,
      subcategory: cfg.subcategory,
      unit,
      frequency: cfg.frequency,
      source: cfg.source,
      sourceTab: cfg.sheet,
      caveat,
    };
    let wroteObservation = false;
    for (const yc of yearCols) {
      const raw = cellAt(sheet, r, yc.col);
      const value = coerceNumber(raw, { sheet: cfg.sheet, r, c: yc.col }, ctx);
      if (value === null && raw !== null && raw !== undefined && raw !== '') continue;
      const obs: ObservationRecord = {
        indicatorId,
        periodDate: yc.periodDate,
        periodLabel: yc.periodLabel,
        value,
        scenario: 'actual',
      };
      ctx.observations.push(obs);
      if (value !== null) wroteObservation = true;
    }
    if (wroteObservation || !ctx.indicators.has(indicatorId)) {
      ctx.indicators.set(indicatorId, indicator);
    }
  }
}

// ---------- Archetype B runner ----------
export function runArchetypeB(book: WorkBook, cfg: ArchetypeBConfig, ctx: IngestContext): void {
  const sheet = book.Sheets[cfg.sheet];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const caveat = ctx.caveats.get(cfg.sheet) ?? null;
  const endRow = cfg.dataEndRow ?? b.R;
  // Resolve label columns (if empty, find all non-empty header cells to the right of yearCol)
  let labelCols = cfg.labelCols;
  if (labelCols.length === 0) {
    labelCols = [];
    for (let c = cfg.yearCol + 1; c <= b.C; c++) {
      const v = cellAt(sheet, cfg.headerRow, c);
      if (typeof v === 'string' && v.trim()) labelCols.push(c);
    }
  }
  const indicators: { id: string; name: string; col: number }[] = [];
  for (const c of labelCols) {
    const raw = cellAt(sheet, cfg.headerRow, c);
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const name = raw.trim();
    const indicatorId = `${cfg.idPrefix}_${slugify(name)}`;
    ctx.indicators.set(indicatorId, {
      id: indicatorId,
      name,
      category: cfg.category,
      subcategory: cfg.subcategory,
      unit: cfg.unit,
      frequency: cfg.frequency,
      source: cfg.source,
      sourceTab: cfg.sheet,
      caveat,
    });
    indicators.push({ id: indicatorId, name, col: c });
  }
  for (let r = cfg.dataStartRow; r <= endRow; r++) {
    const periodRaw = cellAt(sheet, r, cfg.yearCol);
    const p = coerceHeaderToPeriod(periodRaw, cfg.frequency);
    if (!p) continue;
    for (const ind of indicators) {
      const raw = cellAt(sheet, r, ind.col);
      const value = coerceNumber(raw, { sheet: cfg.sheet, r, c: ind.col }, ctx);
      if (value === null && (raw === null || raw === undefined || raw === '')) continue;
      ctx.observations.push({
        indicatorId: ind.id,
        periodDate: p.periodDate,
        periodLabel: p.periodLabel,
        value,
        scenario: 'actual',
        isEstimate: p.isEstimate,
      });
    }
  }
}

// ---------- Archetype C runner (dates-as-rows, sub-annual) ----------
export function runArchetypeC(book: WorkBook, cfg: ArchetypeCConfig, ctx: IngestContext): void {
  // Archetype C differs from B only in that the dateCol holds an Excel serial or date string.
  // Re-use B's logic via coerceHeaderToPeriod.
  runArchetypeB(book, {
    ...cfg,
    archetype: 'B',
    yearCol: cfg.dateCol,
  }, ctx);
}

// ---------- Auto-detect header row helper ----------
export function autoDetectHeaderRow(book: WorkBook, sheetName: string, hint?: number): number | null {
  const sheet = book.Sheets[sheetName];
  if (!sheet) return null;
  if (hint != null) return hint;
  return findHeaderRow(sheet);
}
