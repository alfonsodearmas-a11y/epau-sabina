export type AgentEvent =
  | { type: 'session'; session_id: string; turn_index: number }
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool_name: string; tool_call_id: string; input: unknown }
  | { type: 'tool_result'; tool_call_id: string; output: unknown; error?: string }
  | { type: 'render'; render_id: string; kind: 'chart' | 'table' | 'commentary' | 'flag_unavailable'; payload: unknown }
  | { type: 'text_delta'; text: string }
  | { type: 'turn_end'; stop_reason: string; steps: number }
  | { type: 'error'; code: string; detail: string };

export function encodeEvent(ev: AgentEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

export function createEventEmitter() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
      controller = null;
    },
  });

  const emit = (ev: AgentEvent) => {
    if (closed || !controller) return;
    try {
      controller.enqueue(encoder.encode(encodeEvent(ev)));
    } catch {
      closed = true;
    }
  };

  const close = () => {
    if (closed || !controller) return;
    closed = true;
    try { controller.close(); } catch { /* already closed */ }
    controller = null;
  };

  return { stream, emit, close, isClosed: () => closed };
}
