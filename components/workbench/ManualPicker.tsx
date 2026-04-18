'use client';

// Manual indicator picker shown when the user toggles "Manual" in the query bar.
// Ported from docs/design/workbench.jsx.

import { INDICATORS } from '@/lib/mock';
import { CheckIcon } from '@/components/icons';

export interface ManualPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function ManualPicker({ selected, onToggle }: ManualPickerProps) {
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
          Manual: pick indicators
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <span>Date range</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">
              Jan 2015
            </span>
            <span>to</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">
              Feb 2026
            </span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span>Chart</span>
            <span className="text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">
              Stacked area
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto scroll-thin pr-1">
        {INDICATORS.map((ind) => {
          const on = selected.includes(ind.id);
          const sourcePrefix = ind.source.split(',')[0] ?? ind.source;
          return (
            <button
              key={ind.id}
              onClick={() => onToggle(ind.id)}
              className={`text-left px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-2 ${
                on
                  ? 'bg-gold-300/10 border-gold-300/40 text-text-primary'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-text-secondary'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                  on ? 'border-gold-300 bg-gold-300' : 'border-white/20'
                }`}
              >
                {on ? <CheckIcon className="w-3 h-3 text-ink-950" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] leading-tight truncate">
                  {ind.name}
                </span>
                <span className="block text-[10px] text-text-tertiary">
                  {sourcePrefix}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
