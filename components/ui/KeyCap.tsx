// Keyboard key-cap primitive ported from docs/design/ui.jsx.

import type { ReactNode } from 'react';

export interface KeyCapProps {
  children?: ReactNode;
  className?: string;
}

export function KeyCap({ children, className = '' }: KeyCapProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-[3px] text-[10px] font-medium bg-white/[0.06] border border-white/10 text-text-secondary ${className}`}
    >
      {children}
    </kbd>
  );
}
