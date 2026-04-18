import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function userFrom(req: Request): string {
  return req.headers.get('x-epau-user-resolved') ?? req.headers.get('x-epau-user') ?? 'unknown@local';
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = userFrom(req);
  const row = await prisma.savedQuery.findUnique({ where: { id: params.id } });
  if (!row || row.userEmail !== user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await prisma.savedQuery.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
