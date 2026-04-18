'use client';

// Recharts tooltip renderer ported from docs/design/workbench.jsx.

import type { TooltipProps } from 'recharts';

export interface CustomTooltipProps extends TooltipProps<number, string> {
  unit?: string;
}

export function CustomTooltip(props: CustomTooltipProps) {
  const { active, payload, label, unit } = props;
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-strong rounded-md px-3 py-2 text-[11px] shadow-xl">
      <div className="font-medium text-text-primary mb-1 font-mono">{label}</div>
      {payload.map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-3 justify-between min-w-[180px]"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-[1px]"
              style={{ background: p.color }}
            />
            <span className="text-text-secondary">{p.name}</span>
          </div>
          <span className="num text-text-primary font-medium">
            {p.value === null || p.value === undefined
              ? '—'
              : typeof p.value === 'number'
              ? p.value.toLocaleString('en-US', { maximumFractionDigits: 1 })
              : String(p.value)}
          </span>
        </div>
      ))}
      {unit ? (
        <div className="mt-1 pt-1 border-t border-white/5 text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
          {unit}
        </div>
      ) : null}
    </div>
  );
}
