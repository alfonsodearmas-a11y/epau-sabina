'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

import type { GdpRow } from '@/lib/types';
import { axisProps } from './axisProps';
import { CustomTooltip } from './CustomTooltip';

export function GdpLineChart({ data }: { data: GdpRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
        <Tooltip
          content={<CustomTooltip unit="percent" />}
          cursor={{ stroke: 'rgba(212,175,55,0.25)' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }}
          iconType="square"
        />
        <Line
          type="monotone"
          dataKey="overall"
          name="Overall real GDP"
          stroke="#D4AF37"
          strokeWidth={1.8}
          dot={{ r: 2.5, fill: '#D4AF37' }}
        />
        <Line
          type="monotone"
          dataKey="nonoil"
          name="Non-oil real GDP"
          stroke="#7AA7D9"
          strokeWidth={1.6}
          dot={{ r: 2.5, fill: '#7AA7D9' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
