import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('run_id');
  if (!runId) return NextResponse.json({ error: 'run_id required' }, { status: 400 });
  const issues = await prisma.ingestionIssue.findMany({
    where: { runId },
    orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ issues });
}
