'use client';

// Comparisons surface: left-rail search + table viewer.
// Ported from docs/design/surfaces.jsx.

import { useState } from 'react';

import { COMPARISON_TABLES } from '@/lib/mock';
import { SearchIcon, ColumnsIcon, DownloadIcon, FileIcon } from '@/components/icons';

import { ComparisonTable } from './ComparisonTable';

export function ComparisonsPage() {
  const firstId = COMPARISON_TABLES[0]?.id ?? '';
  const [selected, setSelected] = useState<string>(firstId);
  const [q, setQ] = useState('');

  const current =
    COMPARISON_TABLES.find((t) => t.id === selected) ?? COMPARISON_TABLES[0];
  const list = COMPARISON_TABLES.filter(
    (t) => !q || t.name.toLowerCase().includes(q.toLowerCase())
  );

  if (!current) return null;

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Comparisons
          </div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">
            Side-by-side reference tables.
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="glass rounded-lg overflow-hidden self-start">
          <div className="p-1.5 flex items-center gap-2 border-b border-white/5">
            <SearchIcon className="w-4 h-4 text-text-tertiary ml-2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tables"
              className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1"
            />
          </div>
          {list.map((t) => {
            const cols = t.groups.reduce((n, g) => n + g.span, 0);
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 border-t border-white/5 first:border-t-0 flex flex-col gap-0.5 transition-colors ${
                  selected === t.id
                    ? 'bg-gold-300/5 border-l-2 border-l-gold-300'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ColumnsIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary">
                    {t.name}
                  </span>
                </div>
                <span className="text-[10.5px] text-text-tertiary pl-5 num">
                  {t.rows.length} rows · {cols} cols
                </span>
              </button>
            );
          })}
        </div>

        <div className="glass rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-serif text-[22px] text-text-primary leading-tight">
                {current.name}
              </h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">
                {current.description}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <DownloadIcon className="w-3.5 h-3.5" /> PNG
              </button>
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <FileIcon className="w-3.5 h-3.5" /> Word
              </button>
            </div>
          </div>

          <ComparisonTable table={current} />
        </div>
      </div>
    </div>
  );
}
