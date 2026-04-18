import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function userFrom(req: Request): string {
  return req.headers.get('x-epau-user-resolved') ?? req.headers.get('x-epau-user') ?? 'unknown@local';
}

export async function GET(req: Request) {
  const user = userFrom(req);
  const rows = await prisma.savedQuery.findMany({
    where: { userEmail: user },
    orderBy: { lastRunAt: 'desc' },
  });
  return NextResponse.json({ views: rows });
}

export async function POST(req: Request) {
  const user = userFrom(req);
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const queryText = typeof body?.queryText === 'string' ? body.queryText.trim() : '';
  const indicatorIds: string[] = Array.isArray(body?.indicatorIds) ? body.indicatorIds : [];
  if (!name || !queryText || !indicatorIds.length) {
    return NextResponse.json({ error: 'name, queryText, indicatorIds required' }, { status: 400 });
  }
  const row = await prisma.savedQuery.create({
    data: {
      userEmail: user, name, queryText, indicatorIds,
      config: (body?.config ?? null) as never,
      lastRunAt: new Date(),
    },
  });
  return NextResponse.json({ view: row });
}
