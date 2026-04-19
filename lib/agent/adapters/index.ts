import type { PrismaClient } from '@prisma/client';
import { compute } from '../tools/compute';
import { flagUnavailable } from '../tools/flag_unavailable';
import {
  getComparisonTable,
  listComparisonTables,
} from '../tools/comparison_tables';
import { getObservations } from '../tools/get_observations';
import { getSavedView, listSavedViews } from '../tools/saved_views';
import { renderChart, renderCommentary, renderTable, type CommentaryComposer } from '../tools/render';
import { searchCatalog } from '../tools/search_catalog';
import { comparisonTablesAdapter } from './comparison_tables';
import { getObservationsAdapter } from './get_observations';
import { savedViewsAdapter } from './saved_views';
import { searchCatalogAdapter } from './search_catalog';

export type ToolExecutor = (input: unknown) => Promise<unknown>;
export type ToolRegistry = Record<string, ToolExecutor>;

export function buildToolRegistry(
  prisma: PrismaClient,
  requesterEmail: string,
  composer: CommentaryComposer,
): ToolRegistry {
  const searchDb = searchCatalogAdapter(prisma);
  const obsDb = getObservationsAdapter(prisma);
  const ctDb = comparisonTablesAdapter(prisma);
  const svDb = savedViewsAdapter(prisma);

  return {
    search_catalog: (input) => searchCatalog(input as Parameters<typeof searchCatalog>[0], searchDb),
    get_observations: (input) => getObservations(input as Parameters<typeof getObservations>[0], obsDb),
    compute: async (input) => compute(input as Parameters<typeof compute>[0]),
    list_comparison_tables: (input) => listComparisonTables(input as Parameters<typeof listComparisonTables>[0], ctDb),
    get_comparison_table: (input) => getComparisonTable(input as Parameters<typeof getComparisonTable>[0], ctDb),
    list_saved_views: (input) => listSavedViews(input as Parameters<typeof listSavedViews>[0], svDb),
    get_saved_view: (input) => {
      const i = input as Parameters<typeof getSavedView>[0];
      return getSavedView({ ...i, requester_email: i.requester_email ?? requesterEmail }, svDb);
    },
    render_chart: async (input) => renderChart(input as Parameters<typeof renderChart>[0]),
    render_table: async (input) => renderTable(input as Parameters<typeof renderTable>[0]),
    render_commentary: async (input) => renderCommentary(
      input as Parameters<typeof renderCommentary>[0],
      composer,
    ),
    flag_unavailable: async (input) => flagUnavailable(input as Parameters<typeof flagUnavailable>[0]),
  };
}
