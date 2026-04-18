// Small uppercase section label ported from docs/design/ui.jsx.

import type { ReactNode } from 'react';

export interface SectionLabelProps {
  children?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function SectionLabel({
  children,
  right,
  className = '',
}: SectionLabelProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-tertiary ${className}`}
    >
      <span>{children}</span>
      {right}
    </div>
  );
}
