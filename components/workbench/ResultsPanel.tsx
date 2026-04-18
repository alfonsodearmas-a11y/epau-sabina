'use client';

// The "results" state of the workbench — 70/30 split with chart on the left
// and a side stack (selected indicators, caveats, data table) on the right.
// Ported from docs/design/workbench.jsx.

import { useState } from 'react';

import { PSC_SERIES, NRF_SERIES, GDP_SERIES, NPL_SERIES } from '@/lib/mock';
import {
  ChartIcon,
  TableIcon,
  PinIcon,
  CheckIcon,
  DownloadIcon,
  FileIcon,
} from '@/components/icons';

import { PscAreaChart } from './charts/PscAreaChart';
import { NrfBarChart } from './charts/NrfBarChart';
import { GdpLineChart } from './charts/GdpLineChart';
import { NplLineChart } from './charts/NplLineChart';

import { SidePanel } from './SidePanel';
import { CaveatsPanel } from './CaveatsPanel';
import { DataTableToggle } from './DataTableToggle';
import { CommentaryPanel } from './CommentaryPanel';
import { ResultsTable } from './ResultsTable';

import type {
  ChartType,
  Spec,
  SpecRow,
  ViewKind,
  ViewState,
} from './spec';

const SPECS: Record<ViewKind, Spec> = {
  psc: {
    kind: 'psc',
    title: 'Private sector credit by sector',
    subtitle: 'Annual stock, G$ millions, 2015 to 2026',
    indicators: [
      {
        id: 'psc_business',
        name: 'Business enterprises',
        unit: 'G$ millions',
        source: 'BoG Statistical Bulletin Tbl 3.4',
        color: '#D4AF37',
      },
      {
        id: 'psc_mortgages',
        name: 'Real estate mortgages',
        unit: 'G$ millions',
        source: 'BoG Statistical Bulletin Tbl 3.4',
        color: '#7AA7D9',
      },
      {
        id: 'psc_households',
        name: 'Households',
        unit: 'G$ millions',
        source: 'BoG Statistical Bulletin Tbl 3.4',
        color: '#B099D4',
      },
    ],
    caveats: [
      {
        level: 'info',
        text: 'Figures are end-of-period stock; flows are derivable as first differences.',
      },
      {
        level: 'warn',
        text: 'Credit classification revised in the 2022 Statistical Bulletin; "other services" was reallocated across business and households. Pre-2022 values are BoG-backcast.',
      },
    ],
    headline: {
      label: 'Total, 2026 (Feb)',
      value: '500,800',
      unit: 'G$ millions',
      delta: '+12.4%',
      deltaLabel: 'vs. same month 2025',
    },
    data: PSC_SERIES as unknown as SpecRow[],
    render: (d) => <PscAreaChart data={d as never} />,
    table: ['year', 'business', 'mortgages', 'households'],
    tableLabels: {
      year: 'Year',
      business: 'Business',
      mortgages: 'Mortgages',
      households: 'Households',
    },
    commentary:
      "Private sector credit climbed to G$500.8 billion in February 2026, extending a broad-based expansion that has run alongside the oil-era investment cycle. Business enterprise lending remains the largest single category, but the share of real estate mortgages has risen from roughly 22 percent of the portfolio in 2015 to 34 percent today, reflecting sustained mortgage underwriting by commercial banks against the backdrop of firm residential demand in Regions 3 and 4. Household credit has grown in tandem with formal-sector employment, though from a low base. The composition shift warrants continued macroprudential attention, particularly as the mortgage book has now doubled in nominal terms over four years; stress-testing results due from the Bank of Guyana in Q2 will inform whether the sector-specific capital add-ons require recalibration.",
  },
  nrf: {
    kind: 'nrf',
    title: 'NRF inflows, actual versus budget',
    subtitle: 'US$ millions, 2020 to 2026',
    indicators: [
      {
        id: 'nrf_inflows_actual',
        name: 'Actual',
        unit: 'US$ millions',
        source: 'MoF NRF Quarterly Reports',
        color: '#D4AF37',
      },
      {
        id: 'nrf_inflows_budget',
        name: 'Budget',
        unit: 'US$ millions',
        source: 'National Budget Appendix III',
        color: '#7AA7D9',
      },
    ],
    caveats: [
      {
        level: 'warn',
        text: 'Royalties recorded on cash basis; 2025 figures remain provisional pending audit completion.',
      },
      {
        level: 'info',
        text: '2026 actual not yet observed; budget value shown for comparison.',
      },
    ],
    headline: {
      label: '2025 shortfall',
      value: '(450)',
      unit: 'US$ millions',
      delta: '-15.5%',
      deltaLabel: 'vs. budget',
    },
    data: NRF_SERIES as unknown as SpecRow[],
    render: (d) => <NrfBarChart data={d as never} />,
    table: ['year', 'actual', 'budget'],
    tableLabels: { year: 'Year', actual: 'Actual', budget: 'Budget' },
    commentary:
      'NRF inflows in 2025 totalled US$2,450 million, undershooting the US$2,900 million budget by about US$450 million. The shortfall reflects softer realised Brent prices in the second half and a scheduled Liza Phase 1 maintenance turnaround that trimmed lifted volumes. On a multi-year view, the Fund has received US$8,510 million since 2020, tracking 94 percent of cumulative budget. The 2026 budget of US$2,800 million assumes an average realised price of US$75 per barrel and continued ramp of the Payara and Yellowtail developments; risks are weighted to the downside on price and to the upside on volumes. EPAU recommends retaining the current withdrawal rule pending the Q2 reassessment.',
  },
  gdp: {
    kind: 'gdp',
    title: 'Real GDP growth: overall versus non-oil',
    subtitle: 'Percent, year-on-year, 2017 to 2025',
    indicators: [
      {
        id: 'gdp_real_growth',
        name: 'Overall real GDP',
        unit: 'percent',
        source: 'BoS National Accounts',
        color: '#D4AF37',
      },
      {
        id: 'gdp_nonoil_growth',
        name: 'Non-oil real GDP',
        unit: 'percent',
        source: 'BoS National Accounts',
        color: '#7AA7D9',
      },
    ],
    caveats: [
      {
        level: 'warn',
        text: '2025 is a first estimate and is subject to revision with the Q4 national accounts release scheduled for April.',
      },
      {
        level: 'info',
        text: 'Non-oil series excludes direct contribution of crude production; indirect effects through services and construction remain.',
      },
    ],
    headline: {
      label: 'Non-oil GDP, 2025',
      value: '6.3',
      unit: 'percent',
      delta: '-2.2pp',
      deltaLabel: 'vs. 2024',
    },
    data: GDP_SERIES as unknown as SpecRow[],
    render: (d) => <GdpLineChart data={d as never} />,
    table: ['year', 'overall', 'nonoil'],
    tableLabels: { year: 'Year', overall: 'Overall', nonoil: 'Non-oil' },
    commentary:
      'Real GDP expanded 14.4 percent in 2025, a notable moderation from 43.6 percent in 2024 as the base effect from Payara first oil rolled off. Non-oil growth registered 6.3 percent, down from 8.5 percent the prior year but still well above the pre-oil trend of roughly 3 percent. Construction and wholesale and retail trade continued to lead the non-oil expansion, supported by public capital execution at 91 percent of budget. Services, particularly transport and communication, decelerated mildly in the second half. The divergence between headline and non-oil growth will narrow further as additional production phases reach nameplate and base effects compress, making the non-oil series the more policy-relevant gauge from 2026 onward.',
  },
  npl: {
    kind: 'npl',
    title: 'Non-performing loans ratio',
    subtitle: 'Percent of total loans, quarterly, 2017 to 2025',
    indicators: [
      {
        id: 'npl_ratio',
        name: 'NPL ratio',
        unit: 'percent',
        source: 'BoG Financial Stability Report',
        color: '#D4AF37',
      },
    ],
    caveats: [
      {
        level: 'info',
        text: 'Classification follows IFRS 9 Stage 3; restructured loans are included after the observation period.',
      },
    ],
    headline: {
      label: 'Q4 2025',
      value: '4.6',
      unit: 'percent',
      delta: '-8.0pp',
      deltaLabel: 'vs. 2018 peak',
    },
    data: NPL_SERIES as unknown as SpecRow[],
    render: (d) => <NplLineChart data={d as never} />,
    table: ['q', 'npl'],
    tableLabels: { q: 'Quarter', npl: 'NPL ratio' },
    commentary:
      'The non-performing loans ratio stood at 4.6 percent in the fourth quarter of 2025, essentially flat against the prior quarter and well below the 12.9 percent peak recorded in the first quarter of 2018. The decade-long decline reflects both numerator and denominator effects: resolution of legacy exposures in the gold and rice sectors, tighter underwriting standards following the 2019 prudential reforms, and rapid growth in the performing loan book. The modest uptick over the past four quarters warrants monitoring; it is concentrated in small and medium enterprise exposures, particularly in construction subcontracting. Absent a broader deterioration, current coverage ratios of approximately 78 percent suggest the banking system retains ample buffers.',
  },
};

const CHART_SWITCHER = [
  { id: 'area', label: 'Area' },
  { id: 'line', label: 'Line' },
  { id: 'bar', label: 'Bar' },
  { id: 'table', label: 'Table' },
] as const;

export interface ResultsPanelProps {
  view: ViewState;
  commentary: string | null;
  setCommentary: (c: string | null) => void;
}

export function ResultsPanel({
  view,
  commentary,
  setCommentary,
}: ResultsPanelProps) {
  const [chartType, setChartType] = useState<ChartType>(view.chart);
  const [showTable, setShowTable] = useState(false);

  const spec = SPECS[view.kind];
  const isNegativeDelta =
    spec.headline.delta.startsWith('-') || spec.headline.delta.startsWith('(');

  return (
    <div className="mt-3 fade-up">
      {/* Header row: title + chart type switcher */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-[26px] leading-[1.15] text-text-primary">
            {spec.title}
          </h2>
          <div className="text-[12.5px] text-text-tertiary mt-0.5">
            {spec.subtitle}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/[0.03] border border-white/8">
            {CHART_SWITCHER.map((t) => {
              const ActiveIcon = t.id === 'table' ? TableIcon : ChartIcon;
              const on = chartType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setChartType(t.id)}
                  className={`px-2.5 h-7 rounded flex items-center gap-1.5 text-[11.5px] transition-colors ${
                    on
                      ? 'bg-white/[0.08] text-text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <ActiveIcon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button
            className="h-7 w-7 rounded-md bg-white/[0.03] border border-white/8 text-text-tertiary hover:text-text-primary flex items-center justify-center"
            title="Pin to saved views"
          >
            <PinIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        {/* Chart region */}
        <div className="glass rounded-lg p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">
                {spec.headline.label}
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-[32px] leading-none text-gold-300 num">
                  {spec.headline.value}
                </span>
                <span className="text-[11.5px] text-text-tertiary">
                  {spec.headline.unit}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">
                {spec.headline.deltaLabel}
              </div>
              <div
                className={`text-[18px] num mt-0.5 ${
                  isNegativeDelta ? 'text-[#E06C6C]' : 'text-[#7FC29B]'
                }`}
              >
                {spec.headline.delta}
              </div>
            </div>
          </div>
          <div className="h-[320px]">
            {chartType === 'table' ? (
              <ResultsTable spec={spec} />
            ) : (
              spec.render(spec.data)
            )}
          </div>
          {/* Inline legend / source */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center gap-3 flex-wrap">
              {spec.indicators.map((ind) => (
                <div
                  key={ind.id}
                  className="flex items-center gap-1.5 text-[11px]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: ind.color }}
                  />
                  <span className="text-text-secondary">{ind.name}</span>
                  <span className="text-text-quat">·</span>
                  <span className="text-text-tertiary">{ind.unit}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
              As of Mar 17, 2026
            </div>
          </div>
        </div>

        {/* Right stack */}
        <div className="space-y-3">
          <SidePanel title="Selected indicators" count={spec.indicators.length}>
            {spec.indicators.map((ind) => (
              <div
                key={ind.id}
                className="px-4 py-2.5 border-t border-white/5 first:border-t-0"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: ind.color }}
                  />
                  <span className="text-[12.5px] text-text-primary font-medium truncate">
                    {ind.name}
                  </span>
                </div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5 pl-3.5">
                  {ind.unit} · {ind.source}
                </div>
              </div>
            ))}
          </SidePanel>

          <CaveatsPanel caveats={spec.caveats} />

          <DataTableToggle
            spec={spec}
            open={showTable}
            onToggle={() => setShowTable(!showTable)}
          />
        </div>
      </div>

      {/* Commentary */}
      <CommentaryPanel
        spec={spec}
        commentary={commentary}
        setCommentary={setCommentary}
      />

      {/* Export row */}
      <div className="mt-3 flex items-center justify-between glass rounded-lg px-4 py-3">
        <div className="text-[11.5px] text-text-tertiary flex items-center gap-2">
          <CheckIcon className="w-3.5 h-3.5 text-[#7FC29B]" />
          Query resolved against 3 indicators, 42 observations. Last re-ingest
          09:14 GYT today.
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <DownloadIcon className="w-3.5 h-3.5" /> Chart as PNG
          </button>
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <FileIcon className="w-3.5 h-3.5" /> Export as Word
          </button>
          <button className="h-8 px-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12px] flex items-center gap-1.5 transition-colors">
            <PinIcon className="w-3.5 h-3.5" /> Save this view
          </button>
        </div>
      </div>
    </div>
  );
}
