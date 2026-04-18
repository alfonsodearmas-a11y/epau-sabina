'use client';

// Empty-state starter cards shown before any query has been run.
// Ported from docs/design/workbench.jsx.

import { KeyCap } from '@/components/ui/KeyCap';
import { EXAMPLE_QUERIES } from './constants';

export interface EmptyHintProps {
  /**
   * Optional handler invoked when one of the starter cards is clicked. The
   * prototype's buttons were non-interactive; in the Next.js port we expose
   * an optional onPick so callers can prefill the query bar.
   */
  onPick?: (q: string) => void;
}

export function EmptyHint({ onPick }: EmptyHintProps) {
  return (
    <div className="mt-6 fade-up">
      <div className="text-center mb-5">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
          Start with a question
        </div>
        <div className="font-serif text-[22px] text-text-secondary mt-1">
          What do you want to brief on?
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-[780px] mx-auto">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={onPick ? () => onPick(q) : undefined}
            className="text-left glass rounded-md px-4 py-3 hover:border-gold-300/40 group transition-colors"
          >
            <div className="text-[12.5px] text-text-secondary group-hover:text-text-primary leading-snug">
              {q}
            </div>
            <div className="text-[10.5px] text-text-quat mt-1 uppercase tracking-[0.12em] flex items-center gap-2">
              <KeyCap>↵</KeyCap> Run
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center text-[11.5px] text-text-tertiary">
        or press <KeyCap>⌘</KeyCap> <KeyCap>K</KeyCap> to search indicators by
        name.
      </div>
    </div>
  );
}
