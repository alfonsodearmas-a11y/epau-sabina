'use client';

import type { AgentEvent } from '@/lib/agent/sse';
import { ChartCard } from './ChartCard';
import { TableCard } from './TableCard';
import { CommentaryCard } from './CommentaryCard';
import { FlagUnavailableCard } from './FlagUnavailableCard';

export type RenderEvent = Extract<AgentEvent, { type: 'render' }>;

export function RenderedCard({
  event,
  onAlternativeClick,
}: {
  event: RenderEvent;
  onAlternativeClick?: (indicator_id: string | undefined, comparison_table_id: string | undefined) => void;
}) {
  const payload = event.payload as never;

  switch (event.kind) {
    case 'chart':     return <ChartCard payload={payload} />;
    case 'table':     return <TableCard payload={payload} />;
    case 'commentary':return <CommentaryCard payload={payload} />;
    case 'flag_unavailable':
      return <FlagUnavailableCard payload={payload} onAlternativeClick={onAlternativeClick} />;
    default:
      return null;
  }
}
