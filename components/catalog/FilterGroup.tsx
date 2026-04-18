// Labelled group of filter checkboxes.

import type { ReactNode } from 'react';

export interface FilterGroupProps {
  label: string;
  children?: ReactNode;
}

export function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="px-1 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary px-3 pb-1.5">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
