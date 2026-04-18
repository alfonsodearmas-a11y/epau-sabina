// Generic F/G adapter: projects the sheet below its title block into a comparison_table.
// Detects header row as the first non-blank row (past any title/unit rows) that has
// at least two non-empty cells beyond `labelCol`. The label column may be col 0 or 1;
// we auto-pick whichever col has more non-empty cells across the scan region.
import type { WorkBook, WorkSheet } from 'xlsx';
import type { Category, IngestContext, ComparisonTableRecord, ComparisonTableRowRecord } from './types';
import { cellAt, isBlankRow, isNavCell, sheetBounds } from './cells';
import { coerceHeaderToPeriod } from './dates';
import { coerceNumber } from './numbers';

export interface ComparisonConfig {
  sheet: string;
  id: string;
  name: string;
  category?: Category;
  source?: string;
  description?: string;
  labelCol?: number;
  headerRowHint?: number;
  unit?: string;
}

function autoLabelCol(sheet: WorkSheet, startRow: number, endRow: number, c0: number): number {
  // Prefer col 1 when col 0 is mostly empty (common in this workbook)
  let c0count = 0, c1count = 0;
  const maxRow = Math.min(startRow + 30, endRow);
  for (let r = startRow; r <= maxRow; r++) {
    const a = cellAt(sheet, r, c0);
    const b = cellAt(sheet, r, c0 + 1);
    if (typeof a === 'string' && a.trim()) c0count++;
    if (typeof b === 'string' && b.trim()) c1count++;
  }
  return c1count > c0count ? c0 + 1 : c0;
}

export function runComparison(book: WorkBook, cfg: ComparisonConfig, ctx: IngestContext): void {
  const sheet = book.Sheets[cfg.sheet];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const labelCol = cfg.labelCol ?? autoLabelCol(sheet, b.r, b.R, b.c);
  // Skip the first row (nav) and any title/unit-only rows that have just one text cell.
  let startScan = b.r + 1;
  while (startScan <= b.R) {
    let nonEmpty = 0;
    for (let c = b.c; c <= b.C; c++) {
      const v = cellAt(sheet, startScan, c);
      if (v !== null && v !== undefined && v !== '') nonEmpty++;
    }
    if (nonEmpty >= 2) break;
    startScan++;
  }
  // Header row: first row with >=2 values beyond labelCol
  let headerRow = cfg.headerRowHint ?? -1;
  if (headerRow < 0) {
    for (let r = startScan; r <= Math.min(startScan + 6, b.R); r++) {
      let cnt = 0;
      for (let c = b.c; c <= b.C; c++) {
        if (c === labelCol) continue;
        const v = cellAt(sheet, r, c);
        if (v !== null && v !== undefined && v !== '') cnt++;
      }
      if (cnt >= 2) { headerRow = r; break; }
    }
  }
  if (headerRow < 0) {
    ctx.pushIssue({ sheet: cfg.sheet, reason: 'Could not locate a header row for comparison table.', severity: 'warning' });
    headerRow = startScan;
  }
  const columns: { col: number; label: string }[] = [];
  for (let c = b.c; c <= b.C; c++) {
    if (c === labelCol) continue;
    const raw = cellAt(sheet, headerRow, c);
    if (raw === null || raw === undefined || raw === '') continue;
    let label: string;
    if (typeof raw === 'number') {
      const p = coerceHeaderToPeriod(raw, 'annual');
      label = p ? p.periodLabel : String(raw);
    } else {
      label = String(raw).trim();
    }
    if (!label) continue;
    columns.push({ col: c, label });
  }

  const rows: ComparisonTableRowRecord[] = [];
  let orderIndex = 0;
  let currentGroup: string | null = null;
  for (let r = headerRow + 1; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    const labelRaw = cellAt(sheet, r, labelCol);
    if (isNavCell(labelRaw)) continue;
    const rowLabel = (typeof labelRaw === 'string' ? labelRaw.trim() : labelRaw != null ? String(labelRaw) : '').trim();
    if (!rowLabel) continue;
    // Detect rows that look like group headers (label only, no data cells)
    let anyValue = false;
    for (const col of columns) {
      const raw = cellAt(sheet, r, col.col);
      if (raw !== null && raw !== undefined && raw !== '') { anyValue = true; break; }
    }
    if (!anyValue) { currentGroup = rowLabel; continue; }

    for (const col of columns) {
      const raw = cellAt(sheet, r, col.col);
      if (raw === null || raw === undefined || raw === '') continue;
      let value: number | null = null;
      let valueText: string | null = null;
      if (typeof raw === 'number') {
        value = raw;
      } else {
        const asNum = coerceNumber(raw, { sheet: cfg.sheet, r, c: col.col }, ctx, 'info');
        if (asNum !== null) value = asNum; else valueText = String(raw);
      }
      rows.push({
        rowLabel, groupLabel: currentGroup, columnLabel: col.label,
        value, valueText, unit: cfg.unit ?? null, orderIndex: orderIndex++,
      });
    }
  }
  const table: ComparisonTableRecord = {
    id: cfg.id,
    name: cfg.name,
    category: cfg.category,
    source: cfg.source,
    sourceTab: cfg.sheet,
    description: cfg.description,
    metadata: { columns: columns.map((c) => c.label), labelCol },
    rows,
  };
  ctx.comparisonTables.push(table);
}
