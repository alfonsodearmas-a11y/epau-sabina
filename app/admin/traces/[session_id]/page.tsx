import { prisma } from '@/lib/db';
import { TraceDetailPage, type Turn, type TraceStep } from '@/components/admin/traces/TraceDetailPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TraceDetailRoute(
  { params }: { params: Promise<{ session_id: string }> },
) {
  const { session_id } = await params;

  const session = await prisma.agentSession.findUnique({
    where: { id: session_id },
    select: {
      id: true, userEmail: true, surface: true,
      startedAt: true, lastTurnAt: true, turnCount: true,
    },
  });
  if (!session) notFound();

  const traces = await prisma.agentTrace.findMany({
    where: { sessionId: session_id },
    orderBy: { stepIndex: 'asc' },
  });

  // Group by turnIndex
  const turnsMap = new Map<number, TraceStep[]>();
  for (const t of traces) {
    const steps = turnsMap.get(t.turnIndex) ?? [];
    steps.push({
      id: t.id.toString(),
      step: t.stepIndex,
      role: t.role,
      toolName: t.toolName,
      toolCallId: t.toolCallId,
      content: t.content,
      latencyMs: t.latencyMs,
      stopReason: t.stopReason,
      promptCacheHit: t.promptCacheHit,
      tokenIn: t.tokenCountInput,
      tokenOut: t.tokenCountOutput,
      modelId: t.modelId,
      errorCode: t.errorCode,
      errorDetail: t.errorDetail,
      createdAt: t.createdAt.toISOString(),
    });
    turnsMap.set(t.turnIndex, steps);
  }

  const turns: Turn[] = Array.from(turnsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([turnIndex, steps]) => {
      const userRow = steps.find((s) => s.role === 'user');
      const assistantRows = steps.filter((s) => s.role === 'assistant');
      const lastAssistant = assistantRows[assistantRows.length - 1];
      const firstStep = steps[0];
      const lastStep = steps[steps.length - 1];
      const wallMs = firstStep && lastStep
        ? new Date(lastStep.createdAt).getTime() - new Date(firstStep.createdAt).getTime()
        : 0;
      const userMsg = (userRow?.content as { text?: string } | null)?.text ?? '';
      const auditRow = steps.find((s) => {
        const c = s.content as { kind?: string } | null;
        return c?.kind === 'turn_audit_result';
      });
      const auditDetail = (auditRow?.content as { detail?: { result?: string } } | null)?.detail?.result ?? null;
      return {
        turnIndex,
        userMsg,
        wallMs,
        steps,
        auditResult: auditDetail,
        finalStopReason: lastAssistant?.stopReason ?? null,
      };
    });

  let auditFailures = 0;
  for (const t of traces) {
    const c = t.content as { kind?: string } | null;
    if (c?.kind === 'numeric_audit_retry_failed' || c?.kind === 'numeric_audit_failed_permissive') auditFailures++;
  }

  const totalToolCalls = traces.filter((t) => t.role === 'tool_call').length;

  return (
    <TraceDetailPage
      session={{
        id: session.id,
        userEmail: session.userEmail,
        surface: session.surface,
        startedAt: session.startedAt.toISOString(),
        lastTurnAt: session.lastTurnAt?.toISOString() ?? null,
        turnCount: session.turnCount,
        totalToolCalls,
        auditFailures,
      }}
      turns={turns}
    />
  );
}
