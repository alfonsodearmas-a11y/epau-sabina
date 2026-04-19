import { INDICATOR_CATEGORIES, type IndicatorCategory, type ToolError } from '../types';

export type ComparisonTableSummary = {
  id: string;
  name: string;
  category: IndicatorCategory | null;
  source: string | null;
  sourceTab: string;
  description: string | null;
  rowCount: number;
};

export type ComparisonTableDetail = {
  id: string;
  name: string;
  sourceTab: string;
  description: string | null;
  rows: Array<{
    rowLabel: string;
    groupLabel: string | null;
    columnLabel: string;
    value: number | null;
    valueText: string | null;
    unit: string | null;
    note: string | null;
    orderIndex: number;
  }>;
};

export interface ComparisonTablesDb {
  listComparisonTables(args: { category?: IndicatorCategory; limit: number }): Promise<ComparisonTableSummary[]>;
  getComparisonTable(id: string): Promise<ComparisonTableDetail | null>;
}

const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

export type ListComparisonTablesInput = { category?: IndicatorCategory; limit?: number };
export type ListComparisonTablesResult =
  | { tables: ComparisonTableSummary[] }
  | ToolError<'unknown_category' | 'fetch_failed'>;

export async function listComparisonTables(
  input: ListComparisonTablesInput,
  db: ComparisonTablesDb,
): Promise<ListComparisonTablesResult> {
  if (input.category && !INDICATOR_CATEGORIES.includes(input.category)) {
    return { error: 'unknown_category', allowed: INDICATOR_CATEGORIES };
  }
  const limit = Math.max(1, Math.min(MAX_LIST_LIMIT, input.limit ?? DEFAULT_LIST_LIMIT));
  try {
    const tables = await db.listComparisonTables({ category: input.category, limit });
    return { tables };
  } catch (err) {
    return { error: 'fetch_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}

export type GetComparisonTableInput = { id: string };
export type GetComparisonTableResult =
  | ComparisonTableDetail
  | ToolError<'comparison_table_not_found' | 'fetch_failed' | 'invalid_input'>;

export async function getComparisonTable(
  input: GetComparisonTableInput,
  db: ComparisonTablesDb,
): Promise<GetComparisonTableResult> {
  const id = (input.id ?? '').trim();
  if (!id) return { error: 'invalid_input', detail: 'id is required' };
  try {
    const table = await db.getComparisonTable(id);
    if (!table) return { error: 'comparison_table_not_found', id };
    return table;
  } catch (err) {
    return { error: 'fetch_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}
