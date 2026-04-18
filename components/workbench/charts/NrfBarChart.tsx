'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { fmt } from '@/lib/fmt';
import type { NrfRow } from '@/lib/types';
import { axisProps } from './axisProps';
import { CustomTooltip } from './CustomTooltip';

export function NrfBarChart({ data }: { data: NrfRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 12, right: 16, bottom: 6, left: 8 }}
        barCategoryGap={24}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v as number)} />
        <Tooltip
          content={<CustomTooltip unit="US$ millions" />}
          cursor={{ fill: 'rgba(212,175,55,0.06)' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }}
          iconType="square"
        />
        <Bar dataKey="actual" name="Actual" fill="#D4AF37" radius={[2, 2, 0, 0]} />
        <Bar dataKey="budget" name="Budget" fill="#7AA7D9" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
