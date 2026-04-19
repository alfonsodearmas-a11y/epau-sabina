import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function userFrom(req: Request): string {
  return req.headers.get('x-epau-user-resolved') ?? req.headers.get('x-epau-user') ?? 'unknown@local';
}

// GET /api/bug-reports — list, newest first. Used by /admin/bug-reports.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resolved = searchParams.get('resolved');
  const where = resolved === 'true' ? { resolved: true } : resolved === 'false' ? { resolved: false } : {};
  const rows = await prisma.bugReport.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
  return NextResponse.json({ reports: rows });
}

// POST /api/bug-reports — filed from the workbench chart card.
export async function POST(req: Request) {
  const user = userFrom(req);
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  const indicatorIds: string[] = Array.isArray(body?.indicatorIds) ? body.indicatorIds.filter((s: unknown): s is string => typeof s === 'string') : [];
  const dateRangeStart = typeof body?.dateRangeStart === 'string' ? body.dateRangeStart : null;
  const dateRangeEnd = typeof body?.dateRangeEnd === 'string' ? body.dateRangeEnd : null;
  if (!note || !indicatorIds.length) {
    return NextResponse.json({ error: 'note and at least one indicatorId are required' }, { status: 400 });
  }
  const row = await prisma.bugReport.create({
    data: { userEmail: user, note, indicatorIds, dateRangeStart, dateRangeEnd },
  });
  return NextResponse.json({ report: row }, { status: 201 });
}
