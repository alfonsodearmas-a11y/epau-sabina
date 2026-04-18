// Generic titled side panel used in the workbench results view.

import type { ReactNode } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';

export interface SidePanelProps {
  title: string;
  count: number;
  children?: ReactNode;
}

export function SidePanel({ title, count, children }: SidePanelProps) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <SectionLabel right={<span className="num text-text-quat">{count}</span>}>
        {title}
      </SectionLabel>
      {children}
    </div>
  );
}
