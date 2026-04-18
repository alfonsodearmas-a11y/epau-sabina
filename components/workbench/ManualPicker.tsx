'use client';

// Manual indicator picker. Loads indicators from the live catalog with a
// mock fallback; adds a search box and a Run button for the manual path.
import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, SearchIcon } from '@/components/icons';
import { indicatorsWithFallback } from '@/lib/api';
import type { Indicator } from '@/lib/types';

export interface ManualPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
  onRun?: () => void;
}

export function ManualPicker({ selected, onToggle, onRun }: ManualPickerProps) {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    indicatorsWithFallback().then((rows) => { if (!cancelled) setIndicators(rows); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q) return indicators;
    const t = q.toLowerCase();
    return indicators.filter((i) => i.name.toLowerCase().includes(t) || i.id.includes(t));
  }, [indicators, q]);

  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-center justify-between mb-2 gap-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
          Manual: pick indicators ({selected.length} selected)
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary bg-white/[0.02] border border-white/8 rounded px-2 h-7">
            <SearchIcon className="w-3 h-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter"
              className="bg-transparent text-[11.5px] w-28 text-text-primary placeholder:text-text-quat" />
          </div>
          <button disabled={!selected.length || !onRun} onClick={onRun}
            className="h-7 px-3 rounded bg-gold-300 text-ink-950 text-[11.5px] font-semibold disabled:opacity-40 disabled:bg-white/10 disabled:text-text-tertiary">
            Run selection
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto scroll-thin pr-1">
        {filtered.map((ind) => {
          const on = selected.includes(ind.id);
          const sourcePrefix = ind.source.split(',')[0] ?? ind.source;
          return (
            <button key={ind.id} onClick={() => onToggle(ind.id)}
              className={`text-left px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-2 ${on ? 'bg-gold-300/10 border-gold-300/40 text-text-primary' : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-text-secondary'}`}>
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-gold-300 bg-gold-300' : 'border-white/20'}`}>
                {on ? <CheckIcon className="w-3 h-3 text-ink-950" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] leading-tight truncate">{ind.name}</span>
                <span className="block text-[10px] text-text-tertiary">{sourcePrefix}</span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <div className="col-span-4 text-center text-text-tertiary text-[12px] py-6">No indicators match.</div>
        ) : null}
      </div>
    </div>
  );
}
