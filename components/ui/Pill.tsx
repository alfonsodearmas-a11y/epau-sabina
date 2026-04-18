// Pill primitives ported from docs/design/ui.jsx.

import type { ReactNode } from 'react';
import type { IndicatorCategory, Frequency } from '@/lib/types';

export type PillTone =
  | 'neutral'
  | 'gold'
  | 'cool'
  | 'warn'
  | 'danger'
  | 'macro'
  | 'monetary'
  | 'fiscal'
  | 'external'
  | 'debt'
  | 'social';

const tones: Record<PillTone, string> = {
  neutral: 'bg-white/5 text-text-secondary border-white/10',
  gold: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
  cool: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
  warn: 'bg-[#E0A050]/10 text-[#E0A050] border-[#E0A050]/25',
  danger: 'bg-[#E06C6C]/10 text-[#E06C6C] border-[#E06C6C]/25',
  macro: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
  monetary: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
  fiscal: 'bg-[#C8A87F]/10 text-[#C8A87F] border-[#C8A87F]/25',
  external: 'bg-[#7FC29B]/10 text-[#7FC29B] border-[#7FC29B]/25',
  debt: 'bg-[#C89878]/10 text-[#C89878] border-[#C89878]/25',
  social: 'bg-[#B099D4]/10 text-[#B099D4] border-[#B099D4]/25',
};

export interface PillProps {
  tone?: PillTone;
  children?: ReactNode;
  className?: string;
}

export function Pill({ tone = 'neutral', children, className = '' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 h-5 rounded-sm text-[10.5px] font-medium uppercase tracking-[0.08em] border ${
        tones[tone] ?? tones.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}

const categoryToTone: Record<IndicatorCategory, PillTone> = {
  Macro: 'macro',
  Monetary: 'monetary',
  Fiscal: 'fiscal',
  External: 'external',
  Debt: 'debt',
  Social: 'social',
};

export function CategoryPill({ category }: { category: IndicatorCategory }) {
  const tone = categoryToTone[category] ?? 'neutral';
  return <Pill tone={tone}>{category}</Pill>;
}

export function FreqPill({ frequency }: { frequency: Frequency }) {
  const letter =
    frequency === 'Monthly'
      ? 'M'
      : frequency === 'Quarterly'
      ? 'Q'
      : frequency === 'Annual'
      ? 'A'
      : frequency.charAt(0);
  return (
    <span className="num inline-flex items-center justify-center px-1.5 h-5 rounded-sm text-[10px] font-medium tracking-[0.08em] uppercase bg-white/[0.03] text-text-tertiary border border-white/5">
      {letter}
      <span className="ml-1 normal-case tracking-normal opacity-70">
        {frequency.toLowerCase()}
      </span>
    </span>
  );
}
