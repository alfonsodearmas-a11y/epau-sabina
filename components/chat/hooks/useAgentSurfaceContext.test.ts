import { describe, expect, it } from 'vitest';
import { resolveSurface } from './useAgentSurfaceContext';

describe('resolveSurface', () => {
  it('workbench at root', () => {
    const r = resolveSurface('/');
    expect(r.surface).toBe('workbench');
    expect(r.context).toBeUndefined();
    expect(r.label).toBe('On Workbench');
  });

  it('workbench at /workbench with active_chart extras', () => {
    const r = resolveSurface('/workbench', { activeChart: { indicator_ids: ['gdp_overall'] } });
    expect(r.surface).toBe('workbench');
    expect(r.context?.active_chart?.indicator_ids).toEqual(['gdp_overall']);
  });

  it('catalog list: no context', () => {
    const r = resolveSurface('/catalog');
    expect(r.surface).toBe('catalog');
    expect(r.context).toBeUndefined();
  });

  it('catalog detail: passes indicator_id', () => {
    const r = resolveSurface('/catalog/inflation_hist_12_month_inflation_rate');
    expect(r.surface).toBe('catalog');
    expect(r.context?.indicator_id).toBe('inflation_hist_12_month_inflation_rate');
  });

  it('saved detail: passes saved_view_id', () => {
    const r = resolveSurface('/saved/abc-123');
    expect(r.surface).toBe('saved');
    expect(r.context?.saved_view_id).toBe('abc-123');
  });

  it('comparisons detail: passes comparison_table_id', () => {
    const r = resolveSurface('/comparisons/measures_goal');
    expect(r.surface).toBe('comparisons');
    expect(r.context?.comparison_table_id).toBe('measures_goal');
  });

  it('admin: no context', () => {
    const r = resolveSurface('/admin');
    expect(r.surface).toBe('admin');
    expect(r.context).toBeUndefined();
  });

  it('denied: excluded', () => {
    const r = resolveSurface('/denied');
    expect(r.isExcluded).toBe(true);
  });
});
