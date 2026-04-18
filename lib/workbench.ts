// Workbench glue: calls /api/query/interpret + /api/query/narrate and
// pivots the result into a DynamicSpec for DynamicResultsPanel.
'use client';

import { buildDynamicSpec } from './workbench-spec';
import { fetchObservations } from './api';
import type { Indicator } from './types';
import type { DynamicSpec } from '@/components/workbench/dynamic-spec';

// ---------- Interpret response shape ----------
interface InterpretOk {
  indicators: string[];
  date_range: { start?: string; end?: string } | null;
  chart_type: 'area' | 'line' | 'bar' | 'bar-paired' | 'dual' | 'table';
  comparison_mode?: 'actual_vs_budget' | 'administration' | 'multi_series' | null;
  commentary_requested: boolean;
  notes?: string;
}
interface InterpretDisambiguation {
  needs_clarification: true;
  candidates: Array<{ id: string; reason: string }>;
  message: string;
}
type InterpretResult = InterpretOk | InterpretDisambiguation;

interface WorkbenchOk {
  kind: 'ok';
  spec: DynamicSpec;
  indicatorIds: string[];
}
interface WorkbenchDisambiguate {
  kind: 'disambiguate';
  candidates: Array<{ id: string; reason: string; name?: string }>;
  message: string;
}
interface WorkbenchEmpty {
  kind: 'empty';
  message: string;
}

export type WorkbenchRunResult = WorkbenchOk | WorkbenchDisambiguate | WorkbenchEmpty;

// ---------- Run a query end-to-end ----------
export async function runWorkbenchQuery(
  query: string,
  allIndicators: Indicator[],
  opts?: { forceIndicatorIds?: string[]; forceChartType?: InterpretOk['chart_type'] },
): Promise<WorkbenchRunResult> {
  let indicatorIds = opts?.forceIndicatorIds ?? [];
  let chartTypeHint = opts?.forceChartType ?? 'line';
  let dateRange: InterpretOk['date_range'] = null;

  if (!indicatorIds.length) {
    const interp = await callInterpret(query);
    if (!interp) return { kind: 'empty', message: 'Interpreter call failed.' };
    if ('needs_clarification' in interp && interp.needs_clarification) {
      return {
        kind: 'disambiguate',
        candidates: interp.candidates.map((c) => ({
          ...c,
          name: allIndicators.find((i) => i.id === c.id)?.name,
        })),
        message: interp.message,
      };
    }
    const ok = interp as InterpretOk;
    indicatorIds = ok.indicators.filter(Boolean);
    chartTypeHint = ok.chart_type ?? 'line';
    dateRange = ok.date_range ?? null;
  }
  if (!indicatorIds.length) return { kind: 'empty', message: 'No indicators matched.' };

  const indicators = allIndicators.filter((i) => indicatorIds.includes(i.id));
  if (!indicators.length) return { kind: 'empty', message: 'Indicator metadata missing; re-run ingest.' };

  const observations = await fetchObservations(indicatorIds, {
    start: dateRange?.start,
    end: dateRange?.end,
  });

  // Translate interpreter's chart type to what GenericChart supports.
  const mappedChart: 'area' | 'line' | 'bar' | 'table' =
    chartTypeHint === 'bar-paired' ? 'bar' :
    chartTypeHint === 'dual' ? 'line' :
    chartTypeHint === 'area' || chartTypeHint === 'line' || chartTypeHint === 'bar' || chartTypeHint === 'table'
      ? chartTypeHint
      : 'line';

  const spec = buildDynamicSpec({
    query, indicators, observations, chartType: mappedChart,
  });
  return { kind: 'ok', spec, indicatorIds };
}

// ---------- Interpreter call, with local fallback ----------
async function callInterpret(query: string): Promise<InterpretResult | null> {
  try {
    const res = await fetch('/api/query/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; result?: InterpretResult };
    if (!body.ok || !body.result) return null;
    return body.result;
  } catch {
    return null;
  }
}

// ---------- Narrator call ----------
export async function narrate(query: string, indicatorIds: string[]): Promise<string | null> {
  try {
    const res = await fetch('/api/query/narrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, indicatorIds }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok: boolean; commentary?: string };
    return body.ok && body.commentary ? body.commentary : null;
  } catch {
    return null;
  }
}

