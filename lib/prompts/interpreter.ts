// Interpreter prompt — turns a natural-language analyst query into a structured
// workbench action. Receives the full indicator catalog so it can't hallucinate IDs.
//
// Versioned via INTERPRETER_PROMPT_VERSION. Bump on any wording change.
import type Anthropic from '@anthropic-ai/sdk';

export const INTERPRETER_PROMPT_VERSION = '2026.04.18-1';

export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  frequency: string;
  unit: string;
  caveat?: string | null;
}

export interface InterpretedQuery {
  needs_clarification?: false;
  indicators: string[];             // indicator ids, strict whitelist
  date_range: { start?: string; end?: string } | null;
  chart_type: 'area' | 'line' | 'bar' | 'bar-paired' | 'dual' | 'table';
  comparison_mode?: 'actual_vs_budget' | 'administration' | 'multi_series' | null;
  commentary_requested: boolean;
  notes?: string;
}

export interface Disambiguation {
  needs_clarification: true;
  candidates: Array<{ id: string; reason: string }>;
  message: string;
}

export function buildInterpreterMessages(
  query: string,
  catalog: CatalogEntry[],
): { system: string; messages: Anthropic.Messages.MessageParam[] } {
  const system = [
    'You are the EPAU Analyst Workbench query interpreter.',
    '',
    'Your job: convert a short natural-language question from a government economist',
    'into a strict JSON plan for fetching indicators and rendering a chart.',
    '',
    'Rules',
    '- Return ONE JSON object (no prose, no code fences). Match the schema below exactly.',
    '- Use ONLY indicator ids from the catalog. Never invent an id. If no indicator is',
    '  a reasonable match, return the disambiguation variant with 2-4 candidates.',
    '- Prefer the most specific indicator for the user\'s question. If several are',
    '  plausibly right and the user did not narrow it, return disambiguation.',
    '- chart_type defaults: area for monetary or stock series, line for rates and',
    '  growth, bar-paired for actual-vs-budget, dual for two series with different units,',
    '  table when the user asks to see numbers.',
    '- date_range: parse "since 2015", "2020 to present", "past ten years", etc. Omit',
    '  start/end if the user did not specify (caller defaults to full history).',
    '- commentary_requested: true if the user asked to draft briefing text, otherwise false.',
    '- If the question is about comparisons (pre/post administration, actuals vs budget,',
    '  actual vs projection), set comparison_mode appropriately.',
    '',
    'Response schema',
    '{ "indicators": string[], "date_range": {"start"?: "YYYY-MM-DD", "end"?: "YYYY-MM-DD"} | null,',
    '  "chart_type": "area"|"line"|"bar"|"bar-paired"|"dual"|"table",',
    '  "comparison_mode": "actual_vs_budget"|"administration"|"multi_series"|null,',
    '  "commentary_requested": boolean, "notes"?: string }',
    'or',
    '{ "needs_clarification": true, "candidates": [{"id": "...", "reason": "..."}, ...], "message": "..." }',
  ].join('\n');

  const catalogJson = JSON.stringify(catalog.map((c) => ({
    id: c.id, name: c.name, category: c.category, frequency: c.frequency, unit: c.unit,
    ...(c.caveat ? { caveat: c.caveat } : {}),
  })));

  return {
    system,
    messages: [
      { role: 'user', content: `Catalog (read-only):\n${catalogJson}\n\nQuery: ${query.trim()}` },
    ],
  };
}

export function parseInterpretation(raw: string, catalogIds: Set<string>): InterpretedQuery | Disambiguation {
  let obj: unknown;
  try { obj = JSON.parse(stripFences(raw)); } catch { throw new Error('Interpreter returned invalid JSON'); }
  if (!obj || typeof obj !== 'object') throw new Error('Interpreter returned non-object');
  const o = obj as Record<string, unknown>;
  if (o['needs_clarification'] === true) {
    return {
      needs_clarification: true,
      candidates: Array.isArray(o['candidates']) ? (o['candidates'] as Array<Record<string, unknown>>).map((c) => ({
        id: String(c['id'] ?? ''), reason: String(c['reason'] ?? ''),
      })).filter((c) => catalogIds.has(c.id)) : [],
      message: String(o['message'] ?? 'Which indicator did you mean?'),
    };
  }
  const indicators = Array.isArray(o['indicators']) ? (o['indicators'] as unknown[]).map(String).filter((id) => catalogIds.has(id)) : [];
  if (!indicators.length) {
    return {
      needs_clarification: true, candidates: [],
      message: 'No indicators matched. Try rephrasing or searching the catalog.',
    };
  }
  const chart = String(o['chart_type'] ?? 'line');
  const validCharts = new Set(['area', 'line', 'bar', 'bar-paired', 'dual', 'table']);
  return {
    indicators,
    date_range: (o['date_range'] as InterpretedQuery['date_range']) ?? null,
    chart_type: (validCharts.has(chart) ? chart : 'line') as InterpretedQuery['chart_type'],
    comparison_mode: (o['comparison_mode'] as InterpretedQuery['comparison_mode']) ?? null,
    commentary_requested: Boolean(o['commentary_requested']),
    notes: typeof o['notes'] === 'string' ? (o['notes'] as string) : undefined,
  };
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}
