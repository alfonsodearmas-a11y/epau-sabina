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

import { fmt } from '@/lib/fmt';
import type { PscRow } from '@/lib/types';
import { axisProps } from './axisProps';
import { CustomTooltip } from './CustomTooltip';

export function PscAreaChart({ data }: { data: PscRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 12, right: 16, bottom: 6, left: 8 }}
        stackOffset="none"
      >
        <defs>
          <linearGradient id="g_biz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="g_mort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7AA7D9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7AA7D9" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="g_hh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B099D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#B099D4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v as number)} />
        <Tooltip
          content={<CustomTooltip unit="G$ millions" />}
          cursor={{ stroke: 'rgba(212,175,55,0.25)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="business"
          stackId="1"
          name="Business enterprises"
          stroke="#D4AF37"
          strokeWidth={1.6}
          fill="url(#g_biz)"
        />
        <Area
          type="monotone"
          dataKey="mortgages"
          stackId="1"
          name="Real estate mortgages"
          stroke="#7AA7D9"
          strokeWidth={1.4}
          fill="url(#g_mort)"
        />
        <Area
          type="monotone"
          dataKey="households"
          stackId="1"
          name="Households"
          stroke="#B099D4"
          strokeWidth={1.4}
          fill="url(#g_hh)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
