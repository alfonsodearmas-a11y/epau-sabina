import { prisma } from '@/lib/db';
import { TracesListPage, type SessionRow } from '@/components/admin/traces/TracesListPage';

export const dynamic = 'force-dynamic';

type SearchParams = {
  user?: string;
  failures?: string;
  flag_unavailable?: string;
  range?: '24h' | '7d' | '30d' | 'all';
  page?: string;
};

const PAGE_SIZE = 50;

function rangeCutoff(range: SearchParams['range']): Date | null {
  const now = Date.now();
  switch (range) {
    case '24h': return new Date(now - 24 * 3600_000);
    case '7d':  return new Date(now - 7 * 24 * 3600_000);
    case '30d': return new Date(now - 30 * 24 * 3600_000);
    default:    return null;
  }
}

export default async function TracesRoute({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page ?? '1') || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;
  const cutoff = rangeCutoff(sp.range ?? '7d');
  const range = sp.range ?? '7d';

  const where: Record<string, unknown> = {};
  if (sp.user) where['userEmail'] = sp.user;
  if (cutoff) where['startedAt'] = { gte: cutoff };

  // Sessions page
  const sessions = await prisma.agentSession.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: PAGE_SIZE,
    skip: offset,
    select: {
      id: true, userEmail: true, surface: true, startedAt: true,
      lastTurnAt: true, turnCount: true,
    },
  });

  const total = await prisma.agentSession.count({ where });

  // Distinct emails for the filter dropdown
  const users = await prisma.agentSession.findMany({
    distinct: ['userEmail'],
    select: { userEmail: true },
    orderBy: { userEmail: 'asc' },
  });

  // Aggregate per-session stats (tool count, audit failure count, flag_unavailable count)
  const sessionIds = sessions.map((s) => s.id);
  const toolRows = sessionIds.length ? await prisma.agentTrace.groupBy({
    by: ['sessionId'],
    where: { sessionId: { in: sessionIds }, role: 'tool_call' },
    _count: { _all: true },
  }) : [];
  const anyFailureRows = sessionIds.length ? await prisma.agentTrace.findMany({
    where: { sessionId: { in: sessionIds }, role: 'system_event' },
    select: { sessionId: true, content: true },
  }) : [];
  const flagRows = sessionIds.length ? await prisma.agentTrace.groupBy({
    by: ['sessionId'],
    where: { sessionId: { in: sessionIds }, role: 'tool_call', toolName: 'flag_unavailable' },
    _count: { _all: true },
  }) : [];

  const toolBySession = new Map(toolRows.map((r) => [r.sessionId, r._count._all]));
  const flagBySession = new Map(flagRows.map((r) => [r.sessionId, r._count._all]));
  const failureBySession = new Map<string, number>();
  for (const r of anyFailureRows) {
    const c = r.content as { kind?: string } | null;
    const kind = c?.kind;
    if (kind === 'numeric_audit_retry_failed' || kind === 'numeric_audit_failed_permissive') {
      failureBySession.set(r.sessionId, (failureBySession.get(r.sessionId) ?? 0) + 1);
    }
  }

  let rows: SessionRow[] = sessions.map((s) => ({
    id: s.id,
    userEmail: s.userEmail,
    surface: s.surface,
    startedAt: s.startedAt.toISOString(),
    lastTurnAt: s.lastTurnAt?.toISOString() ?? null,
    turnCount: s.turnCount,
    toolCalls: toolBySession.get(s.id) ?? 0,
    auditFailures: failureBySession.get(s.id) ?? 0,
    flagUnavailableCalls: flagBySession.get(s.id) ?? 0,
  }));

  if (sp.failures === '1') rows = rows.filter((r) => r.auditFailures > 0);
  if (sp.flag_unavailable === '1') rows = rows.filter((r) => r.flagUnavailableCalls > 0);

  return (
    <TracesListPage
      rows={rows}
      total={total}
      page={pageNum}
      pageSize={PAGE_SIZE}
      users={users.map((u) => u.userEmail)}
      filters={{
        user: sp.user ?? '',
        failures: sp.failures === '1',
        flag_unavailable: sp.flag_unavailable === '1',
        range,
      }}
    />
  );
}
