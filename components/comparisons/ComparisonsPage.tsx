'use client';

// Comparisons surface: left-rail search + table viewer.
// Ported from docs/design/surfaces.jsx.

import { useEffect, useState } from 'react';

import { comparisonsWithFallback } from '@/lib/api';
import type { ComparisonTable as ComparisonTableType } from '@/lib/types';
import { SearchIcon, ColumnsIcon, DownloadIcon, FileIcon } from '@/components/icons';

import { ComparisonTable } from './ComparisonTable';

export function ComparisonsPage() {
  const [tables, setTables] = useState<ComparisonTableType[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    comparisonsWithFallback().then((rows) => {
      if (cancelled) return;
      setTables(rows);
      if (rows[0]) setSelected((prev) => prev || rows[0]!.id);
    });
    return () => { cancelled = true; };
  }, []);

  const current = tables.find((t) => t.id === selected) ?? tables[0];
  const list = tables.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));

  if (!current) {
    return <div className="px-8 pt-10 text-text-tertiary">Loading comparison tables…</div>;
  }

  return (
    <div className="px-4 md:px-8 pt-6 pb-16 md:pb-24 max-w-[1500px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Comparisons
          </div>
          <h1 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-text-primary mt-1">
            Side-by-side reference tables.
          </h1>
        </div>
      </div>

      {/* Mobile: the table picker collapses into a native select so the entire
          list isn't stacked above the selected table. Desktop keeps the
          scannable left rail. */}
      <div className="lg:hidden mb-3 glass rounded-lg p-1.5 flex items-center gap-2">
        <ColumnsIcon className="w-4 h-4 text-text-tertiary ml-2 shrink-0" />
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 h-11 bg-transparent text-text-primary text-[14px] px-1"
        >
          {tables.map((t) => {
            const cols = t.groups.reduce((n, g) => n + g.span, 0);
            return (
              <option key={t.id} value={t.id} className="bg-ink-950 text-text-primary">
                {t.name} ({t.rows.length} rows · {cols} cols)
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="hidden lg:block glass rounded-lg overflow-hidden self-start">
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

        <div className="glass rounded-lg p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="font-serif text-[20px] md:text-[22px] text-text-primary leading-tight">
                {current.name}
              </h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">
                {current.description}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-11 md:h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12.5px] md:text-[12px] flex items-center gap-1.5">
                <DownloadIcon className="w-3.5 h-3.5" /> PNG
              </button>
              <button className="h-11 md:h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12.5px] md:text-[12px] flex items-center gap-1.5">
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
