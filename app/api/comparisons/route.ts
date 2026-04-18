import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tables = await prisma.comparisonTable.findMany({
    include: { rows: { orderBy: { orderIndex: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({
    tables: tables.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      source: t.source,
      sourceTab: t.sourceTab,
      description: t.description,
      metadata: t.metadata,
      rows: t.rows.map((r) => ({
        rowLabel: r.rowLabel,
        groupLabel: r.groupLabel,
        columnLabel: r.columnLabel,
        value: r.value === null ? null : Number(r.value),
        valueText: r.valueText,
        unit: r.unit,
        note: r.note,
        orderIndex: r.orderIndex,
      })),
    })),
  });
}
