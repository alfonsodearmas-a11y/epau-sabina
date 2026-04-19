'use client';

import { useMemo } from 'react';
import { GenericChart, type SeriesDef } from '@/components/workbench/charts/GenericChart';

const SERIES_COLORS = ['#D4AF37', '#7AA7D9', '#7FC29B', '#C89878', '#B099D4', '#EFC9B6'];

type ChartObservation = { periodDate: string; value: number | null };

type ChartPayloadSeries = {
  indicator_id: string;
  label?: string;
  unit: string;
  observations: ChartObservation[];
};

type ChartPayload = {
  chart_type: 'area' | 'line' | 'bar' | 'bar-paired' | 'dual' | 'indexed';
  title: string;
  subtitle?: string;
  caveat?: string;
  y_format?: 'number' | 'percent' | 'currency_gyd' | 'currency_usd';
  series: ChartPayloadSeries[];
};

export function ChartCard({ payload }: { payload: ChartPayload }) {
  const { rows, seriesDefs, baseChartType } = useMemo(() => {
    const periods = new Set<string>();
    for (const s of payload.series) for (const o of s.observations) periods.add(o.periodDate);
    const ordered = Array.from(periods).sort();

    const seriesDefs: SeriesDef[] = payload.series.map((s, i) => ({
      key: s.indicator_id,
      name: s.label ?? s.indicator_id,
      color: SERIES_COLORS[i % SERIES_COLORS.length]!,
      unit: s.unit,
    }));

    const rows = ordered.map((period) => {
      const row: Record<string, string | number | null> = { period: period.slice(0, 4) };
      for (const s of payload.series) {
        const hit = s.observations.find((o) => o.periodDate === period);
        row[s.indicator_id] = hit?.value ?? null;
      }
      return row;
    });

    const requested = payload.chart_type;
    const baseChartType: 'area' | 'line' | 'bar' =
      requested === 'line' || requested === 'bar' ? requested :
      requested === 'bar-paired' ? 'bar' :
      'area';

    return { rows, seriesDefs, baseChartType };
  }, [payload]);

  const percent = payload.y_format === 'percent';

  return (
    <div className="glass rounded-md overflow-hidden" role="figure" aria-label={payload.title}>
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-3 border-b border-white/5">
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium text-text-primary truncate">{payload.title}</h3>
          {payload.subtitle ? (
            <div className="text-[11px] text-text-tertiary mt-0.5 truncate">{payload.subtitle}</div>
          ) : null}
        </div>
      </div>
      <div className="h-56 px-1 py-2">
        <GenericChart
          data={rows}
          xKey="period"
          series={seriesDefs}
          chartType={baseChartType}
          percent={percent}
        />
      </div>
      {payload.caveat ? (
        <div className="px-3 py-2 text-[11px] text-text-tertiary border-t border-white/5 bg-white/[0.015]">
          {payload.caveat}
        </div>
      ) : null}
    </div>
  );
}
