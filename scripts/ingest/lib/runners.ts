// Generic runners that consume per-sheet configs and emit indicators + observations.
// Keep shape assumptions narrow — edge cases become bespoke adapters instead.

import type { WorkBook } from 'xlsx';
import type { Category, Frequency, IngestContext, IndicatorRecord, ObservationRecord } from './types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from './cells';
import { coerceHeaderToPeriod, slugify } from './dates';
import { coerceNumber } from './numbers';
import { extractYearColumns, findHeaderRow } from './headers';
import { isStructuralMarker } from './labels';

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
  // Section-aware prefix: disambiguates short labels ("Tax", "Current",
  // "Share of GDP") that repeat under distinct section headers on the same sheet.
  // A blank row ends the current section so top-level rows below don't inherit the prefix.
  let currentSection: string | null = null;
  for (let r = cfg.dataStartRow; r <= endRow; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) { currentSection = null; continue; }
    const labelRaw = cellAt(sheet, r, cfg.labelCol);
    if (!labelRaw || typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
    const label = labelRaw.trim();
    if (cfg.skipLabelPatterns?.some((re) => re.test(label))) continue;
    if (isNavCell(labelRaw)) continue;
    // Colon-ending labels with data ("Total Expenditure:") are legitimate
    // indicators, so defer the structural-marker filter until after we know
    // whether the row carries data.
    const isColonHeader = /:\s*$/.test(label);
    if (!isColonHeader && isStructuralMarker(label)) continue;

    const endsWithColon = /:\s*$/.test(label);
    let hasNumericData = false;
    let allYearLike = true;
    for (const yc of yearCols) {
      const v = cellAt(sheet, r, yc.col);
      if (typeof v === 'number' && Number.isFinite(v)) {
        hasNumericData = true;
        if (v < 1900 || v > 2100) allYearLike = false;
      }
    }
    const sectionSlug = slugify(label.replace(/:\s*$/, ''));
    if (!hasNumericData || (hasNumericData && allYearLike)) {
      if (label.length >= 4) currentSection = sectionSlug;
      continue;
    }
    if (isColonHeader && isStructuralMarker(label.replace(/:\s*$/, ''))) continue;
    const cleanLabel = label.replace(/:\s*$/, '');
    const idBody = currentSection ? `${currentSection}_${slugify(cleanLabel)}` : slugify(cleanLabel);
    const indicatorId = `${cfg.idPrefix}_${idBody}`;
    const nextSectionAfterRow = endsWithColon ? sectionSlug : null;
    let unit = cfg.unitCol != null ? (String(cellAt(sheet, r, cfg.unitCol) ?? cfg.unit) || cfg.unit) : cfg.unit;
    // Row-level percent detection: overrides the sheet-level unit when every
    // populated cell on this row carries a %-format (Sector Share mixes dollar
    // amounts with share rows on the same sheet).
    let pctCells = 0, totalCells = 0;
    for (const yc of yearCols) {
      const fmt = cellFormat(sheet, r, yc.col);
      const v = cellAt(sheet, r, yc.col);
      if (v === null || v === undefined || v === '') continue;
      totalCells++;
      if (fmt && /%/.test(fmt)) pctCells++;
    }
    if (totalCells >= 2 && pctCells === totalCells) unit = 'percent';

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
    // Stage observations; commit only if at least one non-null value landed,
    // so header/commentary rows that slipped past label filtering don't become
    // empty catalog entries.
    const staged: ObservationRecord[] = [];
    let sawRealValue = false;
    for (const yc of yearCols) {
      const raw = cellAt(sheet, r, yc.col);
      const value = coerceNumber(raw, { sheet: cfg.sheet, r, c: yc.col }, ctx, { format: cellFormat(sheet, r, yc.col) });
      if (value === null && raw !== null && raw !== undefined && raw !== '') continue;
      staged.push({
        indicatorId,
        periodDate: yc.periodDate,
        periodLabel: yc.periodLabel,
        value,
        scenario: 'actual',
      });
      if (value !== null) sawRealValue = true;
    }
    if (sawRealValue) {
      for (const o of staged) ctx.observations.push(o);
      ctx.indicators.set(indicatorId, indicator);
    }
    if (nextSectionAfterRow) currentSection = nextSectionAfterRow;
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
  const indicators: { id: string; name: string; col: number; record: IndicatorRecord }[] = [];
  for (const c of labelCols) {
    const raw = cellAt(sheet, cfg.headerRow, c);
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const name = raw.trim();
    if (isStructuralMarker(name)) continue;
    const indicatorId = `${cfg.idPrefix}_${slugify(name)}`;
    const record: IndicatorRecord = {
      id: indicatorId,
      name,
      category: cfg.category,
      subcategory: cfg.subcategory,
      unit: cfg.unit,
      frequency: cfg.frequency,
      source: cfg.source,
      sourceTab: cfg.sheet,
      caveat,
    };
    indicators.push({ id: indicatorId, name, col: c, record });
  }
  // Stage observations per indicator; commit only those that saw ≥1 real value.
  const staged = new Map<string, ObservationRecord[]>();
  const sawReal = new Set<string>();
  for (let r = cfg.dataStartRow; r <= endRow; r++) {
    const periodRaw = cellAt(sheet, r, cfg.yearCol);
    const p = coerceHeaderToPeriod(periodRaw, cfg.frequency);
    if (!p) continue;
    for (const ind of indicators) {
      const raw = cellAt(sheet, r, ind.col);
      const value = coerceNumber(raw, { sheet: cfg.sheet, r, c: ind.col }, ctx, { format: cellFormat(sheet, r, ind.col) });
      if (value === null && (raw === null || raw === undefined || raw === '')) continue;
      const arr = staged.get(ind.id) ?? [];
      arr.push({
        indicatorId: ind.id,
        periodDate: p.periodDate,
        periodLabel: p.periodLabel,
        value,
        scenario: 'actual',
        isEstimate: p.isEstimate,
      });
      staged.set(ind.id, arr);
      if (value !== null) sawReal.add(ind.id);
    }
  }
  for (const ind of indicators) {
    if (!sawReal.has(ind.id)) continue;
    ctx.indicators.set(ind.id, ind.record);
    for (const o of staged.get(ind.id) ?? []) ctx.observations.push(o);
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
