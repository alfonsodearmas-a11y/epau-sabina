// Build a workbench "spec" (headline, indicators, caveats, data, chart) from
// live API data: a list of Indicator metadata plus their observations.
//
// Shape design notes:
// - The x-axis key is always "period" — periodLabel from the store.
// - Each indicator contributes one series keyed by its id (slugified for dom ids
//   where needed). Row values are keyed by indicator id.
// - Chart type defaults to "line" for percent-ish series and "area" for level
//   series; the caller can override from the interpreter result.
// - The headline uses the first indicator's most recent non-null value and a
//   YoY delta if both this-period and prior-period values exist.

import type { Indicator } from './types';
import type { Observation } from './api';
import type { DynamicSpec, DynamicHeadline } from '@/components/workbench/dynamic-spec';

const PALETTE = [
  '#D4AF37', // gold
  '#7AA7D9', // cool blue
  '#B099D4', // soft purple
  '#7FC29B', // muted green
  '#C8A87F', // warm tan
  '#E0A050', // amber
  '#C89878', // terracotta
  '#E06C6C', // red
  '#A9C5E3', // pale blue
  '#EFC9B6', // peach
] as const;

const PERCENT_UNIT_RE = /^(percent|%)$|percent$/i;

export interface BuildSpecInput {
  query: string;
  indicators: Indicator[];              // metadata from /api/indicators
  observations: Observation[];          // flat series for all ids
  chartType?: 'area' | 'line' | 'bar' | 'table';
  commentary?: string | null;
  title?: string;
}

export function buildDynamicSpec(input: BuildSpecInput): DynamicSpec {
  const ids = input.indicators.map((i) => i.id);
  const byId = new Map(input.indicators.map((i) => [i.id, i]));
  // Choose x-axis ordering: collect all period labels that appear, then sort
  // by periodDate for determinism. Labels with the same periodDate share a row.
  const periodMap = new Map<string, { label: string; date: string }>();
  for (const o of input.observations) {
    if (!periodMap.has(o.periodDate)) {
      periodMap.set(o.periodDate, { label: o.periodLabel, date: o.periodDate });
    }
  }
  const periods = Array.from(periodMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Build rows: each row is keyed by indicator id (legal chars: /[a-z0-9_]/)
  const rows = periods.map((p) => {
    const row: Record<string, string | number | null> = { period: p.label, period_date: p.date };
    for (const id of ids) row[id] = null;
    return row;
  });
  const indexByLabel = new Map(periods.map((p, i) => [p.date, i]));
  for (const o of input.observations) {
    const idx = indexByLabel.get(o.periodDate);
    if (idx === undefined) continue;
    const row = rows[idx];
    if (!row) continue;
    // Only use 'actual' scenario for the main chart series. Budget/revised/
    // projection are surfaced separately (headline deltas, table only) so we
    // do not double-plot.
    if (o.scenario && o.scenario !== 'actual') continue;
    row[o.indicatorId] = o.value;
  }

  // Decide chart type
  const allPercent = input.indicators.every((ind) => PERCENT_UNIT_RE.test(ind.unit));
  const chartType = input.chartType === 'table' ? 'area' : (input.chartType ?? (allPercent ? 'line' : 'area'));
  const tableMode = input.chartType === 'table';

  // Series with palette colors
  const series = input.indicators.map((ind, i) => ({
    key: ind.id,
    name: ind.name,
    color: PALETTE[i % PALETTE.length] ?? '#D4AF37',
    unit: ind.unit,
  }));

  // Build headline from the first indicator
  const headline = computeHeadline(input.indicators[0], input.observations);

  // Caveats: de-duplicate by text
  const seen = new Set<string>();
  const caveats: DynamicSpec['caveats'] = [];
  for (const ind of input.indicators) {
    if (!ind.caveat) continue;
    if (seen.has(ind.caveat)) continue;
    seen.add(ind.caveat);
    caveats.push({ level: 'warn', text: ind.caveat });
  }

  // Subtitle: units + period range
  const indexUnits = Array.from(new Set(input.indicators.map((i) => i.unit)));
  const subtitleUnit = indexUnits.length === 1 ? indexUnits[0] : 'varied units';
  const firstLabel = periods[0]?.label ?? '';
  const lastLabel = periods[periods.length - 1]?.label ?? '';
  const rangeLabel = firstLabel && lastLabel ? `${firstLabel} to ${lastLabel}` : 'available history';

  // Title: prefer explicit input, else derive from indicator names
  const title = input.title ?? (input.indicators.length === 1
    ? input.indicators[0]!.name
    : `${input.indicators[0]!.name} and ${input.indicators.length - 1} other${input.indicators.length === 2 ? '' : 's'}`);

  return {
    title,
    subtitle: `${subtitleUnit}, ${rangeLabel}`,
    indicators: input.indicators.map((ind, i) => ({
      id: ind.id,
      name: ind.name,
      unit: ind.unit,
      source: ind.source,
      sheet: ind.sheet ?? (byId.get(ind.id)?.sheet ?? ''),
      color: PALETTE[i % PALETTE.length] ?? '#D4AF37',
      caveat: ind.caveat ?? null,
    })),
    caveats,
    headline,
    data: rows,
    series,
    xKey: 'period',
    chartType,
    tableMode,
    table: ['period', ...ids],
    tableLabels: {
      period: 'Period',
      ...Object.fromEntries(ids.map((id, i) => [id, series[i]!.name])),
    },
    observationCount: input.observations.filter((o) => o.value !== null).length,
    percent: allPercent,
    commentary: input.commentary ?? null,
  };
}

function computeHeadline(ind: Indicator | undefined, observations: Observation[]): DynamicHeadline {
  if (!ind) return { label: '', value: '—', unit: '', delta: '', deltaLabel: '' };
  const relevant = observations
    .filter((o) => o.indicatorId === ind.id && o.value !== null && (o.scenario ?? 'actual') === 'actual')
    .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  const last = relevant[relevant.length - 1];
  const prior = relevant[relevant.length - 2];
  if (!last) return { label: ind.name, value: '—', unit: ind.unit, delta: '', deltaLabel: '' };
  const value = last.value ?? 0;
  const percent = PERCENT_UNIT_RE.test(ind.unit);
  const format = (v: number) => percent ? v.toFixed(1) : v.toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : 2 });
  let delta = '';
  let deltaLabel = '';
  if (prior && prior.value !== null && prior.value !== 0) {
    if (percent) {
      const pp = value - prior.value;
      const sign = pp >= 0 ? '+' : '';
      delta = `${sign}${pp.toFixed(1)}pp`;
      deltaLabel = `vs. ${prior.periodLabel}`;
    } else {
      const pct = ((value - prior.value) / prior.value) * 100;
      const sign = pct >= 0 ? '+' : '';
      delta = `${sign}${pct.toFixed(1)}%`;
      deltaLabel = `vs. ${prior.periodLabel}`;
    }
  }
  const formatted = value < 0 ? `(${format(Math.abs(value))})` : format(value);
  return {
    label: last.periodLabel,
    value: formatted,
    unit: ind.unit,
    delta,
    deltaLabel,
  };
}
