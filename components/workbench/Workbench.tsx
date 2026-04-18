'use client';

// Top-level Workbench shell managing four states: empty / running /
// ambiguous / results. Ported from docs/design/workbench.jsx — the dev-only
// "Prototype state demo" footer is intentionally omitted.

import { useEffect, useState } from 'react';

import { DotIcon } from '@/components/icons';

import { interpretQuery } from '@/lib/workbench';

import { QueryBar } from './QueryBar';
import { ManualPicker } from './ManualPicker';
import { Disambiguation } from './Disambiguation';
import { RunningState } from './RunningState';
import { ResultsPanel } from './ResultsPanel';
import { EmptyHint } from './EmptyHint';
import type { ChartType, ViewKind, ViewState } from './spec';

export type WorkbenchState = 'empty' | 'running' | 'ambiguous' | 'results';

export interface WorkbenchProps {
  initialState?: WorkbenchState;
  initialQuery?: string;
}

function resolveQuery(q: string): ViewKind | 'ambiguous' {
  const t = q.toLowerCase();
  if (t.includes('credit') || t.includes('psc')) return 'psc';
  if (t.includes('nrf')) return 'nrf';
  if (t.includes('gdp') || t.includes('growth')) return 'gdp';
  if (t.includes('npl') || t.includes('non-performing')) return 'npl';
  if (t.includes('cpi') || t.includes('inflation') || t.includes('exchange'))
    return 'ambiguous';
  return 'psc';
}

function chartForKind(kind: ViewKind): ChartType {
  if (kind === 'nrf') return 'bar';
  if (kind === 'gdp') return 'line';
  return 'area';
}

export function Workbench({
  initialState = 'empty',
  initialQuery = '',
}: WorkbenchProps) {
  const [state, setState] = useState<WorkbenchState>(initialState);
  const [query, setQuery] = useState(initialQuery);
  const [manualMode, setManualMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([
    'psc_business',
    'psc_mortgages',
    'psc_households',
  ]);
  const [view, setView] = useState<ViewState>({ kind: 'psc', chart: 'area' });
  const [commentary, setCommentary] = useState<string | null>(null);

  // Jump on prop change (used when navigating from saved views / palette)
  useEffect(() => {
    setState(initialState);
    setQuery(initialQuery);
    if (initialState === 'results') {
      const kind = resolveQuery(initialQuery);
      if (kind !== 'ambiguous') {
        setView({ kind, chart: chartForKind(kind) });
      }
      setCommentary(null);
    }
  }, [initialState, initialQuery]);

  const run = async () => {
    if (!query.trim()) return;
    setState('running');
    setCommentary(null);
    // Call the real interpreter; fall back to the canned router if it fails.
    const { kind, disambiguate } = await interpretQuery(query, resolveQuery);
    if (disambiguate) {
      setState('ambiguous');
      return;
    }
    setView({ kind, chart: chartForKind(kind) });
    setState('results');
  };

  const pickDisambiguation = (id: string) => {
    setState('running');
    setCommentary(null);
    setTimeout(() => {
      const kind: ViewKind =
        id === 'both' ? 'gdp' : id === 'fx' ? 'gdp' : 'npl';
      setView({ kind, chart: 'line' });
      setState('results');
    }, 1000);
  };

  const toggleIndicator = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Query Workbench
          </div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">
            Ask the workbook a question.
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2">
          <DotIcon className="w-2 h-2 text-[#7FC29B]" />
          <span>
            Catalog up to date ·{' '}
            <span className="num">1,384 indicators · 94,726 observations</span>
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
        <ManualPicker selected={selected} onToggle={toggleIndicator} />
      ) : null}

      {/* State-specific body */}
      {state === 'empty' ? (
        <EmptyHint
          onPick={(q) => {
            setQuery(q);
          }}
        />
      ) : null}
      {state === 'ambiguous' ? (
        <Disambiguation onPick={pickDisambiguation} />
      ) : null}
      {state === 'running' ? <RunningState /> : null}
      {state === 'results' ? (
        <ResultsPanel
          view={view}
          commentary={commentary}
          setCommentary={setCommentary}
        />
      ) : null}
    </div>
  );
}
