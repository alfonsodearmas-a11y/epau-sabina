import { describe, expect, it } from 'vitest';
import { compute } from './compute';
import { isToolError, type Point } from '../types';

const pt = (periodDate: string, value: number | null): Point => ({ periodDate, value });

// --------- yoy_growth ---------
describe('compute: yoy_growth', () => {
  it('happy: computes period-over-period growth, nulls first row', () => {
    const r = compute({
      operation: 'yoy_growth',
      series: [pt('2022-12-31', 100), pt('2023-12-31', 110)],
    });
    if (isToolError(r)) throw new Error('unexpected error');
    expect(r.result).toEqual([
      { periodDate: '2022-12-31', value: null },
      { periodDate: '2023-12-31', value: 10 },
    ]);
    expect(r.nulls_propagated).toBe(1);
  });

  it('edge: null input propagates as null output', () => {
    const r = compute({
      operation: 'yoy_growth',
      series: [pt('2022-12-31', null), pt('2023-12-31', 110)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result[1].value).toBeNull();
    expect(r.nulls_propagated).toBe(2);
  });

  it('edge: zero prior period yields null growth (no div by zero)', () => {
    const r = compute({
      operation: 'yoy_growth',
      series: [pt('2022-12-31', 0), pt('2023-12-31', 50)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result[1].value).toBeNull();
  });

  it('failure: empty series', () => {
    const r = compute({ operation: 'yoy_growth', series: [] });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('empty_series');
  });
});

// --------- cagr ---------
describe('compute: cagr', () => {
  it('happy: 100 → 200 over 4 years ≈ 18.92%', () => {
    const r = compute({
      operation: 'cagr',
      series: [pt('2019-12-31', 100), pt('2023-12-31', 200)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result.rate).toBeCloseTo(0.189207, 4);
  });

  it('failure: invalid range when start > end', () => {
    const r = compute({
      operation: 'cagr',
      series: [pt('2019-12-31', 100), pt('2023-12-31', 200)],
      start: '2023-12-31',
      end: '2019-12-31',
    });
    expect(isToolError(r)).toBe(true);
  });

  it('failure: null start value', () => {
    const r = compute({
      operation: 'cagr',
      series: [pt('2019-12-31', null), pt('2023-12-31', 200)],
    });
    expect(isToolError(r)).toBe(true);
  });
});

// --------- indexed ---------
describe('compute: indexed', () => {
  it('happy: rebases to 100 at base period', () => {
    const r = compute({
      operation: 'indexed',
      base_period: '2015-12-31',
      series: [pt('2015-12-31', 50), pt('2023-12-31', 75)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result[0].value).toBe(100);
    expect(r.result[1].value).toBe(150);
  });

  it('failure: base period missing', () => {
    const r = compute({
      operation: 'indexed',
      base_period: '1999-12-31',
      series: [pt('2015-12-31', 50)],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('base_period_missing');
  });

  it('edge: null preserved', () => {
    const r = compute({
      operation: 'indexed',
      base_period: '2015-12-31',
      series: [pt('2015-12-31', 50), pt('2020-12-31', null), pt('2023-12-31', 75)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result[1].value).toBeNull();
    expect(r.nulls_propagated).toBe(1);
  });
});

// --------- correlation ---------
describe('compute: correlation', () => {
  it('happy: perfect positive correlation', () => {
    const r = compute({
      operation: 'correlation',
      a: [pt('2020-12-31', 1), pt('2021-12-31', 2), pt('2022-12-31', 3), pt('2023-12-31', 4)],
      b: [pt('2020-12-31', 2), pt('2021-12-31', 4), pt('2022-12-31', 6), pt('2023-12-31', 8)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.result.r).toBeCloseTo(1, 5);
    expect(r.result.n).toBe(4);
  });

  it('failure: misaligned periods', () => {
    const r = compute({
      operation: 'correlation',
      a: [pt('2020-12-31', 1)],
      b: [pt('2021-12-31', 2)],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('series_misaligned');
  });

  it('failure: insufficient pairs after null drops', () => {
    const r = compute({
      operation: 'correlation',
      a: [pt('2020-12-31', null), pt('2021-12-31', 2)],
      b: [pt('2020-12-31', 1), pt('2021-12-31', null)],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('insufficient_pairs');
  });
});

// --------- ratio / share / difference (single + batched) ---------
describe('compute: ratio / share / difference (single)', () => {
  it('ratio: per-period division, zero denom → null', () => {
    const r = compute({
      operation: 'ratio',
      numerator: [pt('2020-12-31', 10), pt('2021-12-31', 20)],
      denominator: [pt('2020-12-31', 5), pt('2021-12-31', 0)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect((r as { result: Point[] }).result).toEqual([
      { periodDate: '2020-12-31', value: 2 },
      { periodDate: '2021-12-31', value: null },
    ]);
  });

  it('share: part / total, nulls propagate', () => {
    const r = compute({
      operation: 'share',
      part: [pt('2020-12-31', 30), pt('2021-12-31', null)],
      total: [pt('2020-12-31', 100), pt('2021-12-31', 200)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect((r as { result: Point[] }).result[0].value).toBe(0.3);
    expect((r as { result: Point[] }).result[1].value).toBeNull();
  });

  it('difference: a - b per period', () => {
    const r = compute({
      operation: 'difference',
      a: [pt('2023-12-31', 62.3)],
      b: [pt('2023-12-31', 3.0)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect((r as { result: Point[] }).result[0].value).toBeCloseTo(59.3, 5);
  });

  it('failure: misalignment on paired op', () => {
    const r = compute({
      operation: 'ratio',
      numerator: [pt('2020-12-31', 10)],
      denominator: [pt('2021-12-31', 5)],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('series_misaligned');
  });
});

describe('compute: batched share / ratio / difference', () => {
  it('batched share: returns per-series results in same order', () => {
    const total = [pt('2015-12-31', 500000), pt('2023-12-31', 900000)];
    const r = compute({
      operation: 'share',
      part: [
        { id: 'households', series: [pt('2015-12-31', 120000), pt('2023-12-31', 260000)] },
        { id: 'mortgages', series: [pt('2015-12-31', 80000), pt('2023-12-31', 210000)] },
      ],
      total,
    });
    if (isToolError(r)) throw new Error('unexpected');
    if (!('results' in r)) throw new Error('expected batched results');
    expect(r.results).toHaveLength(2);
    expect(r.results[0].id).toBe('households');
    expect(r.results[0].result[0].value).toBe(0.24);
    expect(r.results[1].id).toBe('mortgages');
    expect(r.results[1].result[1].value).toBeCloseTo(0.233333, 5);
  });

  it('batched difference: works for GDP growth deltas', () => {
    const r = compute({
      operation: 'difference',
      a: [
        { id: 'guy', series: [pt('2022-12-31', 62.3), pt('2023-12-31', 33)] },
        { id: 'bra', series: [pt('2022-12-31', 3.0), pt('2023-12-31', 2.9)] },
      ],
      b: [pt('2022-12-31', 3.5), pt('2023-12-31', 3.2)],
    });
    if (isToolError(r)) throw new Error('unexpected');
    if (!('results' in r)) throw new Error('expected batched');
    expect(r.results[0].result[0].value).toBeCloseTo(58.8, 5);
    expect(r.results[1].result[1].value).toBeCloseTo(-0.3, 5);
  });

  it('batched misalignment: returns error if any series fails to align with shared side', () => {
    const r = compute({
      operation: 'ratio',
      numerator: [
        { id: 'ok', series: [pt('2020-12-31', 10)] },
        { id: 'bad', series: [pt('2021-12-31', 20)] },
      ],
      denominator: [pt('2020-12-31', 5)],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('series_misaligned');
  });
});

// --------- unknown op ---------
describe('compute: misc', () => {
  it('unknown_operation', () => {
    const r = compute({ operation: 'bogus' as never, series: [pt('2020-12-31', 1)] } as never);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('unknown_operation');
  });
});
