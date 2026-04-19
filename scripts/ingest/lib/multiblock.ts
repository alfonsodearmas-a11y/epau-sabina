// Multi-block ingestion for Archetype E sheets. Segments the sheet into blocks
// separated by blank rows, then for each block tries to detect a year/date header
// and ingest the rows below it as A-shaped indicators. Each block can override
// category/unit via a sheet-level fallback config.
import type { WorkBook, WorkSheet } from 'xlsx';
import type { Category, Frequency, IngestContext } from './types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from './cells';
import { coerceHeaderToPeriod, slugify } from './dates';
import { coerceNumber } from './numbers';
import { isStructuralMarker } from './labels';

export interface MultiBlockConfig {
  sheet: string;
  category: Category;
  source: string;
  unit: string;
  frequency: Frequency;
  idPrefix: string;
  subcategory?: string;
  labelCol?: number; // default 1
  minHeaderYears?: number; // default 3
  minBlockRows?: number;   // default 2 (header + 1 data)
}

interface Block { startRow: number; endRow: number }

function segmentBlocks(sheet: WorkSheet, startRow: number, endRow: number, c0: number, c1: number): Block[] {
  const blocks: Block[] = [];
  let inBlock = false;
  let blockStart = -1;
  for (let r = startRow; r <= endRow; r++) {
    const blank = isBlankRow(sheet, r, c0, c1);
    if (!blank && !inBlock) { inBlock = true; blockStart = r; }
    else if (blank && inBlock) { inBlock = false; blocks.push({ startRow: blockStart, endRow: r - 1 }); }
  }
  if (inBlock) blocks.push({ startRow: blockStart, endRow });
  return blocks;
}

export function runMultiBlock(book: WorkBook, cfg: MultiBlockConfig, ctx: IngestContext): void {
  const sheet = book.Sheets[cfg.sheet];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const labelCol = cfg.labelCol ?? 1;
  const minYears = cfg.minHeaderYears ?? 3;
  const caveat = ctx.caveats.get(cfg.sheet) ?? null;
  const blocks = segmentBlocks(sheet, b.r + 1, b.R, b.c, b.C); // skip row 0 (nav)
  for (const block of blocks) {
    // Find a header row inside the block with enough year-like headers
    let headerRow = -1;
    let yearCols: { col: number; year: number; periodDate: string; periodLabel: string }[] = [];
    for (let r = block.startRow; r <= Math.min(block.startRow + 4, block.endRow); r++) {
      const candidates: typeof yearCols = [];
      for (let c = b.c; c <= b.C; c++) {
        const p = coerceHeaderToPeriod(cellAt(sheet, r, c), cfg.frequency);
        if (p) {
          const year = Number(p.periodDate.slice(0, 4));
          candidates.push({ col: c, year, periodDate: p.periodDate, periodLabel: p.periodLabel });
        }
      }
      if (candidates.length >= minYears) { headerRow = r; yearCols = candidates; break; }
    }
    if (headerRow < 0) continue;
    // Ingest rows below
    for (let r = headerRow + 1; r <= block.endRow; r++) {
      const labelRaw = cellAt(sheet, r, labelCol);
      if (isNavCell(labelRaw)) continue;
      if (typeof labelRaw !== 'string' || !labelRaw.trim()) continue;
      const label = labelRaw.trim();
      if (/^G\$|^US\$|^\$US|^Table\s|^MEDIUM[- ]TERM/i.test(label)) continue;
      if (isStructuralMarker(label)) continue;
      const indicatorId = `${cfg.idPrefix}_${slugify(label)}`;
      let wrote = false;
      for (const yc of yearCols) {
        const raw = cellAt(sheet, r, yc.col);
        if (raw === null || raw === undefined || raw === '') continue;
        const value = coerceNumber(raw, { sheet: cfg.sheet, r, c: yc.col }, ctx, { format: cellFormat(sheet, r, yc.col) });
        if (value === null) continue;
        ctx.observations.push({
          indicatorId,
          periodDate: yc.periodDate,
          periodLabel: yc.periodLabel,
          value,
          scenario: 'actual',
        });
        wrote = true;
      }
      if (wrote) {
        ctx.indicators.set(indicatorId, {
          id: indicatorId, name: label, category: cfg.category, subcategory: cfg.subcategory,
          unit: cfg.unit, frequency: cfg.frequency, source: cfg.source, sourceTab: cfg.sheet, caveat,
        });
      }
    }
  }
}
