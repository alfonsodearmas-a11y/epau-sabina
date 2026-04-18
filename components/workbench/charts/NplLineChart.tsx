'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import type { NplRow } from '@/lib/types';
import { axisProps } from './axisProps';
import { CustomTooltip } from './CustomTooltip';

export function NplLineChart({ data }: { data: NplRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <defs>
          <linearGradient id="g_npl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="q" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          content={<CustomTooltip unit="percent" />}
          cursor={{ stroke: 'rgba(212,175,55,0.25)' }}
        />
        <Area
          type="monotone"
          dataKey="npl"
          name="NPL ratio"
          stroke="#D4AF37"
          strokeWidth={1.8}
          fill="url(#g_npl)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
