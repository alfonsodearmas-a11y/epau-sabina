import type { AgentEvent } from '@/lib/agent/sse';

export type SseParserCallback = (event: AgentEvent) => void;

/**
 * Stateful SSE line-buffer. Feed it chunks of decoded text; it yields a parsed
 * AgentEvent to the callback whenever a full event (terminated by a blank line)
 * has been consumed.
 */
export function createSseParser(onEvent: SseParserCallback) {
  let buffer = '';

  const flush = (raw: string) => {
    if (!raw.trim()) return;
    const lines = raw.split('\n');
    let eventType = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
      const parsed = JSON.parse(data) as AgentEvent;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        onEvent(parsed);
      }
    } catch {
      // Malformed event; skip silently rather than break the stream.
    }
    void eventType;
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        flush(raw);
      }
    },
    end() {
      if (buffer.length) {
        flush(buffer);
        buffer = '';
      }
    },
  };
}
