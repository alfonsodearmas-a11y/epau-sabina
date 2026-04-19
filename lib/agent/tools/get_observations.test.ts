import { describe, expect, it } from 'vitest';
import { getObservations, type GetObservationsDb, type IndicatorMeta, type ObservationRow } from './get_observations';
import { isToolError } from '../types';

const meta = (id: string, overrides: Partial<IndicatorMeta> = {}): IndicatorMeta => ({
  id,
  name: id.replace(/_/g, ' '),
  unit: 'percent',
  frequency: 'annual',
  source: 'Bureau of Statistics',
  sourceTab: 'Inflation_Historical',
  caveat: null,
  category: 'prices',
  latestObservationDate: '2023-12-31',
  earliestObservationDate: '1970-12-31',
  ...overrides,
});

const obs = (indicatorId: string, periodDate: string, value: number | null, extras: Partial<ObservationRow> = {}) => ({
  indicatorId,
  periodDate,
  periodLabel: periodDate.slice(0, 4),
  value,
  isEstimate: extras.isEstimate ?? false,
  scenario: extras.scenario ?? ('actual' as const),
});

function makeDb(metas: IndicatorMeta[], rows: Array<ObservationRow & { indicatorId: string }>): GetObservationsDb {
  return {
    async fetchIndicators(ids) {
      return metas.filter((m) => ids.includes(m.id));
    },
    async fetchObservations({ indicatorIds, startDate, endDate }) {
      return rows.filter(
        (r) =>
          indicatorIds.includes(r.indicatorId) &&
          (!startDate || r.periodDate >= startDate) &&
          (!endDate || r.periodDate <= endDate),
      );
    },
  };
}

describe('get_observations', () => {
  it('happy path: returns series with metadata, observations sorted, and missing empty', async () => {
    const db = makeDb(
      [meta('inflation_12month')],
      [
        obs('inflation_12month', '2023-12-31', 2.0),
        obs('inflation_12month', '2022-12-31', 7.2),
        obs('inflation_12month', '2021-12-31', 5.1),
      ],
    );
    const res = await getObservations(
      { indicator_ids: ['inflation_12month'], start_date: '2021-01-01', end_date: '2023-12-31' },
      db,
      new Date('2024-01-15T00:00:00Z'),
    );
    if (isToolError(res)) throw new Error('expected series');
    expect(res.series).toHaveLength(1);
    expect(res.series[0].observations.map((o) => o.periodDate)).toEqual([
      '2021-12-31',
      '2022-12-31',
      '2023-12-31',
    ]);
    expect(res.missing).toEqual([]);
  });

  it('failure: too many indicator ids is rejected', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => `ind_${i}`);
    const res = await getObservations({ indicator_ids: ids }, makeDb([], []));
    expect(isToolError(res)).toBe(true);
    if (isToolError(res)) expect(res.error).toBe('too_many_indicators');
  });

  it('failure: invalid date returns invalid_date without touching DB', async () => {
    let called = false;
    const db: GetObservationsDb = {
      async fetchIndicators() { called = true; return []; },
      async fetchObservations() { called = true; return []; },
    };
    const res = await getObservations({ indicator_ids: ['a'], start_date: '2023/01/01' }, db);
    expect(isToolError(res)).toBe(true);
    if (isToolError(res)) expect(res.error).toBe('invalid_date');
    expect(called).toBe(false);
  });

  it('edge: unknown ids and empty-range ids appear in missing with distinct reasons', async () => {
    const db = makeDb(
      [meta('inflation_12month'), meta('gdp_overall')],
      [obs('inflation_12month', '2023-12-31', 2.0)],
    );
    const res = await getObservations(
      { indicator_ids: ['inflation_12month', 'gdp_overall', 'does_not_exist'] },
      db,
      new Date('2024-01-15T00:00:00Z'),
    );
    if (isToolError(res)) throw new Error('expected series');
    expect(res.series.map((s) => s.indicator.id)).toEqual(['inflation_12month']);
    expect(res.missing).toEqual(
      expect.arrayContaining([
        { id: 'does_not_exist', reason: 'unknown_id' },
        { id: 'gdp_overall', reason: 'no_data_in_range' },
      ]),
    );
  });

  it('edge: staleness note is added when latest observation is past the threshold', async () => {
    const db = makeDb(
      [meta('inflation_12month', { frequency: 'annual', latestObservationDate: '2020-12-31' })],
      [obs('inflation_12month', '2020-12-31', 0.7)],
    );
    const res = await getObservations({ indicator_ids: ['inflation_12month'] }, db, new Date('2024-01-15T00:00:00Z'));
    if (isToolError(res)) throw new Error('expected series');
    expect(res.series[0].notes.some((n) => n.startsWith('stale:'))).toBe(true);
  });

  it('edge: null values in observations surface a notes entry', async () => {
    const db = makeDb(
      [meta('inflation_12month')],
      [obs('inflation_12month', '2023-12-31', null), obs('inflation_12month', '2022-12-31', 7.2)],
    );
    const res = await getObservations({ indicator_ids: ['inflation_12month'] }, db, new Date('2024-01-15T00:00:00Z'));
    if (isToolError(res)) throw new Error('expected series');
    expect(res.series[0].notes.some((n) => n.includes('null'))).toBe(true);
  });
});
