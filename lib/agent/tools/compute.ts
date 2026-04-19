// Deterministic server-side arithmetic. Pure function. No IO.
//
// Ops:
//   - yoy_growth, indexed          : single series in, single series out
//   - cagr, correlation            : single pair in, scalar out
//   - ratio, share, difference     : single OR batched on the varying side
//
// Contract: nulls propagate (a null input produces a null output, not zero).
//           paired ops require aligned periods (same length, same periodDate per index).

import type { Point, ToolError } from '../types';

// --------- Input / output shapes ---------

export type BatchedSeries = { id: string; series: Point[] };

export type ComputeInput =
  | { operation: 'yoy_growth'; series: Point[] }
  | { operation: 'cagr'; series: Point[]; start?: string; end?: string }
  | { operation: 'indexed'; series: Point[]; base_period: string }
  | { operation: 'correlation'; a: Point[]; b: Point[] }
  | { operation: 'ratio'; numerator: Point[] | BatchedSeries[]; denominator: Point[] }
  | { operation: 'share'; part: Point[] | BatchedSeries[]; total: Point[] }
  | { operation: 'difference'; a: Point[] | BatchedSeries[]; b: Point[] };

type PairedOp = 'ratio' | 'share' | 'difference';

type SingleSeriesOut = { result: Point[]; nulls_propagated: number };

export type ComputeResult =
  | { operation: 'yoy_growth' | 'indexed' } & SingleSeriesOut
  | { operation: 'cagr'; result: { startPeriod: string; endPeriod: string; valueStart: number; valueEnd: number; rate: number } }
  | { operation: 'correlation'; result: { n: number; r: number; pairsDropped: number } }
  | ({ operation: PairedOp } & SingleSeriesOut)
  | { operation: PairedOp; results: Array<{ id: string } & SingleSeriesOut> }
  | ToolError<
      | 'series_misaligned'
      | 'base_period_missing'
      | 'insufficient_pairs'
      | 'empty_series'
      | 'unknown_operation'
      | 'invalid_range'
    >;

// --------- Entry point ---------

export function compute(input: ComputeInput): ComputeResult {
  switch (input.operation) {
    case 'yoy_growth': return yoyGrowth(input.series);
    case 'cagr': return cagr(input.series, input.start, input.end);
    case 'indexed': return indexed(input.series, input.base_period);
    case 'correlation': return correlation(input.a, input.b);
    case 'ratio': return paired('ratio', input.numerator, input.denominator);
    case 'share': return paired('share', input.part, input.total);
    case 'difference': return paired('difference', input.a, input.b);
    default: return { error: 'unknown_operation' } as ComputeResult;
  }
}

// --------- Ops ---------

function yoyGrowth(series: Point[]): ComputeResult {
  if (!series.length) return { error: 'empty_series' };
  const out: Point[] = [];
  let nulls = 0;
  for (let i = 0; i < series.length; i++) {
    const cur = series[i]!;
    const prev = i > 0 ? series[i - 1]! : undefined;
    if (!prev) {
      out.push({ periodDate: cur.periodDate, value: null });
      nulls++;
      continue;
    }
    if (cur.value === null || prev.value === null || prev.value === 0) {
      out.push({ periodDate: cur.periodDate, value: null });
      nulls++;
      continue;
    }
    const pct = ((cur.value - prev.value) / prev.value) * 100;
    out.push({ periodDate: cur.periodDate, value: round(pct, 6) });
  }
  return { operation: 'yoy_growth', result: out, nulls_propagated: nulls };
}

function cagr(series: Point[], start?: string, end?: string): ComputeResult {
  if (!series.length) return { error: 'empty_series' };
  const sorted = [...series].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  const startPoint = start
    ? sorted.find((p) => p.periodDate === start)
    : sorted.find((p) => p.value !== null);
  const endPoint = end
    ? sorted.find((p) => p.periodDate === end)
    : [...sorted].reverse().find((p) => p.value !== null);

  if (!startPoint || !endPoint) return { error: 'invalid_range', detail: 'start or end not found in series' };
  if (startPoint.value === null || endPoint.value === null) {
    return { error: 'invalid_range', detail: 'start or end value is null' };
  }
  if (startPoint.value <= 0) return { error: 'invalid_range', detail: 'start value must be positive for CAGR' };

  const years = yearsBetween(startPoint.periodDate, endPoint.periodDate);
  if (years <= 0) return { error: 'invalid_range', detail: 'end must be after start' };

  const rate = Math.pow(endPoint.value / startPoint.value, 1 / years) - 1;
  return {
    operation: 'cagr',
    result: {
      startPeriod: startPoint.periodDate,
      endPeriod: endPoint.periodDate,
      valueStart: startPoint.value,
      valueEnd: endPoint.value,
      rate: round(rate, 6),
    },
  };
}

function indexed(series: Point[], basePeriod: string): ComputeResult {
  if (!series.length) return { error: 'empty_series' };
  const base = series.find((p) => p.periodDate === basePeriod);
  if (!base || base.value === null || base.value === 0) return { error: 'base_period_missing' };
  let nulls = 0;
  const out: Point[] = series.map((p) => {
    if (p.value === null) { nulls++; return { periodDate: p.periodDate, value: null }; }
    return { periodDate: p.periodDate, value: round((p.value / base.value!) * 100, 6) };
  });
  return { operation: 'indexed', result: out, nulls_propagated: nulls };
}

function correlation(a: Point[], b: Point[]): ComputeResult {
  if (!a.length || !b.length) return { error: 'empty_series' };
  if (!alignedByDate(a, b)) return { error: 'series_misaligned', detail: `a has ${a.length} periods, b has ${b.length}` };

  const pairs: Array<[number, number]> = [];
  let dropped = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!.value;
    const bv = b[i]!.value;
    if (av === null || bv === null) { dropped++; continue; }
    pairs.push([av, bv]);
  }
  if (pairs.length < 2) return { error: 'insufficient_pairs', n: pairs.length };

  const n = pairs.length;
  const meanA = pairs.reduce((s, [x]) => s + x, 0) / n;
  const meanB = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanA, dy = y - meanB;
    num += dx * dy;
    denA += dx * dx;
    denB += dy * dy;
  }
  const denom = Math.sqrt(denA * denB);
  const r = denom === 0 ? 0 : num / denom;
  return { operation: 'correlation', result: { n, r: round(r, 6), pairsDropped: dropped } };
}

// Paired ops — supports single series or batched BatchedSeries[] on the varying side.
function paired(
  op: PairedOp,
  varying: Point[] | BatchedSeries[],
  shared: Point[],
): ComputeResult {
  if (!shared.length) return { error: 'empty_series' };

  if (isBatched(varying)) {
    if (!varying.length) return { error: 'empty_series' };
    const results = varying.map((b) => {
      const single = singlePaired(op, b.series, shared);
      if ('error' in single) return { id: b.id, error: single.error, detail: single.detail };
      return { id: b.id, result: single.result, nulls_propagated: single.nulls_propagated };
    });
    // If any entry errored, surface misalignment at the top level — all series must align with the shared side.
    const firstError = results.find((r) => 'error' in r);
    if (firstError) {
      const e = firstError as { error: string; detail?: unknown };
      return { error: e.error as 'series_misaligned', detail: e.detail } as ComputeResult;
    }
    return {
      operation: op,
      results: results.map((r) => ({ id: r.id, result: (r as { result: Point[] }).result, nulls_propagated: (r as { nulls_propagated: number }).nulls_propagated })),
    };
  }

  const single = singlePaired(op, varying, shared);
  if ('error' in single) return { error: single.error as 'series_misaligned', detail: single.detail };
  return { operation: op, result: single.result, nulls_propagated: single.nulls_propagated };
}

function singlePaired(
  op: PairedOp,
  varying: Point[],
  shared: Point[],
): { result: Point[]; nulls_propagated: number } | { error: 'series_misaligned' | 'empty_series'; detail?: string } {
  if (!varying.length || !shared.length) return { error: 'empty_series' };
  if (!alignedByDate(varying, shared)) {
    return { error: 'series_misaligned', detail: `varying has ${varying.length} periods, shared has ${shared.length}` };
  }

  const out: Point[] = [];
  let nulls = 0;
  for (let i = 0; i < varying.length; i++) {
    const v = varying[i]!.value;
    const s = shared[i]!.value;
    const period = varying[i]!.periodDate;

    if (v === null || s === null) {
      out.push({ periodDate: period, value: null });
      nulls++;
      continue;
    }

    if (op === 'ratio' || op === 'share') {
      if (s === 0) { out.push({ periodDate: period, value: null }); nulls++; continue; }
      const val = v / s;
      out.push({ periodDate: period, value: round(op === 'share' ? val : val, 6) });
    } else {
      out.push({ periodDate: period, value: round(v - s, 6) });
    }
  }
  return { result: out, nulls_propagated: nulls };
}

// --------- Helpers ---------

function alignedByDate(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.periodDate !== b[i]!.periodDate) return false;
  }
  return true;
}

function isBatched(x: Point[] | BatchedSeries[]): x is BatchedSeries[] {
  if (!x.length) return false;
  const first = x[0] as Partial<BatchedSeries> & Partial<Point>;
  return typeof first.id === 'string' && Array.isArray(first.series);
}

function yearsBetween(startISO: string, endISO: string): number {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  return (end - start) / (365.25 * 86400 * 1000);
}

function round(x: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}
