import { IndicatorCategory, Frequency, Scenario } from '@prisma/client';

export { IndicatorCategory, Frequency, Scenario };

export const INDICATOR_CATEGORIES = Object.values(IndicatorCategory) as IndicatorCategory[];
export const SCENARIOS = Object.values(Scenario) as Scenario[];
export const FREQUENCIES = Object.values(Frequency) as Frequency[];

export type CatalogKind = 'indicator' | 'comparison_table';
export const CATALOG_KINDS: CatalogKind[] = ['indicator', 'comparison_table'];

export type SearchTool = 'search_catalog' | 'list_comparison_tables';
export const SEARCH_TOOLS: SearchTool[] = ['search_catalog', 'list_comparison_tables'];

export type Point = { periodDate: string; value: number | null };

export type ToolError<Code extends string = string> = {
  error: Code;
  [k: string]: unknown;
};

export function isToolError(x: unknown): x is ToolError {
  return !!x && typeof x === 'object' && typeof (x as { error?: unknown }).error === 'string';
}

export function newRenderId(): string {
  return `rnd_${globalThis.crypto.randomUUID()}`;
}
