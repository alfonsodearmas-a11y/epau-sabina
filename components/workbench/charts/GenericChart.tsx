'use client';

// Flexible chart that renders area / line / bar from a generic
// rows-of-objects dataset keyed by an xKey with one series per indicator.
// All series colors are passed in; axes use the shared axisProps.

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

import { fmt } from '@/lib/fmt';

import { axisProps } from './axisProps';
import { CustomTooltip } from './CustomTooltip';

export interface SeriesDef {
  key: string;   // object key in each data row
  name: string;  // display name
  color: string;
  unit?: string;
}

export interface GenericChartProps {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  series: SeriesDef[];
  chartType: 'area' | 'line' | 'bar';
  unit?: string;
  percent?: boolean;
  stacked?: boolean;
}

export function GenericChart({ data, xKey, series, chartType, unit, percent, stacked }: GenericChartProps) {
  const yFormatter = percent ? ((v: number) => `${v}%`) : ((v: number) => fmt.nc(v));
  const tooltipUnit = percent ? 'percent' : (unit ?? '');
  const showNegZero = series.some((s) => data.some((row) => typeof row[s.key] === 'number' && (row[s.key] as number) < 0));

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }} barCategoryGap={24}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} tickFormatter={yFormatter} />
          {showNegZero ? <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" /> : null}
          <Tooltip content={<CustomTooltip unit={tooltipUnit} />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
          {series.length > 1 ? (
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
          ) : null}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} tickFormatter={yFormatter} />
          {showNegZero ? <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" /> : null}
          <Tooltip content={<CustomTooltip unit={tooltipUnit} />} cursor={{ stroke: 'rgba(212,175,55,0.25)' }} />
          {series.length > 1 ? (
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
          ) : null}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={1.6}
              dot={{ r: 2.5, fill: s.color }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Area (default)
  const gradId = (key: string) => `g_${key.replace(/[^a-z0-9]/gi, '_')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={gradId(s.key)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={series.length === 1 ? 0.6 : 0.85} />
              <stop offset="100%" stopColor={s.color} stopOpacity={series.length === 1 ? 0.02 : 0.15} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={yFormatter} />
        {showNegZero ? <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" /> : null}
        <Tooltip content={<CustomTooltip unit={tooltipUnit} />} cursor={{ stroke: 'rgba(212,175,55,0.25)', strokeWidth: 1 }} />
        {series.length > 1 ? (
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
        ) : null}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? '1' : undefined}
            stroke={s.color}
            strokeWidth={1.6}
            fill={`url(#${gradId(s.key)})`}
            connectNulls={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
