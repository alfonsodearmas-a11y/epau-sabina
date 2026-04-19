'use client';

// Catalog surface: filters + indicator list + slide-out detail.
// Ported from docs/design/surfaces.jsx, wired to /api/indicators.

import { useEffect, useMemo, useState } from 'react';

import { indicatorsWithFallback } from '@/lib/api';
import type { Indicator, IndicatorCategory, Frequency } from '@/lib/types';

import { FilterSidebar } from './FilterSidebar';
import { IndicatorTable } from './IndicatorTable';
import { IndicatorDetail } from './IndicatorDetail';

const CATEGORY_LIST: IndicatorCategory[] = [
  'Macro',
  'Prices',
  'Fiscal',
  'Monetary',
  'External',
  'Debt',
  'Social',
];

const FREQUENCY_LIST: Frequency[] = ['Annual', 'Quarterly', 'Monthly'];

function sourcePrefix(source: string): string {
  return source.split(',')[0] ?? source;
}

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export function CatalogPage() {
  const [q, setQ] = useState('');
  const [cats, setCats] = useState<Set<IndicatorCategory>>(new Set());
  const [freqs, setFreqs] = useState<Set<Frequency>>(new Set());
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [caveatOnly, setCaveatOnly] = useState(false);
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    indicatorsWithFallback().then((rows) => {
      if (!cancelled) { setIndicators(rows); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const sourceList = useMemo(
    () => Array.from(new Set(indicators.map((i) => sourcePrefix(i.source)))),
    [indicators]
  );

  const filtered = indicators.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cats.size && !cats.has(i.category)) return false;
    if (freqs.size && !freqs.has(i.frequency)) return false;
    if (sources.size && !sources.has(sourcePrefix(i.source))) return false;
    if (caveatOnly && !i.caveat) return false;
    return true;
  });

  const activeFilterCount = cats.size + freqs.size + sources.size + (caveatOnly ? 1 : 0);

  return (
    <div className="px-4 md:px-8 pt-6 pb-16 md:pb-24 max-w-[1500px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Indicator Catalog
          </div>
          <h1 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-text-primary mt-1">
            Every series the workbook has ingested.
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary num">
          <span>
            Showing <span className="text-text-primary">{filtered.length}</span>{' '}
            of <span className="text-text-primary">{indicators.length}</span>
            {loading ? <span className="ml-2 text-text-quat">loading…</span> : null}
          </span>
        </div>
      </div>

      <div className="lg:hidden mb-2">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          className="w-full h-11 px-4 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary flex items-center justify-between text-[13.5px]"
        >
          <span>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</span>
          <span className={`text-text-tertiary transition-transform ${filterOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {filterOpen ? (
          <div className="mt-2">
            <FilterSidebar
              categoryList={CATEGORY_LIST}
              frequencyList={FREQUENCY_LIST}
              sourceList={sourceList}
              cats={cats}
              freqs={freqs}
              sources={sources}
              caveatOnly={caveatOnly}
              onToggleCategory={(v) => setCats((s) => toggle(s, v))}
              onToggleFrequency={(v) => setFreqs((s) => toggle(s, v))}
              onToggleSource={(v) => setSources((s) => toggle(s, v))}
              onToggleCaveatOnly={() => setCaveatOnly((x) => !x)}
            />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="hidden lg:block">
          <FilterSidebar
            categoryList={CATEGORY_LIST}
            frequencyList={FREQUENCY_LIST}
            sourceList={sourceList}
            cats={cats}
            freqs={freqs}
            sources={sources}
            caveatOnly={caveatOnly}
            onToggleCategory={(v) => setCats((s) => toggle(s, v))}
            onToggleFrequency={(v) => setFreqs((s) => toggle(s, v))}
            onToggleSource={(v) => setSources((s) => toggle(s, v))}
            onToggleCaveatOnly={() => setCaveatOnly((x) => !x)}
          />
        </div>

        <IndicatorTable
          indicators={filtered}
          query={q}
          onQueryChange={setQ}
          onSelect={setSelected}
        />
      </div>

      {selected ? (
        <IndicatorDetail indicator={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
