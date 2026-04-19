// Coerce a cell value into a number or null, pushing a quarantine issue
// for non-blank cells that don't parse.
//
// Percent-format awareness: Excel stores percent-formatted cells as decimal
// ratios (cell.v = 0.435) with a number format containing "%" (cell.z =
// "0.0%"). We multiply by 100 when the format has "%", so a cell displayed in
// Excel as "43.5%" reaches the catalog as 43.5 — matching the indicator's
// "percent" unit. Cells without "%" in their format (plain-numeric cells that
// happen to hold conceptual percentages, e.g. a typed "25") are left alone.
import type { IngestContext, Issue } from './types';
import { cellRef } from './cells';

const NULLISH = new Set(['', 'n/a', 'na', 'n.a.', '-', '—', 'nil', 'null', '#n/a', '#ref!', '#value!', '#div/0!', '#name?', '#num!']);

export interface CoerceOpts {
  severity?: Issue['severity'];
  format?: string;
}

export function coerceNumber(
  v: unknown,
  loc: { sheet: string; r: number; c: number },
  ctx: IngestContext,
  severityOrOpts: Issue['severity'] | CoerceOpts = 'info',
): number | null {
  const opts: CoerceOpts = typeof severityOrOpts === 'string' ? { severity: severityOrOpts } : severityOrOpts;
  const severity = opts.severity ?? 'info';
  if (v === null || v === undefined) return null;
  let n: number | null = null;
  if (typeof v === 'number') {
    n = Number.isFinite(v) ? v : null;
  } else {
    const s = String(v).trim();
    if (!s) return null;
    if (NULLISH.has(s.toLowerCase())) return null;
    const stripped = s
      .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰\*\u2020\u2021]/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .replace(/^\((.+)\)$/, '-$1');
    const pctMatch = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(stripped);
    if (pctMatch) return Number(pctMatch[1]); // explicit "%" in the cell value — already scaled
    const parsed = Number(stripped);
    if (Number.isFinite(parsed)) n = parsed;
    else {
      ctx.pushIssue({
        sheet: loc.sheet, row: loc.r + 1, col: loc.c + 1,
        cellRef: cellRef(loc.r, loc.c),
        rawValue: s.slice(0, 80),
        reason: `Non-numeric value "${s.slice(0, 40)}" in a numeric cell.`,
        severity,
      });
      return null;
    }
  }
  if (n === null) return null;
  if (opts.format && isPercentFormat(opts.format)) return n * 100;
  return n;
}

// Detect an Excel number format that renders a stored decimal as a percent.
// xlsx exposes format codes like "0%", "0.00%", "0.0%;-0.0%;-", etc. We treat
// any format containing an unescaped "%" as a percent format.
export function isPercentFormat(format: string | undefined): boolean {
  if (!format) return false;
  // Format strings can contain escaped quotes for literal text; for our purposes
  // any "%" signals percent formatting. Excel doesn't allow literal % without %%.
  return /%/.test(format);
}
