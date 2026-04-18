import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const table = await prisma.comparisonTable.findUnique({
    where: { id: params.id },
    include: { rows: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!table) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    table: {
      ...table,
      rows: table.rows.map((r) => ({
        ...r,
        value: r.value === null ? null : Number(r.value),
      })),
    },
  });
}
