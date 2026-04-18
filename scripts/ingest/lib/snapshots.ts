import type { WorkBook } from 'xlsx';
import type { IngestContext } from './types';
import { sheetBounds, sheetToCells } from './cells';

export function captureAllSnapshots(book: WorkBook, ctx: IngestContext): void {
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name]!;
    const b = sheetBounds(sheet);
    if (!b) {
      ctx.snapshots.push({ sheetName: name, rowCount: 0, colCount: 0, cells: [] });
      continue;
    }
    const cells = sheetToCells(sheet);
    ctx.snapshots.push({
      sheetName: name,
      rowCount: cells.length,
      colCount: cells[0]?.length ?? 0,
      cells,
    });
  }
}
