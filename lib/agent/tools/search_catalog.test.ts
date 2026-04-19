import { describe, expect, it } from 'vitest';
import { searchCatalog, type SearchCatalogDb, type IndicatorRow, type ComparisonTableRow } from './search_catalog';
import { isToolError } from '../types';

const indicator = (id: string, score: number, overrides: Partial<IndicatorRow> = {}): IndicatorRow => ({
  id,
  name: id.replace(/_/g, ' '),
  category: 'monetary',
  subcategory: null,
  unit: 'G$ millions',
  frequency: 'annual',
  source: 'Bank of Guyana',
  caveat: null,
  earliestPeriod: '2000-12-31',
  latestPeriod: '2023-12-31',
  score,
  ...overrides,
});

const ctable = (id: string, score: number, overrides: Partial<ComparisonTableRow> = {}): ComparisonTableRow => ({
  id,
  name: id.replace(/_/g, ' '),
  category: 'social',
  source: 'MoE',
  sourceTab: 'Measures_GOAL',
  description: null,
  rowCount: 10,
  score,
  ...overrides,
});

function makeDb(inds: IndicatorRow[], cts: ComparisonTableRow[]): SearchCatalogDb {
  return {
    async searchIndicators() { return inds; },
    async searchComparisonTables() { return cts; },
  };
}

describe('search_catalog', () => {
  it('happy path: merges and ranks indicators + comparison tables by score', async () => {
    const db = makeDb(
      [indicator('private_sector_credit_total', 0.9), indicator('private_sector_credit_mortgages', 0.7)],
      [ctable('measures_psc_growth', 0.85)],
    );
    const res = await searchCatalog({ query: 'private sector credit' }, db);
    if (isToolError(res)) throw new Error('unexpected error');
    expect(res.matches.map((m) => m.id)).toEqual([
      'private_sector_credit_total',
      'measures_psc_growth',
      'private_sector_credit_mortgages',
    ]);
    expect(res.matches[0].kind).toBe('indicator');
    expect(res.matches[1].kind).toBe('comparison_table');
    expect(res.truncated).toBe(false);
  });

  it('failure: invalid category rejects before any DB call', async () => {
    let called = false;
    const db: SearchCatalogDb = {
      async searchIndicators() { called = true; return []; },
      async searchComparisonTables() { called = true; return []; },
    };
    const res = await searchCatalog({ query: 'x', category: 'bogus' as never }, db);
    expect(isToolError(res)).toBe(true);
    if (isToolError(res)) expect(res.error).toBe('unknown_category');
    expect(called).toBe(false);
  });

  it('edge: empty query returns invalid_query error without hitting DB', async () => {
    const db = makeDb([], []);
    const res = await searchCatalog({ query: '   ' }, db);
    expect(isToolError(res)).toBe(true);
    if (isToolError(res)) expect(res.error).toBe('invalid_query');
  });

  it('edge: respects kinds filter (indicators only)', async () => {
    const db = makeDb([indicator('gdp_overall', 0.9)], [ctable('measures_goal', 0.95)]);
    const res = await searchCatalog({ query: 'x', kinds: ['indicator'] }, db);
    if (isToolError(res)) throw new Error('unexpected error');
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].kind).toBe('indicator');
  });

  it('edge: truncated=true when combined pool exceeds limit', async () => {
    const db = makeDb(
      [indicator('a', 0.9), indicator('b', 0.8), indicator('c', 0.7)],
      [ctable('d', 0.95)],
    );
    const res = await searchCatalog({ query: 'x', limit: 2 }, db);
    if (isToolError(res)) throw new Error('unexpected error');
    expect(res.matches).toHaveLength(2);
    expect(res.truncated).toBe(true);
    expect(res.matches[0].id).toBe('d');
    expect(res.matches[1].id).toBe('a');
  });

  it('edge: DB failure surfaces as search_failed', async () => {
    const db: SearchCatalogDb = {
      async searchIndicators() { throw new Error('pg is down'); },
      async searchComparisonTables() { return []; },
    };
    const res = await searchCatalog({ query: 'x' }, db);
    expect(isToolError(res)).toBe(true);
    if (isToolError(res)) expect(res.error).toBe('search_failed');
  });
});
