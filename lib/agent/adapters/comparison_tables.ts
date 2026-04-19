import type { PrismaClient } from '@prisma/client';
import type {
  ComparisonTableDetail,
  ComparisonTablesDb,
  ComparisonTableSummary,
} from '../tools/comparison_tables';
import type { IndicatorCategory } from '../types';

export function comparisonTablesAdapter(prisma: PrismaClient): ComparisonTablesDb {
  return {
    async listComparisonTables({ category, limit }) {
      const rows = await prisma.comparisonTable.findMany({
        where: category ? { category } : undefined,
        orderBy: { name: 'asc' },
        take: limit,
        select: {
          id: true,
          name: true,
          category: true,
          source: true,
          sourceTab: true,
          description: true,
          _count: { select: { rows: true } },
        },
      });
      return rows.map((r): ComparisonTableSummary => ({
        id: r.id,
        name: r.name,
        category: r.category as IndicatorCategory | null,
        source: r.source,
        sourceTab: r.sourceTab,
        description: r.description,
        rowCount: r._count.rows,
      }));
    },

    async getComparisonTable(id) {
      const table = await prisma.comparisonTable.findUnique({
        where: { id },
        include: {
          rows: { orderBy: { orderIndex: 'asc' } },
        },
      });
      if (!table) return null;
      return {
        id: table.id,
        name: table.name,
        sourceTab: table.sourceTab,
        description: table.description,
        rows: table.rows.map((r) => ({
          rowLabel: r.rowLabel,
          groupLabel: r.groupLabel,
          columnLabel: r.columnLabel,
          value: r.value === null ? null : Number(r.value),
          valueText: r.valueText,
          unit: r.unit,
          note: r.note,
          orderIndex: r.orderIndex,
        })),
      } satisfies ComparisonTableDetail;
    },
  };
}
