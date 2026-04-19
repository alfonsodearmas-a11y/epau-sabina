import type { Point, ToolError } from '../types';

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

export function compute(input: ComputeInput): ComputeResult {
  const norm = normalizeInput(input);
  switch (norm.operation) {
    case 'yoy_growth': return yoyGrowth(norm.series);
    case 'cagr': return cagr(norm.series, norm.start, norm.end);
    case 'indexed': return indexed(norm.series, norm.base_period);
    case 'correlation': return correlation(norm.a, norm.b);
    case 'ratio': return paired('ratio', norm.numerator, norm.denominator);
    case 'share': return paired('share', norm.part, norm.total);
    case 'difference': return paired('difference', norm.a, norm.b);
    default: return { error: 'unknown_operation' } as ComputeResult;
  }
}

// Claude occasionally serialises the varying-side argument as a JSON string
// (e.g. `"part": "[{...}]"`) rather than the array the schema asks for.
// Accept that shape so a single Claude-side slip doesn't burn the tool budget.
function normalizeInput(input: ComputeInput): ComputeInput {
  const coerce = (v: unknown): unknown => {
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return v; }
  };
  const clone = { ...input } as Record<string, unknown>;
  for (const k of ['a', 'numerator', 'part'] as const) {
    if (k in clone) clone[k] = coerce(clone[k]);
  }
  return clone as ComputeInput;
}

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

class AlignmentError extends Error {
  readonly code: 'series_misaligned' | 'empty_series';
  constructor(code: 'series_misaligned' | 'empty_series', detail: string) {
    super(detail);
    this.code = code;
  }
}

function paired(
  op: PairedOp,
  varying: Point[] | BatchedSeries[],
  shared: Point[],
): ComputeResult {
  if (!shared.length) return { error: 'empty_series' };

  try {
    if (isBatched(varying)) {
      if (!varying.length) return { error: 'empty_series' };
      const results = varying.map((b) => ({ id: b.id, ...singlePaired(op, b.series, shared) }));
      return { operation: op, results };
    }
    return { operation: op, ...singlePaired(op, varying, shared) };
  } catch (err) {
    if (err instanceof AlignmentError) return { error: err.code, detail: err.message };
    throw err;
  }
}

function singlePaired(
  op: PairedOp,
  varying: Point[],
  shared: Point[],
): { result: Point[]; nulls_propagated: number } {
  if (!varying.length || !shared.length) throw new AlignmentError('empty_series', 'one side is empty');
  if (!alignedByDate(varying, shared)) {
    throw new AlignmentError('series_misaligned', `varying has ${varying.length} periods, shared has ${shared.length}`);
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
      out.push({ periodDate: period, value: round(v / s, 6) });
    } else {
      out.push({ periodDate: period, value: round(v - s, 6) });
    }
  }
  return { result: out, nulls_propagated: nulls };
}

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
