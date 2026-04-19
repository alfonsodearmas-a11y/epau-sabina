// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAgentStream } from './useAgentStream';

function mockFetchStream(events: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      for (const e of events) {
        c.enqueue(encoder.encode(e));
        await new Promise((r) => setTimeout(r, 0));
      }
      c.close();
    },
  });
  return {
    ok: true,
    status: 200,
    body: stream,
    json: async () => ({}),
  } as unknown as Response;
}

const ev = (obj: Record<string, unknown>) =>
  `event: ${obj.type}\ndata: ${JSON.stringify(obj)}\n\n`;

describe('useAgentStream', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('assembles a full turn from streamed SSE events', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchStream([
        ev({ type: 'session', session_id: 'sess-1', turn_index: 0 }),
        ev({ type: 'status', message: 'Searching catalog…' }),
        ev({ type: 'tool_call', tool_name: 'search_catalog', tool_call_id: 't1', input: {} }),
        ev({ type: 'tool_result', tool_call_id: 't1', output: { matches: [] } }),
        ev({ type: 'text_delta', text: 'Inflation ' }),
        ev({ type: 'text_delta', text: 'was 2%.' }),
        ev({ type: 'turn_end', stop_reason: 'end_turn', steps: 1 }),
      ]),
    );

    const { result } = renderHook(() => useAgentStream());

    await act(async () => {
      await result.current.send({ message: 'what was inflation in 2023', surface: 'workbench' });
    });

    await waitFor(() => expect(result.current.turns[0]?.status).toBe('complete'));

    const turn = result.current.turns[0]!;
    expect(turn.sessionId).toBe('sess-1');
    expect(turn.stopReason).toBe('end_turn');
    expect(turn.steps).toBe(1);
    const text = turn.events
      .filter((e) => e.type === 'text_delta')
      .map((e) => (e as { text: string }).text)
      .join('');
    expect(text).toBe('Inflation was 2%.');
    expect(result.current.sessionId).toBe('sess-1');
  });

  it('marks turn as error on non-OK fetch response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      { ok: false, status: 500, body: null, json: async () => ({ detail: 'boom' }) } as unknown as Response,
    );
    const { result } = renderHook(() => useAgentStream());
    await act(async () => {
      await result.current.send({ message: 'x', surface: 'workbench' });
    });
    await waitFor(() => expect(result.current.turns[0]?.status).toBe('error'));
    expect(result.current.turns[0]!.errorCode).toBe('http_error');
  });

  it('clear() wipes turns and sessionId', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mockFetchStream([
        ev({ type: 'session', session_id: 's', turn_index: 0 }),
        ev({ type: 'turn_end', stop_reason: 'end_turn', steps: 0 }),
      ]),
    );
    const { result } = renderHook(() => useAgentStream());
    await act(async () => {
      await result.current.send({ message: 'x', surface: 'workbench' });
    });
    await waitFor(() => expect(result.current.turns).toHaveLength(1));
    act(() => result.current.clear());
    expect(result.current.turns).toHaveLength(0);
    expect(result.current.sessionId).toBeNull();
  });
});
