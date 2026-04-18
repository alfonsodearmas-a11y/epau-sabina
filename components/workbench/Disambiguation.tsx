'use client';

// Shown when a query (e.g. "CPI and FX") resolves to multiple candidates.
// Ported from docs/design/workbench.jsx.

import { SparkleIcon } from '@/components/icons';

export interface DisambiguationProps {
  onPick: (id: string) => void;
}

const OPTIONS = [
  { id: 'cpi', title: 'CPI inflation, 12-month', detail: 'Macro · monthly · latest Feb 2026' },
  {
    id: 'fx',
    title: 'Exchange rate, G$ per US$ period average',
    detail: 'External · monthly · latest Feb 2026',
  },
  {
    id: 'both',
    title: 'Both, on a dual-axis chart',
    detail: 'Combine CPI and FX pass-through',
  },
] as const;

export function Disambiguation({ onPick }: DisambiguationProps) {
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-start gap-2 mb-2">
        <div className="text-gold-300 mt-0.5">
          <SparkleIcon className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[13px] text-text-primary">
            Three possible matches. Which did you mean?
          </div>
          <div className="text-[11px] text-text-tertiary">
            Pick one to run, or refine the query.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className="text-left p-3 rounded-md bg-white/[0.02] border border-white/8 hover:border-gold-300/40 hover:bg-gold-300/5 transition-colors"
          >
            <div className="text-[12.5px] text-text-primary font-medium leading-tight">
              {o.title}
            </div>
            <div className="text-[10.5px] text-text-tertiary mt-1">{o.detail}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
