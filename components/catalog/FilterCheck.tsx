'use client';

// A single checkbox row inside a catalog filter group.

import type { ReactNode } from 'react';
import { CheckIcon } from '@/components/icons';

export interface FilterCheckProps {
  on: boolean;
  onToggle: () => void;
  label: string;
  right?: ReactNode;
}

export function FilterCheck({ on, onToggle, label, right }: FilterCheckProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full h-7 px-3 flex items-center gap-2 hover:bg-white/[0.03] text-left"
    >
      <span
        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
          on ? 'border-gold-300 bg-gold-300' : 'border-white/20'
        }`}
      >
        {on ? <CheckIcon className="w-3 h-3 text-ink-950" /> : null}
      </span>
      <span className="text-[12px] text-text-secondary flex-1">{label}</span>
      {right}
    </button>
  );
}
