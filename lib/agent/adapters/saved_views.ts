import type { PrismaClient } from '@prisma/client';
import { isAllowed } from '@/lib/auth';
import type {
  SavedViewDetail,
  SavedViewSummary,
  SavedViewsDb,
} from '../tools/saved_views';

export function savedViewsAdapter(prisma: PrismaClient): SavedViewsDb {
  return {
    async listSavedViews({ userEmail, limit }) {
      const rows = await prisma.savedQuery.findMany({
        where: { userEmail },
        orderBy: { lastRunAt: 'desc' },
        take: limit,
      });
      return rows.map((r): SavedViewSummary => ({
        id: r.id,
        name: r.name,
        queryText: r.queryText,
        indicatorIds: r.indicatorIds,
        lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }));
    },

    async getSavedView(id) {
      const r = await prisma.savedQuery.findUnique({ where: { id } });
      if (!r) return null;
      return {
        id: r.id,
        name: r.name,
        queryText: r.queryText,
        indicatorIds: r.indicatorIds,
        lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        config: r.config,
        ownerEmail: r.userEmail,
      } satisfies SavedViewDetail;
    },

    async isEmailAllowed(email) {
      return isAllowed(email);
    },
  };
}
