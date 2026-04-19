// Unified search across indicators and comparison tables. Single search tool for the agent.
// Behind Postgres FTS + trigram. Merges the two ranked lists, sorts by score, returns a limited set.

import { INDICATOR_CATEGORIES, type CatalogKind, type Frequency, type IndicatorCategory, type ToolError } from '../types';

export type IndicatorRow = {
  id: string;
  name: string;
  category: IndicatorCategory;
  subcategory: string | null;
  unit: string;
  frequency: Frequency;
  source: string;
  caveat: string | null;
  earliestPeriod: string | null;
  latestPeriod: string | null;
  score: number;
};

export type ComparisonTableRow = {
  id: string;
  name: string;
  category: IndicatorCategory | null;
  source: string | null;
  sourceTab: string;
  description: string | null;
  rowCount: number;
  score: number;
};

export interface SearchCatalogDb {
  searchIndicators(args: { query: string; category?: IndicatorCategory; limit: number }): Promise<IndicatorRow[]>;
  searchComparisonTables(args: { query: string; category?: IndicatorCategory; limit: number }): Promise<ComparisonTableRow[]>;
}

export type SearchCatalogInput = {
  query: string;
  category?: IndicatorCategory;
  kinds?: CatalogKind[];
  limit?: number;
};

export type SearchCatalogMatch =
  | ({ kind: 'indicator' } & IndicatorRow)
  | ({ kind: 'comparison_table' } & ComparisonTableRow);

export type SearchCatalogResult =
  | { matches: SearchCatalogMatch[]; truncated: boolean }
  | ToolError<'unknown_category' | 'search_failed' | 'invalid_query'>;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

export async function searchCatalog(
  input: SearchCatalogInput,
  db: SearchCatalogDb,
): Promise<SearchCatalogResult> {
  const query = (input.query ?? '').trim();
  if (!query) return { error: 'invalid_query', detail: 'query must be non-empty' };

  if (input.category && !INDICATOR_CATEGORIES.includes(input.category)) {
    return { error: 'unknown_category', allowed: INDICATOR_CATEGORIES };
  }

  const limit = Math.max(1, Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT));
  const kinds = input.kinds && input.kinds.length ? input.kinds : (['indicator', 'comparison_table'] as CatalogKind[]);

  // Over-fetch from each index so ranking reflects the combined pool rather than per-kind truncation.
  const perSideLimit = limit;

  try {
    const [indicators, comparisonTables] = await Promise.all([
      kinds.includes('indicator')
        ? db.searchIndicators({ query, category: input.category, limit: perSideLimit })
        : Promise.resolve([]),
      kinds.includes('comparison_table')
        ? db.searchComparisonTables({ query, category: input.category, limit: perSideLimit })
        : Promise.resolve([]),
    ]);

    const merged: SearchCatalogMatch[] = [
      ...indicators.map((r) => ({ kind: 'indicator' as const, ...r })),
      ...comparisonTables.map((r) => ({ kind: 'comparison_table' as const, ...r })),
    ];

    merged.sort((a, b) => b.score - a.score);
    const top = merged.slice(0, limit);
    const truncated = merged.length > limit;

    return { matches: top, truncated };
  } catch (err) {
    return { error: 'search_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}
