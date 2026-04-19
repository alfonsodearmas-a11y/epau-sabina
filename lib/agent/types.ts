// Shared types for agent tools. Kept framework-free so tests don't drag Prisma in.

export type IndicatorCategory =
  | 'real_economy'
  | 'external'
  | 'prices'
  | 'monetary'
  | 'fiscal'
  | 'debt'
  | 'social';

export const INDICATOR_CATEGORIES: IndicatorCategory[] = [
  'real_economy',
  'external',
  'prices',
  'monetary',
  'fiscal',
  'debt',
  'social',
];

export type Frequency = 'annual' | 'quarterly' | 'monthly';
export type Scenario = 'actual' | 'budget' | 'revised' | 'projection';
export type CatalogKind = 'indicator' | 'comparison_table';

export type Point = { periodDate: string; value: number | null };

export type ToolError<Code extends string = string> = {
  error: Code;
  [k: string]: unknown;
};

export function isToolError(x: unknown): x is ToolError {
  return !!x && typeof x === 'object' && typeof (x as { error?: unknown }).error === 'string';
}

export function newRenderId(): string {
  // Node 20+ has global crypto.
  return `rnd_${globalThis.crypto.randomUUID()}`;
}
