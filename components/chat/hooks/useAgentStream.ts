'use client';

import { useCallback, useRef, useState } from 'react';
import { createSseParser } from '@/lib/agent-client/parseSse';
import { newTurn, type ChatSurface, type ChatSurfaceContext, type Turn } from '@/lib/agent-client/types';

export type SendArgs = {
  message: string;
  surface: ChatSurface;
  surface_context?: ChatSurfaceContext;
  startNewSession?: boolean;
};

export type UseAgentStreamResult = {
  turns: Turn[];
  isStreaming: boolean;
  sessionId: string | null;
  send: (args: SendArgs) => Promise<void>;
  clear: () => void;
};

export function useAgentStream(): UseAgentStreamResult {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (args: SendArgs) => {
    if (abortRef.current) abortRef.current.abort();

    const turn = newTurn(args.message, args.surface);
    setTurns((prev) => [...prev, turn]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const patch = (updater: (t: Turn) => Turn) => {
      setTurns((prev) => prev.map((t) => (t.id === turn.id ? updater(t) : t)));
    };

    const parser = createSseParser((event) => {
      if (event.type === 'session') {
        setSessionId(event.session_id);
        patch((t) => ({ ...t, sessionId: event.session_id, turnIndex: event.turn_index }));
        return;
      }
      if (event.type === 'turn_end') {
        patch((t) => ({
          ...t,
          events: [...t.events, event],
          status: 'complete',
          stopReason: event.stop_reason,
          steps: event.steps,
        }));
        return;
      }
      if (event.type === 'error') {
        patch((t) => ({
          ...t,
          events: [...t.events, event],
          status: 'error',
          errorCode: event.code,
          errorDetail: event.detail,
        }));
        return;
      }
      patch((t) => ({ ...t, events: [...t.events, event] }));
    });

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: args.message,
          surface: args.surface,
          surface_context: args.surface_context,
          start_new_session: args.startNewSession ?? false,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let detail = `HTTP ${res.status}`;
        try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
        patch((t) => ({
          ...t,
          status: 'error',
          errorCode: 'http_error',
          errorDetail: detail,
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.end();
    } catch (err) {
      if (controller.signal.aborted) return;
      const detail = err instanceof Error ? err.message : String(err);
      patch((t) => ({ ...t, status: 'error', errorCode: 'network_error', errorDetail: detail }));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setTurns([]);
    setSessionId(null);
    setIsStreaming(false);
  }, []);

  return { turns, isStreaming, sessionId, send, clear };
}
