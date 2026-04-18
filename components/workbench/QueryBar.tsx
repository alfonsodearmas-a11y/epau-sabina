'use client';

// Query bar with rotating placeholder. Enter runs the query; the Manual
// toggle reveals the indicator picker. Ported from docs/design/workbench.jsx.

import { useEffect, useState } from 'react';
import { SparkleIcon, SlidersIcon } from '@/components/icons';
import { KeyCap } from '@/components/ui/KeyCap';
import { EXAMPLE_QUERIES } from './constants';

export interface QueryBarProps {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  manualMode: boolean;
  onToggleManual: () => void;
  disabled?: boolean;
}

export function QueryBar({
  value,
  onChange,
  onRun,
  manualMode,
  onToggleManual,
  disabled,
}: QueryBarProps) {
  const [ph, setPh] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPh((p) => (p + 1) % EXAMPLE_QUERIES.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const placeholder = EXAMPLE_QUERIES[ph] ?? EXAMPLE_QUERIES[0] ?? '';

  return (
    <div className="glass-strong rounded-lg p-1.5 flex items-center gap-1.5 gold-ring">
      <div className="pl-3 pr-1 text-gold-300">
        <SparkleIcon className="w-4 h-4" />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onRun();
        }}
        placeholder={`Try: ${placeholder}`}
        className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary py-2.5 px-1 font-normal"
        disabled={disabled}
      />
      <button
        onClick={onToggleManual}
        className={`h-9 px-3 rounded-md text-[12px] flex items-center gap-1.5 border transition-colors ${
          manualMode
            ? 'bg-white/[0.06] border-white/15 text-text-primary'
            : 'bg-transparent border-white/10 text-text-tertiary hover:text-text-secondary hover:border-white/20'
        }`}
        title="Toggle manual picker"
      >
        <SlidersIcon className="w-3.5 h-3.5" />
        Manual
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button
        onClick={onRun}
        disabled={disabled}
        className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        Run
        <KeyCap className="!bg-black/20 !border-black/20 !text-ink-950">↵</KeyCap>
      </button>
    </div>
  );
}
