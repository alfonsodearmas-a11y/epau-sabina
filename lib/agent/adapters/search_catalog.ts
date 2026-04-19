import type { PrismaClient } from '@prisma/client';
import type {
  ComparisonTableRow,
  IndicatorRow,
  SearchCatalogDb,
} from '../tools/search_catalog';
import type { Frequency, IndicatorCategory } from '../types';

type IndicatorSqlRow = {
  id: string;
  name: string;
  category: IndicatorCategory;
  subcategory: string | null;
  unit: string;
  frequency: Frequency;
  source: string;
  caveat: string | null;
  earliest_period: Date | null;
  latest_period: Date | null;
  score: number;
};

type ComparisonTableSqlRow = {
  id: string;
  name: string;
  category: IndicatorCategory | null;
  source: string | null;
  source_tab: string;
  description: string | null;
  row_count: bigint;
  score: number;
};

const MIN_TRIGRAM_SCORE = 0.2;

export function searchCatalogAdapter(prisma: PrismaClient): SearchCatalogDb {
  return {
    async searchIndicators({ query, category, limit }) {
      const rows = await prisma.$queryRaw<IndicatorSqlRow[]>`
        SELECT
          id, name, category, subcategory, unit, frequency, source, caveat,
          earliest_observation_date AS earliest_period,
          latest_observation_date AS latest_period,
          GREATEST(
            COALESCE(ts_rank_cd(search_tsv, websearch_to_tsquery('english', ${query})), 0),
            similarity(id, ${query}),
            similarity(name, ${query})
          )::float8 AS score
        FROM indicators
        WHERE (
          search_tsv @@ websearch_to_tsquery('english', ${query})
          OR similarity(id, ${query}) > ${MIN_TRIGRAM_SCORE}
          OR similarity(name, ${query}) > ${MIN_TRIGRAM_SCORE}
        )
        AND (${category}::"IndicatorCategory" IS NULL OR category = ${category}::"IndicatorCategory")
        ORDER BY score DESC
        LIMIT ${limit}
      `;
      return rows.map(toIndicatorRow);
    },

    async searchComparisonTables({ query, category, limit }) {
      const rows = await prisma.$queryRaw<ComparisonTableSqlRow[]>`
        SELECT
          ct.id, ct.name, ct.category, ct.source, ct.source_tab, ct.description,
          (SELECT COUNT(*) FROM comparison_table_rows r WHERE r.table_id = ct.id) AS row_count,
          GREATEST(
            COALESCE(ts_rank_cd(ct.search_tsv, websearch_to_tsquery('english', ${query})), 0),
            similarity(ct.id, ${query}),
            similarity(ct.name, ${query})
          )::float8 AS score
        FROM comparison_tables ct
        WHERE (
          ct.search_tsv @@ websearch_to_tsquery('english', ${query})
          OR similarity(ct.id, ${query}) > ${MIN_TRIGRAM_SCORE}
          OR similarity(ct.name, ${query}) > ${MIN_TRIGRAM_SCORE}
        )
        AND (${category}::"IndicatorCategory" IS NULL OR ct.category = ${category}::"IndicatorCategory")
        ORDER BY score DESC
        LIMIT ${limit}
      `;
      return rows.map(toComparisonTableRow);
    },
  };
}

function toIndicatorRow(r: IndicatorSqlRow): IndicatorRow {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory,
    unit: r.unit,
    frequency: r.frequency,
    source: r.source,
    caveat: r.caveat,
    earliestPeriod: r.earliest_period ? r.earliest_period.toISOString().slice(0, 10) : null,
    latestPeriod: r.latest_period ? r.latest_period.toISOString().slice(0, 10) : null,
    score: r.score,
  };
}

function toComparisonTableRow(r: ComparisonTableSqlRow): ComparisonTableRow {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    source: r.source,
    sourceTab: r.source_tab,
    description: r.description,
    rowCount: Number(r.row_count),
    score: r.score,
  };
}
