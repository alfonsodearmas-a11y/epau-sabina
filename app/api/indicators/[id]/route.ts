import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const indicator = await prisma.indicator.findUnique({ where: { id: params.id } });
  if (!indicator) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ indicator });
}
