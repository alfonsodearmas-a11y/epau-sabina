// flag_unavailable — the anti-hallucination guardrail.
// Strictly rejects calls with an empty `searched` array; the agent must have
// actually searched before declaring data unavailable.

import { newRenderId, type ToolError } from '../types';

type MissingItem = {
  requested: string;
  closest_available: Array<{
    indicator_id?: string;
    comparison_table_id?: string;
    why: string;
  }>;
};

type SearchedItem = {
  tool: 'search_catalog' | 'list_comparison_tables';
  query: string;
  top_hits: string[];
};

export type FlagUnavailableInput = {
  reason: string;
  missing: MissingItem[];
  searched: SearchedItem[];
  suggested_alternatives?: string[];
};

export type FlagUnavailableResult =
  | { render_id: string; acknowledged: true }
  | ToolError<
      | 'flag_unavailable_without_search'
      | 'flag_unavailable_empty'
      | 'flag_unavailable_invalid'
    >;

export function flagUnavailable(input: FlagUnavailableInput): FlagUnavailableResult {
  const reason = (input.reason ?? '').trim();
  if (!reason) {
    return { error: 'flag_unavailable_invalid', detail: 'reason is required' };
  }

  if (!Array.isArray(input.missing) || input.missing.length === 0) {
    return { error: 'flag_unavailable_empty', detail: 'missing[] must be non-empty' };
  }
  for (const m of input.missing) {
    if (!m || typeof m.requested !== 'string' || !m.requested.trim()) {
      return { error: 'flag_unavailable_invalid', detail: 'each missing item must have a non-empty requested' };
    }
    if (!Array.isArray(m.closest_available)) {
      return { error: 'flag_unavailable_invalid', detail: 'closest_available must be an array (empty is allowed)' };
    }
  }

  if (!Array.isArray(input.searched) || input.searched.length === 0) {
    return {
      error: 'flag_unavailable_without_search',
      hint: 'Call search_catalog or list_comparison_tables before flagging unavailable.',
    };
  }
  for (const s of input.searched) {
    if (!s || !['search_catalog', 'list_comparison_tables'].includes(s.tool)) {
      return { error: 'flag_unavailable_invalid', detail: 'searched.tool must be search_catalog or list_comparison_tables' };
    }
    if (typeof s.query !== 'string' || !s.query.trim()) {
      return { error: 'flag_unavailable_invalid', detail: 'searched.query must be a non-empty string' };
    }
    if (!Array.isArray(s.top_hits)) {
      return { error: 'flag_unavailable_invalid', detail: 'searched.top_hits must be an array (empty is allowed)' };
    }
  }

  return { render_id: newRenderId(), acknowledged: true };
}
