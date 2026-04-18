// An IngestSink persists parsed records. Two implementations:
//   - JsonSink  — writes everything to ./scripts/ingest/output/*.json for dry-run review
//   - DbSink    — upserts into Supabase/Postgres via Prisma (used when DATABASE_URL is set)
//
// The runner picks JsonSink by default and DbSink when `--live` is passed AND DATABASE_URL is present.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IngestContext, Issue } from './types';

export interface IngestSink {
  mode: 'dry' | 'live';
  flush(ctx: IngestContext, issues: Issue[], runMeta: RunMeta): Promise<RunSummary>;
}

export interface RunMeta {
  startedAt: string;
  finishedAt: string;
  workbookFilename: string;
  workbookSizeBytes: number;
}

export interface RunSummary {
  runId: string;
  indicatorsUpserted: number;
  observationsUpserted: number;
  comparisonTablesUpserted: number;
  issuesCount: number;
  status: 'succeeded' | 'failed';
  outputDir?: string;
}

export function makeJsonSink(outputDir: string): IngestSink {
  return {
    mode: 'dry',
    async flush(ctx, issues, runMeta) {
      mkdirSync(outputDir, { recursive: true });
      const runId = `dry-${runMeta.startedAt.replace(/[:.]/g, '-')}`;
      const indicators = Array.from(ctx.indicators.values());
      const snapshots = ctx.snapshots;
      writeFileSync(join(outputDir, 'run.json'), JSON.stringify({ runId, ...runMeta, indicatorsCount: indicators.length, observationsCount: ctx.observations.length, comparisonTablesCount: ctx.comparisonTables.length, issuesCount: issues.length }, null, 2));
      writeFileSync(join(outputDir, 'indicators.json'), JSON.stringify(indicators, null, 2));
      writeFileSync(join(outputDir, 'observations.json'), JSON.stringify(ctx.observations));
      writeFileSync(join(outputDir, 'comparison_tables.json'), JSON.stringify(ctx.comparisonTables, null, 2));
      writeFileSync(join(outputDir, 'issues.json'), JSON.stringify(issues, null, 2));
      writeFileSync(join(outputDir, 'caveats.json'), JSON.stringify(Object.fromEntries(ctx.caveats), null, 2));
      // Snapshots are large; write one-per-sheet under ./snapshots/
      const snapDir = join(outputDir, 'snapshots');
      mkdirSync(snapDir, { recursive: true });
      for (const s of snapshots) {
        writeFileSync(join(snapDir, `${s.sheetName.replace(/[^a-z0-9]+/gi, '_')}.json`), JSON.stringify(s));
      }
      return {
        runId,
        indicatorsUpserted: indicators.length,
        observationsUpserted: ctx.observations.length,
        comparisonTablesUpserted: ctx.comparisonTables.length,
        issuesCount: issues.length,
        status: 'succeeded',
        outputDir,
      };
    },
  };
}

export async function makeDbSink(): Promise<IngestSink> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  return {
    mode: 'live',
    async flush(ctx, issues, runMeta) {
      const run = await prisma.ingestionRun.create({
        data: {
          workbookFilename: runMeta.workbookFilename,
          workbookSizeBytes: BigInt(runMeta.workbookSizeBytes),
          status: 'running',
          startedAt: new Date(runMeta.startedAt),
        },
      });
      try {
        // Indicators
        let indicatorsUpserted = 0;
        for (const ind of ctx.indicators.values()) {
          await prisma.indicator.upsert({
            where: { id: ind.id },
            update: {
              name: ind.name,
              category: ind.category,
              subcategory: ind.subcategory ?? null,
              unit: ind.unit,
              frequency: ind.frequency,
              source: ind.source,
              sourceTab: ind.sourceTab,
              caveat: ind.caveat ?? null,
              lastIngestedAt: new Date(),
            },
            create: {
              id: ind.id,
              name: ind.name,
              category: ind.category,
              subcategory: ind.subcategory ?? null,
              unit: ind.unit,
              frequency: ind.frequency,
              source: ind.source,
              sourceTab: ind.sourceTab,
              caveat: ind.caveat ?? null,
              lastIngestedAt: new Date(),
            },
          });
          indicatorsUpserted++;
        }
        // Observations — batch upsert via createMany + onConflict surrogate: delete-then-insert per indicator
        let observationsUpserted = 0;
        const byIndicator = new Map<string, typeof ctx.observations>();
        for (const o of ctx.observations) {
          const list = byIndicator.get(o.indicatorId) ?? [];
          list.push(o);
          byIndicator.set(o.indicatorId, list);
        }
        for (const [id, obs] of byIndicator) {
          await prisma.observation.deleteMany({ where: { indicatorId: id } });
          await prisma.observation.createMany({
            data: obs.map((o) => ({
              indicatorId: o.indicatorId,
              periodDate: new Date(o.periodDate),
              periodLabel: o.periodLabel,
              value: o.value === null ? null : (o.value as unknown as never),
              isEstimate: o.isEstimate ?? false,
              scenario: o.scenario ?? 'actual',
            })),
            skipDuplicates: true,
          });
          observationsUpserted += obs.length;
          // Update earliest/latest observation dates
          const dates = obs.map((o) => o.periodDate).sort();
          await prisma.indicator.update({
            where: { id },
            data: {
              earliestObservationDate: new Date(dates[0]!),
              latestObservationDate: new Date(dates[dates.length - 1]!),
            },
          });
        }
        // Comparison tables
        let comparisonTablesUpserted = 0;
        for (const t of ctx.comparisonTables) {
          await prisma.comparisonTable.upsert({
            where: { id: t.id },
            update: {
              name: t.name,
              category: t.category ?? null,
              source: t.source ?? null,
              sourceTab: t.sourceTab,
              description: t.description ?? null,
              metadata: (t.metadata ?? null) as never,
            },
            create: {
              id: t.id,
              name: t.name,
              category: t.category ?? null,
              source: t.source ?? null,
              sourceTab: t.sourceTab,
              description: t.description ?? null,
              metadata: (t.metadata ?? null) as never,
            },
          });
          await prisma.comparisonTableRow.deleteMany({ where: { tableId: t.id } });
          if (t.rows.length) {
            await prisma.comparisonTableRow.createMany({
              data: t.rows.map((r) => ({
                tableId: t.id,
                rowLabel: r.rowLabel,
                groupLabel: r.groupLabel ?? null,
                columnLabel: r.columnLabel,
                value: r.value === null || r.value === undefined ? null : (r.value as unknown as never),
                valueText: r.valueText ?? null,
                unit: r.unit ?? null,
                note: r.note ?? null,
                orderIndex: r.orderIndex,
              })),
            });
          }
          comparisonTablesUpserted++;
        }
        // Raw snapshots
        for (const s of ctx.snapshots) {
          await prisma.rawSheetSnapshot.upsert({
            where: { runId_sheetName: { runId: run.id, sheetName: s.sheetName } },
            update: { rowCount: s.rowCount, colCount: s.colCount, cells: s.cells as never },
            create: { runId: run.id, sheetName: s.sheetName, rowCount: s.rowCount, colCount: s.colCount, cells: s.cells as never },
          });
        }
        // Issues
        for (const i of issues) {
          await prisma.ingestionIssue.create({
            data: {
              runId: run.id,
              sheet: i.sheet,
              row: i.row ?? null,
              col: i.col ?? null,
              cellRef: i.cellRef ?? null,
              rawValue: i.rawValue ?? null,
              reason: i.reason,
              severity: i.severity,
            },
          });
        }
        await prisma.ingestionRun.update({
          where: { id: run.id },
          data: {
            finishedAt: new Date(runMeta.finishedAt),
            indicatorsUpserted,
            observationsUpserted,
            comparisonTablesUpserted,
            issuesCount: issues.length,
            status: 'succeeded',
          },
        });
        return {
          runId: run.id,
          indicatorsUpserted,
          observationsUpserted,
          comparisonTablesUpserted,
          issuesCount: issues.length,
          status: 'succeeded',
        };
      } catch (e) {
        await prisma.ingestionRun.update({
          where: { id: run.id },
          data: { status: 'failed', finishedAt: new Date(), notes: (e as Error).message },
        });
        throw e;
      } finally {
        await prisma.$disconnect();
      }
    },
  };
}
