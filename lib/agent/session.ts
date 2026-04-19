import type { AgentSession, PrismaClient } from '@prisma/client';

export const SESSION_COOKIE = 'epau_agent_session';
const IDLE_ROTATION_MS = 24 * 60 * 60 * 1000;

export type SessionResolution = {
  session: AgentSession;
  created: boolean;
  rotated: boolean;
};

export async function resolveSession(
  prisma: PrismaClient,
  cookieValue: string | undefined,
  userEmail: string,
  surface: string,
  now: Date = new Date(),
): Promise<SessionResolution> {
  const existing = cookieValue
    ? await prisma.agentSession.findUnique({ where: { id: cookieValue } })
    : null;

  if (existing) {
    const lastActivity = existing.lastTurnAt ?? existing.startedAt;
    const idleFor = now.getTime() - lastActivity.getTime();
    const emailChanged = existing.userEmail !== userEmail;
    const idledOut = idleFor > IDLE_ROTATION_MS;

    if (!emailChanged && !idledOut) {
      return { session: existing, created: false, rotated: false };
    }
  }

  const session = await prisma.agentSession.create({
    data: { userEmail, surface, startedAt: now, lastTurnAt: null },
  });
  return { session, created: !existing, rotated: !!existing };
}

export async function nextTurnIndex(prisma: PrismaClient, sessionId: string): Promise<number> {
  const last = await prisma.agentTrace.findFirst({
    where: { sessionId },
    orderBy: { turnIndex: 'desc' },
    select: { turnIndex: true },
  });
  return last ? last.turnIndex + 1 : 0;
}

export async function recordTurnCompletion(
  prisma: PrismaClient,
  sessionId: string,
  turnIndex: number,
  now: Date = new Date(),
): Promise<void> {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: { lastTurnAt: now, turnCount: turnIndex + 1 },
  });
}

export function sessionCookieHeader(sessionId: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(IDLE_ROTATION_MS / 1000)}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}
