'use client';

import { SparkleIcon } from '@/components/icons';

const SUGGESTIONS = [
  'What was inflation in 2023?',
  'Compare GDP growth to inflation since 2018.',
  'Draft a 200-word note on NRF inflows.',
  'Biggest shifts in private sector credit since 2015.',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="px-5 pt-10 text-center">
      <div className="inline-flex w-10 h-10 rounded-full items-center justify-center border border-gold-300/30 bg-gold-300/5 text-gold-300 mb-3">
        <SparkleIcon className="w-4 h-4" />
      </div>
      <h3 className="font-serif text-[18px] text-text-primary leading-tight">
        Ask about any indicator, comparison, or trend.
      </h3>
      <p className="text-[12px] text-text-tertiary mt-2 leading-relaxed">
        Every number is fetched from the workbook and cited with its source.
        When data is not in the store, the assistant says so plainly.
      </p>
      <div className="mt-6 space-y-2 text-left">
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">Try</div>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="w-full text-left px-3 py-2 rounded-md text-[12.5px] text-text-secondary hover:text-text-primary border border-white/5 hover:border-gold-300/30 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
