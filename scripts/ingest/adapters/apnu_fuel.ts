// APNU_Fuel Prices: the shape is a clean monthly time series (col 1 = Excel
// serial date, col 2 = Brent US$/bbl, col 3 = GOG Excise Tax on gasoline &
// diesel). Spec routes this to comparison_tables (handled by runComparison
// elsewhere), but we ALSO ingest it as observations so the workbench can
// chart it alongside other series. Both sinks share the same source.
import type { WorkBook } from 'xlsx';
import type { IngestContext } from '../lib/types';
import { cellAt, cellFormat, isBlankRow, isNavCell, sheetBounds } from '../lib/cells';
import { excelSerialToISO, isoToMonth } from '../lib/dates';
import { coerceNumber } from '../lib/numbers';

const SHEET = 'APNU_Fuel Prices';

export function runApnuFuel(book: WorkBook, ctx: IngestContext): void {
  const sheet = book.Sheets[SHEET];
  if (!sheet) return;
  const b = sheetBounds(sheet);
  if (!b) return;
  const caveat = ctx.caveats.get(SHEET) ?? null;

  const SERIES: Array<{ id: string; name: string; col: number; unit: string }> = [
    { id: 'apnu_fuel_brent_usd_bbl', name: 'Brent crude, US$ per barrel', col: 2, unit: 'US$/bbl' },
    { id: 'apnu_fuel_gog_excise', name: 'GOG Excise Tax on gasoline and diesel', col: 3, unit: 'percent' },
  ];
  for (const s of SERIES) {
    ctx.indicators.set(s.id, {
      id: s.id, name: s.name, category: 'prices',
      subcategory: 'APNU-era fuel policy',
      unit: s.unit, frequency: 'monthly',
      source: 'Guyana Revenue Authority (historical)',
      sourceTab: SHEET, caveat,
    });
  }
  for (let r = b.r + 2; r <= b.R; r++) {
    if (isBlankRow(sheet, r, b.c, b.C)) continue;
    if (isNavCell(cellAt(sheet, r, 0))) continue;
    const dateRaw = cellAt(sheet, r, 1);
    if (typeof dateRaw !== 'number') continue;
    const iso = excelSerialToISO(dateRaw);
    if (!iso) continue;
    const period = isoToMonth(iso);
    if (!period) continue;
    for (const s of SERIES) {
      const raw = cellAt(sheet, r, s.col);
      if (raw === null || raw === undefined || raw === '') continue;
      const value = coerceNumber(raw, { sheet: SHEET, r, c: s.col }, ctx, { format: cellFormat(sheet, r, s.col) });
      if (value === null) continue;
      ctx.observations.push({
        indicatorId: s.id, periodDate: period.periodDate, periodLabel: period.periodLabel,
        value, scenario: 'actual',
      });
    }
  }
}
