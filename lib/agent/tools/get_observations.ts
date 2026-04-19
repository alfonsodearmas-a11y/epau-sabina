import type { Frequency, IndicatorCategory, Point, Scenario, ToolError } from '../types';

export type IndicatorMeta = {
  id: string;
  name: string;
  unit: string;
  frequency: Frequency;
  source: string;
  sourceTab: string;
  caveat: string | null;
  category: IndicatorCategory;
  latestObservationDate: string | null;
  earliestObservationDate: string | null;
};

export type ObservationRow = {
  periodDate: string;
  periodLabel: string;
  value: number | null;
  isEstimate: boolean;
  scenario: Scenario;
};

export interface GetObservationsDb {
  fetchIndicators(ids: string[]): Promise<IndicatorMeta[]>;
  fetchObservations(args: {
    indicatorIds: string[];
    startDate?: string;
    endDate?: string;
    scenario: Scenario;
  }): Promise<Array<ObservationRow & { indicatorId: string }>>;
}

export type GetObservationsInput = {
  indicator_ids: string[];
  start_date?: string;
  end_date?: string;
  scenario?: Scenario;
};

export type SeriesOutput = {
  indicator: IndicatorMeta;
  observations: ObservationRow[];
  notes: string[];
};

export type GetObservationsResult =
  | { series: SeriesOutput[]; missing: Array<{ id: string; reason: 'unknown_id' | 'no_data_in_range' }> }
  | ToolError<'too_many_indicators' | 'empty_input' | 'fetch_failed' | 'invalid_date'>;

const MAX_IDS = 20;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Staleness thresholds (days).
const STALENESS = {
  annual: 13 * 30,        // roughly 13 months
  quarterly: 5 * 30,
  monthly: 4 * 30,
};

export async function getObservations(
  input: GetObservationsInput,
  db: GetObservationsDb,
  now: Date = new Date(),
): Promise<GetObservationsResult> {
  const ids = input.indicator_ids ?? [];
  if (!ids.length) return { error: 'empty_input' };
  if (ids.length > MAX_IDS) return { error: 'too_many_indicators', limit: MAX_IDS };

  for (const d of [input.start_date, input.end_date]) {
    if (d != null && !ISO_DATE.test(d)) return { error: 'invalid_date', detail: d };
  }

  const scenario: Scenario = input.scenario ?? 'actual';

  try {
    const meta = await db.fetchIndicators(ids);
    const metaById = new Map(meta.map((m) => [m.id, m]));
    const unknown = ids.filter((id) => !metaById.has(id));

    const obsRows = meta.length
      ? await db.fetchObservations({
          indicatorIds: meta.map((m) => m.id),
          startDate: input.start_date,
          endDate: input.end_date,
          scenario,
        })
      : [];

    const byId = new Map<string, ObservationRow[]>();
    for (const r of obsRows) {
      const list = byId.get(r.indicatorId) ?? [];
      list.push({
        periodDate: r.periodDate,
        periodLabel: r.periodLabel,
        value: r.value,
        isEstimate: r.isEstimate,
        scenario: r.scenario,
      });
      byId.set(r.indicatorId, list);
    }
    for (const list of byId.values()) list.sort((a, b) => a.periodDate.localeCompare(b.periodDate));

    const series: SeriesOutput[] = [];
    const missing: Array<{ id: string; reason: 'unknown_id' | 'no_data_in_range' }> = [];

    for (const id of unknown) missing.push({ id, reason: 'unknown_id' });

    for (const m of meta) {
      const list = byId.get(m.id) ?? [];
      if (!list.length) {
        missing.push({ id: m.id, reason: 'no_data_in_range' });
        continue;
      }
      series.push({
        indicator: m,
        observations: list,
        notes: buildNotes(m, list, now),
      });
    }

    return { series, missing };
  } catch (err) {
    return { error: 'fetch_failed', detail: err instanceof Error ? err.message : String(err) };
  }
}

function buildNotes(meta: IndicatorMeta, obs: ObservationRow[], now: Date): string[] {
  const notes: string[] = [];

  const nullCount = obs.filter((o) => o.value === null).length;
  if (nullCount > 0) notes.push(`${nullCount} value${nullCount === 1 ? '' : 's'} in range were null`);

  if (meta.latestObservationDate) {
    const latest = new Date(`${meta.latestObservationDate}T00:00:00Z`);
    const daysBehind = Math.floor((now.getTime() - latest.getTime()) / 86400000);
    const threshold = STALENESS[meta.frequency];
    if (daysBehind > threshold) {
      notes.push(`stale: latest observation ${meta.latestObservationDate} is ${daysBehind} days old (threshold ${threshold})`);
    }
  }

  const estimated = obs.filter((o) => o.isEstimate).length;
  if (estimated > 0) notes.push(`${estimated} value${estimated === 1 ? '' : 's'} are estimates`);

  return notes;
}
