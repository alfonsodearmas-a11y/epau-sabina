'use client';

import { assistantSegments, latestStatus, type Turn } from '@/lib/agent-client/types';
import { RenderedCard } from './cards/RenderedCard';
import { StatusLine } from './StatusLine';

export type TurnBlockProps = {
  turn: Turn;
  onAlternativeClick?: (indicator_id: string | undefined, comparison_table_id: string | undefined) => void;
};

export function TurnBlock({ turn, onAlternativeClick }: TurnBlockProps) {
  const segments = assistantSegments(turn.events);
  const status = turn.status === 'streaming' ? latestStatus(turn.events) : null;
  const hasAssistant = segments.length > 0 || status !== null || turn.status === 'error';

  return (
    <div className="space-y-3 fade-up">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md px-3 py-2 bg-white/[0.04] border border-white/5 text-[13px] text-text-primary/95">
          {turn.userText}
        </div>
      </div>

      {hasAssistant ? (
        <div className="space-y-3 pr-1">
          {segments.map((seg, i) =>
            seg.kind === 'text' ? (
              <p
                key={`t-${i}`}
                className="text-[13px] leading-relaxed text-text-primary/95 whitespace-pre-wrap"
              >
                {renderInlineMarkdown(seg.text)}
              </p>
            ) : (
              <RenderedCard
                key={`r-${i}-${seg.event.render_id}`}
                event={seg.event}
                onAlternativeClick={onAlternativeClick}
              />
            ),
          )}

          {status ? <StatusLine message={status} /> : null}

          {turn.status === 'error' ? (
            <div className="text-[12px] text-[#E06C6C]">
              {turn.errorDetail ?? turn.errorCode ?? 'Something went wrong.'}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Narrow Markdown-lite: **bold** → <strong>. Nothing else — Sabina's
// assistant rarely emits more; keep the surface minimal so we can audit it.
function renderInlineMarkdown(text: string): Array<string | JSX.Element> {
  const parts: Array<string | JSX.Element> = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={`b-${key++}`} className="text-text-primary font-semibold">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
