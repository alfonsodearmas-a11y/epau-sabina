import { describe, expect, it, vi } from 'vitest';
import type { AgentSession, PrismaClient } from '@prisma/client';
import { resolveSession } from './session';

function makePrisma(existing: AgentSession | null): PrismaClient {
  let created: AgentSession | null = null;
  const db = {
    agentSession: {
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async (args: { data: Partial<AgentSession> }) => {
        created = {
          id: 'new-session-id',
          userEmail: args.data.userEmail ?? '',
          surface: args.data.surface ?? '',
          startedAt: (args.data.startedAt ?? new Date()) as Date,
          endedAt: null,
          lastTurnAt: null,
          turnCount: 0,
        };
        return created;
      }),
    },
  } as unknown as PrismaClient;
  return db;
}

const session = (overrides: Partial<AgentSession> = {}): AgentSession => ({
  id: 'sess-1',
  userEmail: 'sabina@example.com',
  surface: 'workbench',
  startedAt: new Date('2026-04-19T10:00:00Z'),
  endedAt: null,
  lastTurnAt: new Date('2026-04-19T10:00:00Z'),
  turnCount: 1,
  ...overrides,
});

describe('resolveSession', () => {
  it('no cookie: creates new session', async () => {
    const prisma = makePrisma(null);
    const res = await resolveSession(prisma, undefined, 'sabina@example.com', 'workbench', new Date('2026-04-19T10:00:00Z'));
    expect(res.created).toBe(true);
    expect(res.rotated).toBe(false);
    expect(res.session.id).toBe('new-session-id');
  });

  it('existing, active, same email: reuses session', async () => {
    const existing = session();
    const prisma = makePrisma(existing);
    const res = await resolveSession(prisma, existing.id, 'sabina@example.com', 'workbench', new Date('2026-04-19T12:00:00Z'));
    expect(res.created).toBe(false);
    expect(res.rotated).toBe(false);
    expect(res.session.id).toBe(existing.id);
  });

  it('idle > 24h: rotates to a new session', async () => {
    const existing = session({ lastTurnAt: new Date('2026-04-18T09:00:00Z') });
    const prisma = makePrisma(existing);
    const now = new Date('2026-04-19T10:00:00Z');
    const res = await resolveSession(prisma, existing.id, 'sabina@example.com', 'workbench', now);
    expect(res.rotated).toBe(true);
    expect(res.session.id).toBe('new-session-id');
  });

  it('email change: rotates', async () => {
    const existing = session();
    const prisma = makePrisma(existing);
    const res = await resolveSession(prisma, existing.id, 'someone@else.com', 'workbench', new Date('2026-04-19T10:30:00Z'));
    expect(res.rotated).toBe(true);
    expect(res.session.id).toBe('new-session-id');
  });
});
