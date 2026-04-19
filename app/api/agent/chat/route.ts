import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropic, modelName } from '@/lib/anthropic';
import { buildToolRegistry } from '@/lib/agent/adapters';
import { runAgentLoop } from '@/lib/agent/loop';
import { AGENT_SYSTEM_PROMPT, getCatalogSummary } from '@/lib/agent/prompts/system';
import { nextTurnIndex, recordTurnCompletion, resolveSession, SESSION_COOKIE, sessionCookieHeader } from '@/lib/agent/session';
import { createEventEmitter, type AgentEvent } from '@/lib/agent/sse';
import { AGENT_TOOLS } from '@/lib/agent/tool_schemas';
import { TurnTraceRecorder } from '@/lib/agent/traces';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Surface = 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin';
const VALID_SURFACES: Surface[] = ['workbench', 'catalog', 'saved', 'comparisons', 'admin'];

type ChatBody = {
  session_id?: string;
  message: string;
  surface: Surface;
  surface_context?: Record<string, unknown>;
  start_new_session?: boolean;
};

function userFrom(req: Request): string {
  return req.headers.get('x-epau-user-resolved') ?? req.headers.get('x-epau-user') ?? 'unknown@local';
}

function sessionCookieFrom(req: Request): string | undefined {
  const raw = req.headers.get('cookie') ?? '';
  const match = raw.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return jsonError(400, 'invalid_body', 'Body must be JSON');
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return jsonError(400, 'message_required', 'message must be a non-empty string');

  const surface = VALID_SURFACES.includes(body.surface) ? body.surface : null;
  if (!surface) return jsonError(400, 'invalid_surface', `surface must be one of ${VALID_SURFACES.join(', ')}`);

  const userEmail = userFrom(req);
  const cookieSession = body.start_new_session
    ? undefined
    : body.session_id ?? sessionCookieFrom(req);

  const resolution = await resolveSession(prisma, cookieSession, userEmail, surface);
  const session = resolution.session;
  const turnIndex = await nextTurnIndex(prisma, session.id);

  const recorder = new TurnTraceRecorder(prisma, session.id, userEmail, turnIndex);
  const { stream, emit, close, isClosed } = createEventEmitter();

  const response = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Set-Cookie': sessionCookieHeader(session.id),
    },
  });

  void (async () => {
    try {
      emit({ type: 'session', session_id: session.id, turn_index: turnIndex });

      recorder.user({ text: message, surface_context: body.surface_context ?? null }, surface);

      const history = await loadHistory(session.id);
      const messages: Anthropic.Messages.MessageParam[] = [
        ...history,
        { role: 'user', content: message },
      ];

      const catalogSummary = await getCatalogSummary(prisma);
      const surfaceHeader = `Current surface: ${surface}\nSurface context: ${JSON.stringify(body.surface_context ?? {})}`;

      const system = [
        { type: 'text' as const, text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' as const } },
        { type: 'text' as const, text: catalogSummary, cache_control: { type: 'ephemeral' as const } },
        { type: 'text' as const, text: surfaceHeader },
      ];

      const toolRegistry = buildToolRegistry(prisma, userEmail);

      const result = await runAgentLoop({
        anthropic: getAnthropic(),
        modelId: modelName(),
        system,
        initialMessages: messages,
        tools: AGENT_TOOLS as unknown as unknown[],
        toolRegistry,
        emit,
        recorder,
        surface,
      });

      emit({ type: 'turn_end', stop_reason: result.stopReason, steps: result.steps });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      recorder.systemEvent({ kind: 'loop_error', detail, errorCode: 'loop_exception', errorDetail: detail });
      if (!isClosed()) emit({ type: 'error', code: 'loop_exception', detail });
    } finally {
      try {
        await recorder.flush();
        await recordTurnCompletion(prisma, session.id, turnIndex);
      } catch (err) {
        process.stderr.write(`[agent-finalize-failed] ${err instanceof Error ? err.message : String(err)}\n`);
      }
      close();
    }
  })();

  return response;
}

// History disabled in v1 — prior-turn text was bleeding into grounding-rule
// enforcement. See docs/agent_design.md §4 data grounding rule.
async function loadHistory(_sessionId: string): Promise<Anthropic.Messages.MessageParam[]> {
  return [];
}

function jsonError(status: number, code: string, detail: string): Response {
  const event: AgentEvent = { type: 'error', code, detail };
  return new Response(JSON.stringify(event), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
