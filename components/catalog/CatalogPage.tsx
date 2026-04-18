'use client';

// Catalog surface: filters + indicator list + slide-out detail.
// Ported from docs/design/surfaces.jsx.

import { useMemo, useState } from 'react';

import { INDICATORS } from '@/lib/mock';
import type { Indicator, IndicatorCategory, Frequency } from '@/lib/types';

import { FilterSidebar } from './FilterSidebar';
import { IndicatorTable } from './IndicatorTable';
import { IndicatorDetail } from './IndicatorDetail';

const CATEGORY_LIST: IndicatorCategory[] = [
  'Macro',
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

  const sourceList = useMemo(
    () => Array.from(new Set(INDICATORS.map((i) => sourcePrefix(i.source)))),
    []
  );

  const filtered = INDICATORS.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cats.size && !cats.has(i.category)) return false;
    if (freqs.size && !freqs.has(i.frequency)) return false;
    if (sources.size && !sources.has(sourcePrefix(i.source))) return false;
    if (caveatOnly && !i.caveat) return false;
    return true;
  });

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Indicator Catalog
          </div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">
            Every series the workbook has ingested.
          </h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2 num">
          <span>
            Showing <span className="text-text-primary">{filtered.length}</span>{' '}
            of <span className="text-text-primary">{INDICATORS.length}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
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
