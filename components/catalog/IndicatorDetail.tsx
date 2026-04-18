'use client';

// Slide-out drawer shown when an indicator is selected in the catalog.
// Includes a tiny synthetic preview chart, metadata table and caveat.
// Ported from docs/design/surfaces.jsx.

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';

import { fmt } from '@/lib/fmt';
import type { Indicator } from '@/lib/types';

import { CategoryPill, FreqPill, Pill } from '@/components/ui/Pill';
import { Divider } from '@/components/ui/Divider';
import { KeyCap } from '@/components/ui/KeyCap';
import { CloseIcon, WarnIcon, ChevIcon } from '@/components/icons';

export interface IndicatorDetailProps {
  indicator: Indicator;
  onClose: () => void;
}

function queryForIndicator(ind: Indicator): string {
  if (ind.id === 'nrf_inflows_actual')
    return 'NRF inflows actual vs budget 2020 to 2026';
  if (ind.id.startsWith('psc_'))
    return 'private sector credit by sector since 2015';
  if (ind.id === 'gdp_real_growth' || ind.id === 'gdp_nonoil_growth')
    return 'real GDP overall vs non-oil since 2017';
  if (ind.id === 'npl_ratio') return 'NPL ratio quarterly since 2017';
  return ind.name.toLowerCase();
}

export function IndicatorDetail({ indicator, onClose }: IndicatorDetailProps) {
  const router = useRouter();

  const preview = useMemo(() => {
    const out: Array<{ year: string; v: number }> = [];
    let base = 100;
    for (let y = 2015; y <= 2026; y++) {
      base *= 1 + (0.04 + Math.sin(y * 1.3) * 0.05);
      out.push({ year: String(y), v: Math.round(base) });
    }
    return out;
  }, [indicator.id]);

  const openInWorkbench = () => {
    router.push(`/workbench?q=${encodeURIComponent(queryForIndicator(indicator))}`);
  };

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute top-0 right-0 bottom-0 w-[520px] slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full glass-strong border-l border-white/10 flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CategoryPill category={indicator.category} />
                <FreqPill frequency={indicator.frequency} />
                {indicator.caveat ? (
                  <Pill tone="warn">
                    <WarnIcon className="w-3 h-3" /> caveat
                  </Pill>
                ) : null}
              </div>
              <h2 className="font-serif text-[24px] leading-[1.15] text-text-primary mt-2">
                {indicator.name}
              </h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">
                {indicator.source}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/10 text-text-tertiary hover:text-text-primary flex items-center justify-center"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <Divider />
          <div className="flex-1 overflow-y-auto scroll-thin">
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
                Preview
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={preview}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="g_prev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                        <stop
                          offset="100%"
                          stopColor="#D4AF37"
                          stopOpacity="0.02"
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#8A8778', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#8A8778', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                      tickLine={false}
                      tickFormatter={(v) => fmt.nc(v as number)}
                      width={40}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#D4AF37"
                      strokeWidth={1.4}
                      fill="url(#g_prev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <Divider />
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
                Metadata
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 gap-x-4 text-[12px]">
                <dt className="text-text-tertiary">Unit</dt>
                <dd className="text-text-primary">{indicator.unit}</dd>
                <dt className="text-text-tertiary">Frequency</dt>
                <dd className="text-text-primary">{indicator.frequency}</dd>
                <dt className="text-text-tertiary">Source</dt>
                <dd className="text-text-primary">{indicator.source}</dd>
                <dt className="text-text-tertiary">Sheet</dt>
                <dd className="text-text-primary font-mono text-[11.5px]">
                  {indicator.sheet}
                </dd>
                <dt className="text-text-tertiary">Latest obs</dt>
                <dd className="text-text-primary num">{indicator.latest}</dd>
                <dt className="text-text-tertiary">Ingested</dt>
                <dd className="text-text-primary num">
                  Mar 17, 2026 at 09:14 GYT
                </dd>
              </dl>
            </div>
            {indicator.caveat ? (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <WarnIcon className="w-3.5 h-3.5 text-[#E0A050]" />
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">
                      Caveat
                    </span>
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-snug">
                    {indicator.caveat}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between">
            <div className="text-[11px] text-text-tertiary">
              Press <KeyCap>Esc</KeyCap> to close
            </div>
            <button
              onClick={openInWorkbench}
              className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              Open in Workbench
              <ChevIcon className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
