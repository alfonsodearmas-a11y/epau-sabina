'use client';

// Top-level Workbench shell managing four states: empty / running /
// ambiguous / results. Ported from docs/design/workbench.jsx — the dev-only
// "Prototype state demo" footer is intentionally omitted. Now backed by live
// /api/query/interpret + /api/observations via runWorkbenchQuery.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DotIcon } from '@/components/icons';
import { indicatorsWithFallback } from '@/lib/api';
import type { Indicator } from '@/lib/types';
import { runWorkbenchQuery, type WorkbenchRunResult } from '@/lib/workbench';

import { QueryBar } from './QueryBar';
import { ManualPicker } from './ManualPicker';
import { Disambiguation } from './Disambiguation';
import { RunningState } from './RunningState';
import { DynamicResultsPanel } from './DynamicResultsPanel';
import { EmptyHint } from './EmptyHint';
import type { DynamicSpec } from './dynamic-spec';

export type WorkbenchState = 'empty' | 'running' | 'ambiguous' | 'results' | 'error';

export interface WorkbenchProps {
  initialState?: WorkbenchState;
  initialQuery?: string;
}

export function Workbench({ initialState = 'empty', initialQuery = '' }: WorkbenchProps) {
  const router = useRouter();
  const [state, setState] = useState<WorkbenchState>(initialState);
  const [query, setQuery] = useState(initialQuery);
  const [manualMode, setManualMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [spec, setSpec] = useState<DynamicSpec | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [indicatorIds, setIndicatorIds] = useState<string[]>([]);
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id: string; name?: string; reason: string }>>([]);
  const runCount = useRef(0);

  // Load catalog once so manual-picker and ids can resolve by name.
  useEffect(() => {
    let cancelled = false;
    indicatorsWithFallback().then((rows) => { if (!cancelled) setAllIndicators(rows); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setState(initialState);
    setQuery(initialQuery);
    if (initialState === 'results' && initialQuery && allIndicators.length) {
      void doRun(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState, initialQuery, allIndicators.length]);

  async function doRun(q: string, forceIds?: string[]) {
    const seq = ++runCount.current;
    setState('running');
    setSpec(null);
    setCommentary(null);
    setErrorMsg(null);
    setCandidates([]);
    const result: WorkbenchRunResult = await runWorkbenchQuery(q, allIndicators, forceIds ? { forceIndicatorIds: forceIds } : undefined);
    if (seq !== runCount.current) return; // stale
    if (result.kind === 'disambiguate') {
      setCandidates(result.candidates);
      setErrorMsg(result.message);
      setState('ambiguous');
      return;
    }
    if (result.kind === 'empty') {
      setErrorMsg(result.message);
      setState('error');
      return;
    }
    setSpec(result.spec);
    setIndicatorIds(result.indicatorIds);
    setState('results');
  }

  const run = () => { if (query.trim()) void doRun(query); };
  const pickCandidate = (id: string) => { void doRun(query, [id]); };

  const summary = useMemo(() => ({
    indicatorCount: allIndicators.length,
    observationCount: allIndicators.length ? 'catalog loaded' : 'loading catalog…',
  }), [allIndicators.length]);

  const manualRun = () => { if (selected.length) void doRun(query || 'manual selection', selected); };

  return (
    <div className="px-4 md:px-8 pt-6 pb-16 md:pb-24 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Query Workbench
          </div>
          <h1 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-text-primary mt-1">
            Ask the workbook a question.
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <DotIcon className="w-2 h-2 text-[#7FC29B]" />
          <span>
            <span className="num">{summary.indicatorCount} indicators</span> · {summary.observationCount}
          </span>
        </div>
      </div>

      <QueryBar
        value={query}
        onChange={setQuery}
        onRun={run}
        manualMode={manualMode}
        onToggleManual={() => setManualMode((x) => !x)}
        disabled={state === 'running'}
      />
      {manualMode ? (
        <ManualPicker
          selected={selected}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
          onRun={manualRun}
        />
      ) : null}

      {state === 'empty' ? (
        <EmptyHint onPick={(q) => { setQuery(q); void doRun(q); }} />
      ) : null}
      {state === 'ambiguous' ? (
        <Disambiguation candidates={candidates} message={errorMsg ?? ''} onPick={pickCandidate} />
      ) : null}
      {state === 'running' ? <RunningState /> : null}
      {state === 'error' ? (
        <div className="glass rounded-lg p-5 mt-3 border-l-2 border-l-[#E06C6C]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[13px] text-text-secondary">{errorMsg ?? 'Query failed.'}</div>
          <button onClick={run} className="h-11 md:h-8 px-4 md:px-3 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary text-[13px] md:text-[12px] self-start">Retry</button>
        </div>
      ) : null}
      {state === 'results' && spec ? (
        <DynamicResultsPanel
          spec={spec}
          query={query}
          commentary={commentary}
          setCommentary={setCommentary}
          onExportPng={() => exportPng(spec)}
          onExportDocx={() => exportDocx(spec, commentary)}
          onSaveView={() => saveView(spec, query, indicatorIds, router)}
        />
      ) : null}
    </div>
  );
}

async function exportPng(spec: DynamicSpec) {
  // Grab the chart SVG from the DOM and POST it to the server as a PNG request.
  const svg = document.querySelector('.recharts-surface');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  // Wrap in a document with explicit width/height for the server renderer.
  const wrapped = `<?xml version="1.0" standalone="no"?>\n${xml}`;
  const res = await fetch('/api/export/png', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ svg: wrapped, filename: `${slug(spec.title)}.png` }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  triggerDownload(blob, `${slug(spec.title)}.png`);
}

async function exportDocx(spec: DynamicSpec, commentary: string | null) {
  const res = await fetch('/api/export/docx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: spec.title,
      subtitle: spec.subtitle,
      caveat: spec.caveats.map((c) => c.text).join(' • ') || null,
      commentary,
      series: spec.indicators.map((ind) => ({
        name: ind.name,
        unit: ind.unit,
        source: ind.source,
        rows: spec.data.map((row) => ({
          period: String(row[spec.xKey] ?? ''),
          value: typeof row[ind.id] === 'number' ? (row[ind.id] as number) : null,
        })),
      })),
    }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  triggerDownload(blob, `${slug(spec.title)}.docx`);
}

async function saveView(spec: DynamicSpec, query: string, indicatorIds: string[], router: ReturnType<typeof useRouter>) {
  const name = window.prompt('Name this view:', spec.title);
  if (!name) return;
  await fetch('/api/saved', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, queryText: query, indicatorIds, config: { chartType: spec.chartType } }),
  });
  router.refresh();
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
