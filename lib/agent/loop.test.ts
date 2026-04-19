import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { MAX_TOOL_ROUNDS, runAgentLoop } from './loop';
import type { ToolRegistry } from './adapters';
import { AGENT_TOOLS } from './tool_schemas';
import type { AgentEvent } from './sse';

type ScriptedTurn = {
  text?: string;
  tool_uses?: Array<{ id: string; name: string; input: unknown }>;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
};

function makeMockAnthropic(turns: ScriptedTurn[]): Anthropic {
  let cursor = 0;
  const calls: unknown[] = [];
  const client = {
    messages: {
      stream: vi.fn((args: unknown) => {
        calls.push(args);
        const turn = turns[cursor++] ?? { stop_reason: 'end_turn', text: '' };
        const content: unknown[] = [];
        if (turn.text) content.push({ type: 'text', text: turn.text });
        for (const tu of turn.tool_uses ?? []) {
          content.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
        }
        const events = turn.text
          ? [{ type: 'content_block_delta', delta: { type: 'text_delta', text: turn.text } }]
          : [];
        return {
          [Symbol.asyncIterator]: async function* () { for (const e of events) yield e; },
          finalMessage: async () => ({
            content,
            stop_reason: turn.stop_reason,
            usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0 },
          }),
        };
      }),
    },
  } as unknown as Anthropic;
  (client as unknown as { _calls: unknown[] })._calls = calls;
  return client;
}

function fakeRecorder() {
  return {
    assistant: vi.fn(),
    toolCall: vi.fn(),
    toolResult: vi.fn(),
    systemEvent: vi.fn(),
    user: vi.fn(),
    flush: vi.fn(async () => undefined),
    get count() { return 0; },
  };
}

const baseArgs = {
  modelId: 'claude-sonnet-4-5',
  system: [{ type: 'text' as const, text: 'sys' }],
  initialMessages: [{ role: 'user' as const, content: 'hi' }],
  tools: AGENT_TOOLS as unknown as unknown[],
  surface: 'workbench',
};

describe('runAgentLoop', () => {
  it('happy path: end_turn without tool use', async () => {
    const anthropic = makeMockAnthropic([{ text: 'Hello Sabina.', stop_reason: 'end_turn' }]);
    const events: AgentEvent[] = [];
    const recorder = fakeRecorder();
    const registry: ToolRegistry = {};

    const res = await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: (e) => events.push(e),
      recorder: recorder as never,
    });

    expect(res.steps).toBe(0);
    expect(res.stopReason).toBe('end_turn');
    expect(events.find((e) => e.type === 'text_delta' && e.text === 'Hello Sabina.')).toBeDefined();
    expect(recorder.assistant).toHaveBeenCalledTimes(1);
  });

  it('tool-use path: executes registered tool, appends result, loops to end_turn', async () => {
    const anthropic = makeMockAnthropic([
      {
        stop_reason: 'tool_use',
        tool_uses: [{ id: 'tu_1', name: 'search_catalog', input: { query: 'inflation' } }],
      },
      { text: 'Found it.', stop_reason: 'end_turn' },
    ]);
    const registry: ToolRegistry = {
      search_catalog: vi.fn(async () => ({ matches: [{ kind: 'indicator', id: 'x' }], truncated: false })),
    };
    const events: AgentEvent[] = [];
    const recorder = fakeRecorder();

    const res = await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: (e) => events.push(e),
      recorder: recorder as never,
    });

    expect(res.steps).toBe(1);
    expect(res.stopReason).toBe('end_turn');
    expect(registry.search_catalog).toHaveBeenCalledOnce();
    expect(events.some((e) => e.type === 'tool_call')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result')).toBe(true);
    expect(events.some((e) => e.type === 'status')).toBe(true);
  });

  it('parallel execution: three tool_use blocks in one turn run concurrently', async () => {
    const starts: number[] = [];
    const ends: number[] = [];
    const slow = async () => {
      starts.push(Date.now());
      await new Promise((r) => setTimeout(r, 50));
      ends.push(Date.now());
      return { ok: true };
    };
    const anthropic = makeMockAnthropic([
      {
        stop_reason: 'tool_use',
        tool_uses: [
          { id: 'a', name: 'search_catalog', input: { query: 'a' } },
          { id: 'b', name: 'search_catalog', input: { query: 'b' } },
          { id: 'c', name: 'search_catalog', input: { query: 'c' } },
        ],
      },
      { text: 'done', stop_reason: 'end_turn' },
    ]);
    const registry: ToolRegistry = { search_catalog: slow };
    const recorder = fakeRecorder();

    const t0 = Date.now();
    await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: () => undefined,
      recorder: recorder as never,
    });
    const total = Date.now() - t0;

    expect(starts).toHaveLength(3);
    expect(ends).toHaveLength(3);
    // Parallel: all three start within ~30ms of each other; total < 3 × 50 = 150ms.
    const startSpread = Math.max(...starts) - Math.min(...starts);
    expect(startSpread).toBeLessThan(30);
    expect(total).toBeLessThan(140);
  });

  it('turn cap: stops after 12 rounds and logs system_event', async () => {
    const turns: ScriptedTurn[] = [];
    for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
      turns.push({
        stop_reason: 'tool_use',
        tool_uses: [{ id: `tu_${i}`, name: 'search_catalog', input: { query: String(i) } }],
      });
    }
    turns.push({ text: 'forced final', stop_reason: 'end_turn' });
    const anthropic = makeMockAnthropic(turns);
    const registry: ToolRegistry = { search_catalog: vi.fn(async () => ({ matches: [], truncated: false })) };
    const recorder = fakeRecorder();

    const res = await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: () => undefined,
      recorder: recorder as never,
    });

    expect(res.steps).toBe(MAX_TOOL_ROUNDS);
    expect(recorder.systemEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'turn_cap_reached' }),
    );
    const calls = (anthropic.messages.stream as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls;
    const lastArgs = calls[calls.length - 1]![0];
    expect(Array.isArray(lastArgs.tools) && (lastArgs.tools as unknown[]).length).toBe(0);
  });

  it('render event: emitted when render_chart returns a render_id', async () => {
    const anthropic = makeMockAnthropic([
      {
        stop_reason: 'tool_use',
        tool_uses: [{ id: 'r1', name: 'render_chart', input: { chart_type: 'line', title: 't', series: [] } }],
      },
      { text: 'done', stop_reason: 'end_turn' },
    ]);
    const registry: ToolRegistry = {
      render_chart: vi.fn(async () => ({ render_id: 'rnd_abc', chart_type: 'line', series_count: 1, warnings: [] })),
    };
    const events: AgentEvent[] = [];
    const recorder = fakeRecorder();

    await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: (e) => events.push(e),
      recorder: recorder as never,
    });

    const render = events.find((e): e is Extract<AgentEvent, { type: 'render' }> => e.type === 'render');
    expect(render).toBeDefined();
    expect(render!.kind).toBe('chart');
    expect(render!.render_id).toBe('rnd_abc');
  });

  it('tool error: result carries error, recorder captures errorCode', async () => {
    const anthropic = makeMockAnthropic([
      {
        stop_reason: 'tool_use',
        tool_uses: [{ id: 'e1', name: 'search_catalog', input: { query: '' } }],
      },
      { text: 'ok', stop_reason: 'end_turn' },
    ]);
    const registry: ToolRegistry = {
      search_catalog: vi.fn(async () => ({ error: 'invalid_query', detail: 'empty' })),
    };
    const events: AgentEvent[] = [];
    const recorder = fakeRecorder();

    await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: registry,
      emit: (e) => events.push(e),
      recorder: recorder as never,
    });

    const tr = events.find((e): e is Extract<AgentEvent, { type: 'tool_result' }> => e.type === 'tool_result');
    expect(tr?.error).toBe('invalid_query');
    expect(recorder.toolResult).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'invalid_query' }),
    );
  });

  it('unknown tool: returns error output without throwing', async () => {
    const anthropic = makeMockAnthropic([
      {
        stop_reason: 'tool_use',
        tool_uses: [{ id: 'u1', name: 'not_a_tool', input: {} }],
      },
      { text: 'ok', stop_reason: 'end_turn' },
    ]);
    const events: AgentEvent[] = [];
    const recorder = fakeRecorder();

    const res = await runAgentLoop({
      ...baseArgs,
      anthropic,
      toolRegistry: {},
      emit: (e) => events.push(e),
      recorder: recorder as never,
    });

    expect(res.stopReason).toBe('end_turn');
    const tr = events.find((e): e is Extract<AgentEvent, { type: 'tool_result' }> => e.type === 'tool_result');
    expect(tr?.error).toBe('unknown_tool');
  });
});
