// Coerce a cell value into a number or null, pushing a quarantine issue
// for non-blank cells that don't parse.
import type { IngestContext, Issue } from './types';
import { cellRef } from './cells';

const NULLISH = new Set(['', 'n/a', 'na', 'n.a.', '-', '—', 'nil', 'null', '#n/a', '#ref!', '#value!', '#div/0!', '#name?', '#num!']);

export function coerceNumber(
  v: unknown,
  loc: { sheet: string; r: number; c: number },
  ctx: IngestContext,
  severity: Issue['severity'] = 'info',
): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  if (NULLISH.has(s.toLowerCase())) return null;
  // Strip footnote markers and thousand separators
  const stripped = s
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰\*\u2020\u2021]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/^\((.+)\)$/, '-$1'); // (123) => -123
  // Percentages: keep as decimal? Keep as value-as-written; callers decide units.
  const pctMatch = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(stripped);
  if (pctMatch) return Number(pctMatch[1]);
  const n = Number(stripped);
  if (Number.isFinite(n)) return n;
  ctx.pushIssue({
    sheet: loc.sheet,
    row: loc.r + 1,
    col: loc.c + 1,
    cellRef: cellRef(loc.r, loc.c),
    rawValue: s.slice(0, 80),
    reason: `Non-numeric value "${s.slice(0, 40)}" in a numeric cell.`,
    severity,
  });
  return null;
}
