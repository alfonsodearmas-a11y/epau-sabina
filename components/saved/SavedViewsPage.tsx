// Saved Views surface — grid of saved query cards.
// Ported from docs/design/surfaces.jsx.

import { SAVED_VIEWS } from '@/lib/mock';
import { RefreshIcon } from '@/components/icons';

import { SavedCard } from './SavedCard';

export function SavedViewsPage() {
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Saved Views
          </div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">
            Queries you re-run.
          </h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[12.5px] flex items-center gap-1.5 transition-colors">
          <RefreshIcon className="w-3.5 h-3.5" /> Re-run all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SAVED_VIEWS.map((v) => (
          <SavedCard key={v.id} view={v} />
        ))}
      </div>
    </div>
  );
}
