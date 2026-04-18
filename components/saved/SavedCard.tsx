'use client';

// Card rendered in the Saved Views grid. Clicking the card opens the
// associated query in the workbench via the App Router.

import { useRouter } from 'next/navigation';
import { ChevIcon } from '@/components/icons';
import type { SavedView } from '@/lib/types';

import { ThumbChart } from './ThumbChart';

export function SavedCard({ view }: { view: SavedView }) {
  const router = useRouter();
  const open = () => {
    router.push(`/workbench?q=${encodeURIComponent(view.query)}`);
  };

  return (
    <div
      className="glass rounded-lg p-4 flex flex-col gap-3 hover:border-gold-300/30 transition-colors relative group cursor-pointer"
      onClick={open}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[18px] leading-[1.2] text-text-primary flex-1">
          {view.name}
        </h3>
        <button
          onClick={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-md border border-white/8 bg-white/[0.02] text-text-tertiary hover:text-text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-[11px] text-text-tertiary font-mono leading-snug">
        {view.query}
      </div>
      <ThumbChart kind={view.chart} />
      <div className="flex items-center flex-wrap gap-1.5">
        {view.indicators.map((i) => (
          <span
            key={i}
            className="text-[10.5px] px-1.5 h-5 rounded-sm bg-white/[0.04] border border-white/8 text-text-secondary flex items-center"
          >
            {i}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-auto">
        <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.12em] num">
          Last run {view.last_run}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10.5px]">
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-text-tertiary hover:text-text-primary px-1.5"
          >
            Rename
          </button>
          <span className="text-text-quat">·</span>
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-text-tertiary hover:text-[#E06C6C] px-1.5"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
