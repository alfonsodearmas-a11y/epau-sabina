import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') ?? undefined;
  const frequency = url.searchParams.get('frequency') ?? undefined;
  const source = url.searchParams.get('source') ?? undefined;
  const hasCaveat = url.searchParams.get('has_caveat') === 'true';
  const q = url.searchParams.get('q')?.trim();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '500'), 2000);

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (frequency) where.frequency = frequency;
  if (source) where.source = source;
  if (hasCaveat) where.caveat = { not: null };
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const rows = await prisma.indicator.findMany({
    where: where as never,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: limit,
  });
  return NextResponse.json({ indicators: rows });
}
