import type Anthropic from '@anthropic-ai/sdk';
import type { AgentEvent } from './sse';
import type { ToolRegistry } from './adapters';
import type { TurnTraceRecorder } from './traces';

export const MAX_TOOL_ROUNDS = 12;

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: unknown };
type ContentBlock = TextBlock | ToolUseBlock | { type: string; [k: string]: unknown };

type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };

type RenderableTool = 'render_chart' | 'render_table' | 'render_commentary' | 'flag_unavailable';
const RENDER_KIND: Record<RenderableTool, 'chart' | 'table' | 'commentary' | 'flag_unavailable'> = {
  render_chart: 'chart',
  render_table: 'table',
  render_commentary: 'commentary',
  flag_unavailable: 'flag_unavailable',
};

const STATUS_FOR: Record<string, string> = {
  search_catalog: 'Searching catalog…',
  get_observations: 'Fetching observations…',
  compute: 'Computing…',
  list_comparison_tables: 'Listing comparison tables…',
  get_comparison_table: 'Reading comparison table…',
  list_saved_views: 'Listing saved views…',
  get_saved_view: 'Reading saved view…',
  render_chart: 'Rendering chart…',
  render_table: 'Rendering table…',
  render_commentary: 'Drafting commentary…',
  flag_unavailable: 'Flagging unavailable…',
};

export type RunAgentLoopArgs = {
  anthropic: Anthropic;
  modelId: string;
  system: SystemBlock[];
  initialMessages: Anthropic.Messages.MessageParam[];
  tools: unknown[];
  toolRegistry: ToolRegistry;
  emit: (ev: AgentEvent) => void;
  recorder: TurnTraceRecorder;
  surface: string;
  maxTokens?: number;
};

export type CollectedToolCall = { tool: string; output: unknown };

export type RunAgentLoopResult = {
  steps: number;
  stopReason: string;
  messages: Anthropic.Messages.MessageParam[];
  finalText: string;
  toolCalls: CollectedToolCall[];
  renderedCommentaryTexts: string[];
};

export async function runAgentLoop(args: RunAgentLoopArgs): Promise<RunAgentLoopResult> {
  const workingMessages: Anthropic.Messages.MessageParam[] = [...args.initialMessages];
  const toolCalls: CollectedToolCall[] = [];
  const renderedCommentaryTexts: string[] = [];
  let steps = 0;
  let capReached = false;
  let lastFinalText = '';

  while (true) {
    const withTools = !capReached;
    const callStart = Date.now();

    const stream = args.anthropic.messages.stream({
      model: args.modelId,
      max_tokens: args.maxTokens ?? 4096,
      system: args.system as unknown as Anthropic.Messages.TextBlockParam[],
      messages: workingMessages,
      tools: withTools ? (args.tools as Anthropic.Messages.Tool[]) : [],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        args.emit({ type: 'text_delta', text: event.delta.text });
      }
    }

    const msg = await stream.finalMessage();
    const latencyMs = Date.now() - callStart;
    const text = textOf(msg.content as ContentBlock[]);
    lastFinalText = text;
    const usage = msg.usage as Anthropic.Messages.Usage & { cache_read_input_tokens?: number | null };
    const cacheHit = (usage.cache_read_input_tokens ?? 0) > 0;

    args.recorder.assistant({
      text,
      contentBlocks: msg.content,
      surface: args.surface,
      tokenCountInput: usage.input_tokens,
      tokenCountOutput: usage.output_tokens,
      modelId: args.modelId,
      promptCacheHit: cacheHit,
      stopReason: msg.stop_reason ?? undefined,
      latencyMs,
    });

    workingMessages.push({ role: 'assistant', content: msg.content });

    const toolUses = (msg.content as ContentBlock[]).filter(
      (b): b is ToolUseBlock => b.type === 'tool_use',
    );

    if (msg.stop_reason !== 'tool_use' || toolUses.length === 0 || capReached) {
      return {
        steps,
        stopReason: msg.stop_reason ?? 'end_turn',
        messages: workingMessages,
        finalText: lastFinalText,
        toolCalls,
        renderedCommentaryTexts,
      };
    }

    const toolResults = await Promise.all(
      toolUses.map((tu) => executeTool(tu, args)),
    );

    for (let i = 0; i < toolUses.length; i++) {
      const name = toolUses[i]!.name;
      const output = toolResults[i]!.output;
      toolCalls.push({ tool: name, output });
      if (name === 'render_commentary' && output && typeof output === 'object' && 'text' in output) {
        const t = (output as { text?: unknown }).text;
        if (typeof t === 'string') renderedCommentaryTexts.push(t);
      }
    }

    steps++;
    const capHitNow = steps >= MAX_TOOL_ROUNDS;

    const toolResultBlocks = toolResults.map(
      (r): Anthropic.Messages.ToolResultBlockParam => ({
        type: 'tool_result',
        tool_use_id: r.toolUseId,
        content: JSON.stringify(r.output),
        is_error: r.isError,
      }),
    );

    const userContent: Array<
      | Anthropic.Messages.TextBlockParam
      | Anthropic.Messages.ToolResultBlockParam
    > = [...toolResultBlocks];
    if (capHitNow) {
      capReached = true;
      args.recorder.systemEvent({ kind: 'turn_cap_reached', detail: { steps } });
      userContent.push({
        type: 'text',
        text:
          'You have reached the tool-call budget for this turn. Respond now with what you have, ' +
          'grounded in the tool results already returned. Do not request more tools.',
      });
    }

    workingMessages.push({ role: 'user', content: userContent });
  }
}

type ToolExecutionResult = {
  toolUseId: string;
  output: unknown;
  isError: boolean;
};

async function executeTool(
  tu: ToolUseBlock,
  args: RunAgentLoopArgs,
): Promise<ToolExecutionResult> {
  const exec = args.toolRegistry[tu.name];
  const start = Date.now();

  args.emit({ type: 'status', message: STATUS_FOR[tu.name] ?? `Running ${tu.name}…` });
  args.emit({ type: 'tool_call', tool_name: tu.name, tool_call_id: tu.id, input: tu.input });
  args.recorder.toolCall({ toolName: tu.name, toolCallId: tu.id, input: tu.input });

  let output: unknown;
  let isError = false;
  let errorCode: string | undefined;
  let errorDetail: string | undefined;

  if (!exec) {
    output = { error: 'unknown_tool', detail: tu.name };
    isError = true;
    errorCode = 'unknown_tool';
    errorDetail = tu.name;
  } else {
    try {
      output = await exec(tu.input);
      if (output && typeof output === 'object' && 'error' in output) {
        isError = true;
        errorCode = String((output as { error: string }).error);
      }
    } catch (err) {
      output = { error: 'tool_exception', detail: err instanceof Error ? err.message : String(err) };
      isError = true;
      errorCode = 'tool_exception';
      errorDetail = err instanceof Error ? err.message : String(err);
    }
  }

  const latencyMs = Date.now() - start;
  args.emit({
    type: 'tool_result',
    tool_call_id: tu.id,
    output,
    error: errorCode,
  });
  args.recorder.toolResult({
    toolName: tu.name,
    toolCallId: tu.id,
    output,
    latencyMs,
    errorCode,
    errorDetail,
  });

  if (!isError && isRenderableTool(tu.name) && output && typeof output === 'object' && 'render_id' in output) {
    // render_commentary's server-side composer produces the prose; ship it
    // to the client by merging the text back into the payload.
    const input = tu.input as Record<string, unknown>;
    const payload = tu.name === 'render_commentary'
      ? { ...input, text: (output as { text?: string }).text ?? '' }
      : input;
    args.emit({
      type: 'render',
      render_id: String((output as { render_id: string }).render_id),
      kind: RENDER_KIND[tu.name],
      payload,
    });
  }

  return { toolUseId: tu.id, output, isError };
}

function textOf(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function isRenderableTool(name: string): name is RenderableTool {
  return name in RENDER_KIND;
}
