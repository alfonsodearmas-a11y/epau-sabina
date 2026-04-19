import type { AgentEvent } from '@/lib/agent/sse';

export type ChatSurface = 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin';

export type ChatSurfaceContext = {
  indicator_id?: string;
  saved_view_id?: string;
  comparison_table_id?: string;
  active_chart?: { indicator_ids: string[]; date_range?: { start: string; end: string } };
};

export type TurnStatus = 'streaming' | 'complete' | 'error';

export type Turn = {
  id: string;
  userText: string;
  surface: ChatSurface;
  sessionId?: string;
  turnIndex?: number;
  events: AgentEvent[];
  status: TurnStatus;
  stopReason?: string;
  steps?: number;
  errorCode?: string;
  errorDetail?: string;
};

export function newTurn(userText: string, surface: ChatSurface): Turn {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    userText,
    surface,
    events: [],
    status: 'streaming',
  };
}

export type AssistantSegment =
  | { kind: 'text'; text: string }
  | { kind: 'render'; event: Extract<AgentEvent, { type: 'render' }> };

/**
 * Fold an assistant's ordered events into text runs and render cards.
 * Consecutive text_delta events merge into one `text` segment; a `render` event
 * breaks the run and starts a new text segment after it.
 *
 * Audit retries: when an `audit` event with result === 'failed' arrives, we
 * reset the assistant timeline entirely — discarding both accumulated text
 * and any pre-retry renders. The retry produces its own set of renders and
 * prose, and showing both the first attempt's work and the retry's output
 * confuses the reader (e.g. two charts on the same question).
 */
export function assistantSegments(events: AgentEvent[]): AssistantSegment[] {
  let out: AssistantSegment[] = [];
  let buf = '';
  const flush = () => {
    if (buf.length) {
      out.push({ kind: 'text', text: buf });
      buf = '';
    }
  };
  for (const e of events) {
    if (e.type === 'text_delta') buf += e.text;
    else if (e.type === 'render') {
      flush();
      out.push({ kind: 'render', event: e });
    } else if (e.type === 'audit' && e.result === 'failed' && e.will_retry) {
      // Retry is about to run; clear the pre-retry timeline so the user only
      // sees the retry output. On a terminal audit failure (no retry), keep
      // the content and let the UI render a warning badge.
      buf = '';
      out = [];
    }
  }
  flush();
  return out;
}

export function latestStatus(events: AgentEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.type === 'status') return e.message;
    if (e.type === 'text_delta' || e.type === 'turn_end' || e.type === 'render') return null;
  }
  return null;
}

export type { AgentEvent };
