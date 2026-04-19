import type { PrismaClient } from '@prisma/client';
import type {
  GetObservationsDb,
  IndicatorMeta,
  ObservationRow,
} from '../tools/get_observations';
import type { Frequency, IndicatorCategory, Scenario } from '../types';

export function getObservationsAdapter(prisma: PrismaClient): GetObservationsDb {
  return {
    async fetchIndicators(ids) {
      const rows = await prisma.indicator.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          unit: true,
          frequency: true,
          source: true,
          sourceTab: true,
          caveat: true,
          category: true,
          latestObservationDate: true,
          earliestObservationDate: true,
        },
      });
      return rows.map((r): IndicatorMeta => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        frequency: r.frequency as Frequency,
        source: r.source,
        sourceTab: r.sourceTab,
        caveat: r.caveat,
        category: r.category as IndicatorCategory,
        latestObservationDate: toIso(r.latestObservationDate),
        earliestObservationDate: toIso(r.earliestObservationDate),
      }));
    },

    async fetchObservations({ indicatorIds, startDate, endDate, scenario }) {
      const rows = await prisma.observation.findMany({
        where: {
          indicatorId: { in: indicatorIds },
          scenario,
          ...(startDate ? { periodDate: { gte: new Date(`${startDate}T00:00:00Z`) } } : {}),
          ...(endDate
            ? {
                periodDate: {
                  ...(startDate ? { gte: new Date(`${startDate}T00:00:00Z`) } : {}),
                  lte: new Date(`${endDate}T00:00:00Z`),
                },
              }
            : {}),
        },
        select: {
          indicatorId: true,
          periodDate: true,
          periodLabel: true,
          value: true,
          isEstimate: true,
          scenario: true,
        },
        orderBy: { periodDate: 'asc' },
      });
      return rows.map((r): ObservationRow & { indicatorId: string } => ({
        indicatorId: r.indicatorId,
        periodDate: r.periodDate.toISOString().slice(0, 10),
        periodLabel: r.periodLabel,
        value: r.value === null ? null : Number(r.value),
        isEstimate: r.isEstimate,
        scenario: r.scenario as Scenario,
      }));
    },
  };
}

function toIso(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
