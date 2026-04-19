import { describe, expect, it } from 'vitest';
import { collectAllowedValues, runNumericAudit } from './numeric_audit';

// Build a synthetic tool-output set shaped like the real adapters return:
// - get_observations: { series: [{ observations: [{ value }, ...] }, ...] }
// - compute (share, batched): { operation, results: [{ result: [{ value }] }, ...] }

describe('runNumericAudit', () => {
  it('passes when every cited figure matches a retrieved value', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 1.977 }] }] } },
    ]);
    const r = runNumericAudit('Inflation in 2023 was 1.98 percent.', allowed);
    expect(r.pass).toBe(true);
    expect(r.unground).toHaveLength(0);
  });

  it('fails when the prose cites a hand-computed multi-year average', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: {
        series: [{ observations: [
          { value: 3.807483 }, { value: 3.734495 }, { value: 4.440981 }, { value: 5.352831 },
          { value: 43.479622 },
        ] }],
      } },
    ]);
    // 3.6 and 40.9 are not in the retrieved set.
    const r = runNumericAudit(
      'Over 2016 to 2019 Guyana averaged 3.6 percent and over 2020 to 2024 it averaged 40.9 percent.',
      allowed,
    );
    expect(r.pass).toBe(false);
    expect(r.unground.map((u) => u.value)).toEqual(expect.arrayContaining([3.6, 40.9]));
  });

  it('tolerates rounding: 1.98 matches 1.977', () => {
    const allowed = collectAllowedValues([{ tool: 'get_observations', output: { series: [{ observations: [{ value: 1.977 }] }] } }]);
    const r = runNumericAudit('1.98 percent', allowed);
    expect(r.pass).toBe(true);
  });

  it('excludes year integers like "since 2018"', () => {
    const allowed = collectAllowedValues([{ tool: 'get_observations', output: { series: [{ observations: [{ value: 43.48 }] }] } }]);
    const r = runNumericAudit('Since 2018 growth reached 43.5 percent in 2020.', allowed);
    // 2018 and 2020 are excluded (years); 43.5 matches 43.48 within tolerance.
    expect(r.pass).toBe(true);
  });

  it('passes when the derivation was explicitly computed', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 0.2785 }, { value: 0.3308 }] }] } },
      { tool: 'compute', output: { operation: 'difference', result: [{ periodDate: '2025-01-01', value: 0.05234 }] } },
    ]);
    const r = runNumericAudit('Services rose 5.2 percentage points.', allowed);
    // 5.2 ≈ 0.05234 × 100 (scale up)
    expect(r.pass).toBe(true);
  });

  it('fails when a pp-change is hand-computed without a compute call', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 0.2785 }, { value: 0.3308 }] }] } },
      { tool: 'compute', output: { operation: 'share', results: [
        { id: 'services', result: [{ value: 0.2785 }, { value: 0.3308 }] },
      ] } },
    ]);
    const r = runNumericAudit('Services rose 5.2 percentage points.', allowed);
    // 5.2 not computed (only the shares are). Should flag.
    expect(r.pass).toBe(false);
    expect(r.unground[0]!.value).toBeCloseTo(5.2, 5);
  });

  it('handles currency scaling: "US$2,712.3 million" matches a DB value in thousands', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 2712300 }] }] } },
    ]);
    const r = runNumericAudit('NRF inflows reached US$2,712.3 million in 2024.', allowed);
    expect(r.pass).toBe(true);
  });

  it('excludes enumeration integers 0..9 and list markers', () => {
    const allowed = collectAllowedValues([{ tool: 'get_observations', output: { series: [{ observations: [{ value: 99.9 }] }] } }]);
    const r = runNumericAudit('Three shifts since 2015:\n1. First\n2. Second\n3. Third', allowed);
    expect(r.pass).toBe(true);
  });

  it('sign-flipped matches pass: "contracted 2.7 percent" matches -2.7', () => {
    const allowed = collectAllowedValues([{ tool: 'get_observations', output: { series: [{ observations: [{ value: -2.7 }] }] } }]);
    const r = runNumericAudit('The world contracted 2.7 percent in 2020.', allowed);
    expect(r.pass).toBe(true);
  });

  it('flags a fabricated multiplier like "thirteen times" written numerically', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 43.48 }, { value: 3.3 }] }] } },
    ]);
    const r = runNumericAudit('Guyana grew 13 times the world rate of 3.3 percent.', allowed);
    // 13 is neither a retrieved value nor an enumeration; should flag (13 not excluded since >=10)
    expect(r.pass).toBe(false);
    expect(r.unground.some((u) => Math.abs(u.value - 13) < 0.01)).toBe(true);
  });

  it('extracts "US$3099.8 million" as 3099.8, not "US$309"', () => {
    const allowed = collectAllowedValues([
      { tool: 'get_observations', output: { series: [{ observations: [{ value: 3099.8 }] }] } },
    ]);
    const r = runNumericAudit('US$3099.8 million', allowed);
    expect(r.pass).toBe(true);
    expect(r.grounded[0]!.value).toBeCloseTo(3099.8 * 1e6, 0);
  });

  it('excludes compound period labels like "12-month" and "10-year"', () => {
    const allowed = collectAllowedValues([{ tool: 'get_observations', output: { series: [{ observations: [{ value: 1.977 }] }] } }]);
    const r = runNumericAudit('The 12-month inflation rate in 2023 was 1.98 percent.', allowed);
    expect(r.pass).toBe(true);
  });

  it('walks nested structures including compute batched results', () => {
    const allowed = collectAllowedValues([
      { tool: 'compute', output: { operation: 'share', results: [
        { id: 'agriculture', result: [{ value: 0.0545 }, { value: 0.0617 }] },
        { id: 'manufacturing', result: [{ value: 0.1409 }, { value: 0.1057 }] },
      ] } },
    ]);
    const r = runNumericAudit('Agriculture ticked up from 5.45 percent to 6.17 percent.', allowed);
    expect(r.pass).toBe(true);
  });
});
