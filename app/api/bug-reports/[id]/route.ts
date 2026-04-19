import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/bug-reports/[id] — toggle the resolved flag. Only admin UI calls this.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  if (typeof body?.resolved !== 'boolean') {
    return NextResponse.json({ error: 'resolved (boolean) required' }, { status: 400 });
  }
  const row = await prisma.bugReport.update({
    where: { id: params.id },
    data: { resolved: body.resolved },
  });
  return NextResponse.json({ report: row });
}
