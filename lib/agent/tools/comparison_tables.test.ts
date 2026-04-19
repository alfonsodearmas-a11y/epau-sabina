import { describe, expect, it } from 'vitest';
import { listComparisonTables, getComparisonTable, type ComparisonTablesDb, type ComparisonTableDetail, type ComparisonTableSummary } from './comparison_tables';
import { isToolError } from '../types';

const summary = (id: string, overrides: Partial<ComparisonTableSummary> = {}): ComparisonTableSummary => ({
  id,
  name: id.replace(/_/g, ' '),
  category: 'social',
  source: 'MoE',
  sourceTab: 'Measures_GOAL',
  description: null,
  rowCount: 12,
  ...overrides,
});

const detail = (id: string): ComparisonTableDetail => ({
  id,
  name: id.replace(/_/g, ' '),
  sourceTab: 'Measures_GOAL',
  description: 'regional payouts',
  rows: [
    { rowLabel: 'R1', groupLabel: null, columnLabel: '2022', value: 100, valueText: null, unit: 'G$m', note: null, orderIndex: 0 },
    { rowLabel: 'R2', groupLabel: null, columnLabel: '2022', value: null, valueText: 'Pilot', unit: null, note: null, orderIndex: 1 },
  ],
});

function makeDb(summaries: ComparisonTableSummary[], details: Record<string, ComparisonTableDetail>): ComparisonTablesDb {
  return {
    async listComparisonTables({ category, limit }) {
      let rows = summaries;
      if (category) rows = rows.filter((s) => s.category === category);
      return rows.slice(0, limit);
    },
    async getComparisonTable(id) {
      return details[id] ?? null;
    },
  };
}

describe('list_comparison_tables', () => {
  it('happy: returns all tables', async () => {
    const db = makeDb([summary('measures_goal'), summary('measures_mir', { category: 'fiscal' })], {});
    const r = await listComparisonTables({}, db);
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.tables).toHaveLength(2);
  });

  it('happy: filters by category', async () => {
    const db = makeDb([summary('measures_goal'), summary('measures_mir', { category: 'fiscal' })], {});
    const r = await listComparisonTables({ category: 'fiscal' }, db);
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.tables.map((t) => t.id)).toEqual(['measures_mir']);
  });

  it('failure: invalid category rejects', async () => {
    const db = makeDb([], {});
    const r = await listComparisonTables({ category: 'bogus' as never }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('unknown_category');
  });

  it('edge: DB failure surfaces', async () => {
    const db: ComparisonTablesDb = {
      async listComparisonTables() { throw new Error('pg'); },
      async getComparisonTable() { return null; },
    };
    const r = await listComparisonTables({}, db);
    expect(isToolError(r)).toBe(true);
  });
});

describe('get_comparison_table', () => {
  it('happy: returns full detail including valueText', async () => {
    const db = makeDb([], { measures_goal: detail('measures_goal') });
    const r = await getComparisonTable({ id: 'measures_goal' }, db);
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[1].valueText).toBe('Pilot');
  });

  it('failure: unknown id', async () => {
    const db = makeDb([], {});
    const r = await getComparisonTable({ id: 'nope' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('comparison_table_not_found');
  });

  it('edge: empty id is invalid_input', async () => {
    const db = makeDb([], {});
    const r = await getComparisonTable({ id: '   ' }, db);
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('invalid_input');
  });
});
