import { describe, expect, it } from 'vitest';
import { flagUnavailable } from './flag_unavailable';
import { isToolError } from '../types';

describe('flag_unavailable', () => {
  it('happy: populated payload returns a render_id', () => {
    const r = flagUnavailable({
      reason: 'Workbook does not carry Gini coefficient for Guyana.',
      missing: [{
        requested: 'Gini coefficient for Guyana',
        closest_available: [{ indicator_id: 'minimum_wage_gyd', why: 'Policy rate, not distributional.' }],
      }],
      searched: [{ tool: 'search_catalog', query: 'Gini coefficient inequality', top_hits: [] }],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.render_id).toMatch(/^rnd_/);
    expect(r.acknowledged).toBe(true);
  });

  it('failure: empty searched array is rejected with hint', () => {
    const r = flagUnavailable({
      reason: 'No data',
      missing: [{ requested: 'X', closest_available: [] }],
      searched: [],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) {
      expect(r.error).toBe('flag_unavailable_without_search');
      expect(r.hint).toBeDefined();
    }
  });

  it('failure: empty missing array is rejected', () => {
    const r = flagUnavailable({
      reason: 'No data',
      missing: [],
      searched: [{ tool: 'search_catalog', query: 'gini', top_hits: [] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('flag_unavailable_empty');
  });

  it('edge: empty reason is rejected', () => {
    const r = flagUnavailable({
      reason: '',
      missing: [{ requested: 'X', closest_available: [] }],
      searched: [{ tool: 'search_catalog', query: 'x', top_hits: [] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('flag_unavailable_invalid');
  });

  it('edge: invalid searched.tool is rejected', () => {
    const r = flagUnavailable({
      reason: 'No data',
      missing: [{ requested: 'X', closest_available: [] }],
      searched: [{ tool: 'web_search' as never, query: 'x', top_hits: [] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('flag_unavailable_invalid');
  });

  it('edge: missing item without requested text is rejected', () => {
    const r = flagUnavailable({
      reason: 'No data',
      missing: [{ requested: '', closest_available: [] }],
      searched: [{ tool: 'search_catalog', query: 'x', top_hits: [] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('flag_unavailable_invalid');
  });
});
