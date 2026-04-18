import { utils, type WorkSheet } from 'xlsx';

export function sheetBounds(sheet: WorkSheet): { r: number; c: number; R: number; C: number } | null {
  const ref = sheet['!ref'];
  if (!ref) return null;
  const range = utils.decode_range(ref);
  // Clamp max columns — the index sheet reports 16383 columns; clamp to the
  // last column that has any non-empty cell in the first 200 rows.
  let maxC = range.e.c;
  const probeRows = Math.min(200, range.e.r - range.s.r + 1);
  let observedMaxC = range.s.c - 1;
  for (let R = range.s.r; R < range.s.r + probeRows; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = sheet[utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        if (C > observedMaxC) observedMaxC = C;
      }
    }
  }
  if (observedMaxC >= range.s.c) maxC = Math.min(maxC, observedMaxC);
  return { r: range.s.r, c: range.s.c, R: range.e.r, C: maxC };
}

export function cellAt(sheet: WorkSheet, r: number, c: number): unknown {
  const cell = sheet[utils.encode_cell({ r, c })];
  return cell ? cell.v : null;
}

export function cellRef(r: number, c: number): string {
  return utils.encode_cell({ r, c });
}

export function rawRow(sheet: WorkSheet, r: number, c0: number, c1: number): unknown[] {
  const out: unknown[] = [];
  for (let C = c0; C <= c1; C++) out.push(cellAt(sheet, r, C));
  return out;
}

export function isBlankRow(sheet: WorkSheet, r: number, c0: number, c1: number): boolean {
  for (let C = c0; C <= c1; C++) {
    const v = cellAt(sheet, r, C);
    if (v !== null && v !== undefined && v !== '') return false;
  }
  return true;
}

export function firstNonBlankCell(sheet: WorkSheet, r: number, c0: number, c1: number): string | null {
  for (let C = c0; C <= c1; C++) {
    const v = cellAt(sheet, r, C);
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

// Strip hyperlink-nav cells like "Click here to go back to first page" from row 0.
export function isNavCell(v: unknown): boolean {
  return typeof v === 'string' && /click here to go back/i.test(v);
}

// Extract the entire sheet contents as a nested array for raw_sheet_snapshots.
// Tradeoff: we serialize the bounded region (not the 16383-wide index artifact).
export function sheetToCells(sheet: WorkSheet): unknown[][] {
  const b = sheetBounds(sheet);
  if (!b) return [];
  const out: unknown[][] = [];
  for (let R = b.r; R <= b.R; R++) {
    const row: unknown[] = [];
    for (let C = b.c; C <= b.C; C++) {
      const v = cellAt(sheet, R, C);
      row.push(v === undefined ? null : v);
    }
    out.push(row);
  }
  return out;
}
