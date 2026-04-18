'use client';

// Data-driven results panel. Mirrors the prototype's ResultsPanel structure but
// consumes a DynamicSpec built from live API data (see lib/workbench-spec.ts).
import { useState, useMemo } from 'react';

import {
  ChartIcon,
  TableIcon,
  PinIcon,
  CheckIcon,
  DownloadIcon,
  FileIcon,
  WarnIcon,
} from '@/components/icons';
import { fmt } from '@/lib/fmt';

import { GenericChart } from './charts/GenericChart';
import { SidePanel } from './SidePanel';
import { CaveatsPanel } from './CaveatsPanel';
import { CommentaryPanel } from './CommentaryPanel';
import type { DynamicSpec } from './dynamic-spec';

const CHART_SWITCHER = [
  { id: 'area', label: 'Area' },
  { id: 'line', label: 'Line' },
  { id: 'bar', label: 'Bar' },
  { id: 'table', label: 'Table' },
] as const;

type Mode = (typeof CHART_SWITCHER)[number]['id'];

export interface DynamicResultsPanelProps {
  spec: DynamicSpec;
  query: string;
  commentary: string | null;
  setCommentary: (c: string | null) => void;
  onExportPng?: () => Promise<void>;
  onExportDocx?: () => Promise<void>;
  onSaveView?: () => Promise<void>;
}

export function DynamicResultsPanel({
  spec, query, commentary, setCommentary, onExportPng, onExportDocx, onSaveView,
}: DynamicResultsPanelProps) {
  const [mode, setMode] = useState<Mode>(spec.tableMode ? 'table' : spec.chartType);
  const [showTable, setShowTable] = useState(false);

  const chartType: 'area' | 'line' | 'bar' = mode === 'table' ? spec.chartType : mode;
  const isNegativeDelta = spec.headline.delta.startsWith('-') || spec.headline.delta.startsWith('(');
  const nonNullRows = useMemo(() => spec.data.filter((r) => spec.series.some((s) => typeof r[s.key] === 'number')), [spec]);

  return (
    <div className="mt-3 fade-up">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-[26px] leading-[1.15] text-text-primary">{spec.title}</h2>
          <div className="text-[12.5px] text-text-tertiary mt-0.5">{spec.subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/[0.03] border border-white/8">
            {CHART_SWITCHER.map((t) => {
              const ActiveIcon = t.id === 'table' ? TableIcon : ChartIcon;
              const on = mode === t.id;
              return (
                <button key={t.id} onClick={() => setMode(t.id)}
                  className={`px-2.5 h-7 rounded flex items-center gap-1.5 text-[11.5px] transition-colors ${on ? 'bg-white/[0.08] text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                  <ActiveIcon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
          <button onClick={onSaveView} className="h-7 w-7 rounded-md bg-white/[0.03] border border-white/8 text-text-tertiary hover:text-text-primary flex items-center justify-center" title="Pin to saved views">
            <PinIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        <div className="glass rounded-lg p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.label}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-[32px] leading-none text-gold-300 num">{spec.headline.value}</span>
                <span className="text-[11.5px] text-text-tertiary">{spec.headline.unit}</span>
              </div>
            </div>
            {spec.headline.delta ? (
              <div className="text-right">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.deltaLabel}</div>
                <div className={`text-[18px] num mt-0.5 ${isNegativeDelta ? 'text-[#E06C6C]' : 'text-[#7FC29B]'}`}>{spec.headline.delta}</div>
              </div>
            ) : null}
          </div>
          <div className="h-[320px]">
            {mode === 'table' ? (
              <DynamicTable spec={spec} />
            ) : spec.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-tertiary text-[13px]">No observations in range.</div>
            ) : (
              <GenericChart
                data={spec.data}
                xKey={spec.xKey}
                series={spec.series}
                chartType={chartType}
                unit={spec.indicators[0]?.unit}
                percent={spec.percent}
                stacked={chartType === 'area' && spec.series.length > 1 && !spec.percent}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center gap-3 flex-wrap">
              {spec.indicators.map((ind) => (
                <div key={ind.id} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-text-secondary">{ind.name}</span>
                  <span className="text-text-quat">·</span>
                  <span className="text-text-tertiary">{ind.unit}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
              {nonNullRows.length} observations
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SidePanel title="Selected indicators" count={spec.indicators.length}>
            {spec.indicators.map((ind) => (
              <div key={ind.id} className="px-4 py-2.5 border-t border-white/5 first:border-t-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-[12.5px] text-text-primary font-medium truncate">{ind.name}</span>
                </div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5 pl-3.5">
                  {ind.unit} · {ind.source}
                </div>
              </div>
            ))}
          </SidePanel>

          {spec.caveats.length > 0 ? <CaveatsPanel caveats={spec.caveats} /> : null}

          <div className="glass rounded-lg overflow-hidden">
            <button onClick={() => setShowTable((s) => !s)} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[12px] text-text-secondary">Data table</span>
                <span className="num text-text-quat text-[10.5px]">{nonNullRows.length} rows</span>
              </div>
              <span className={`text-text-tertiary text-[11px] transition-transform ${showTable ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showTable ? (
              <div className="border-t border-white/5 max-h-56 overflow-y-auto scroll-thin">
                <DynamicTable spec={spec} compact />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Commentary — real /api/query/narrate backed */}
      <CommentaryPanel
        indicatorIds={spec.indicators.map((i) => i.id)}
        query={query}
        commentary={commentary}
        setCommentary={setCommentary}
      />

      <div className="mt-3 flex items-center justify-between glass rounded-lg px-4 py-3">
        <div className="text-[11.5px] text-text-tertiary flex items-center gap-2">
          <CheckIcon className="w-3.5 h-3.5 text-[#7FC29B]" />
          Query resolved against {spec.indicators.length} indicator{spec.indicators.length === 1 ? '' : 's'}, {nonNullRows.length} observations.
          {spec.caveats.length ? <span className="ml-2 flex items-center gap-1 text-[#E0A050]"><WarnIcon className="w-3 h-3" />{spec.caveats.length} caveat{spec.caveats.length === 1 ? '' : 's'} attached</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExportPng} className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <DownloadIcon className="w-3.5 h-3.5" /> Chart as PNG
          </button>
          <button onClick={onExportDocx} className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <FileIcon className="w-3.5 h-3.5" /> Export as Word
          </button>
          <button onClick={onSaveView} className="h-8 px-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12px] flex items-center gap-1.5 transition-colors">
            <PinIcon className="w-3.5 h-3.5" /> Save this view
          </button>
        </div>
      </div>
    </div>
  );
}

function DynamicTable({ spec, compact }: { spec: DynamicSpec; compact?: boolean }) {
  const td = compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-[12px]';
  return (
    <div className="h-full overflow-auto scroll-thin">
      <table className={`w-full num`}>
        <thead className="bg-white/[0.02] text-text-tertiary sticky top-0">
          <tr>
            {spec.table.map((k) => (
              <th key={k} className={`text-right font-medium ${td} first:text-left uppercase tracking-[0.1em] text-[10.5px]`}>
                {spec.tableLabels[k] ?? k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.data.map((row, i) => (
            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
              {spec.table.map((k) => {
                const v = row[k];
                const isFirst = k === spec.table[0];
                return (
                  <td key={k} className={`${td} text-right first:text-left ${isFirst ? 'text-text-secondary' : 'text-text-primary'}`}>
                    {v === null || v === undefined ? <span className="text-text-quat">—</span> : typeof v === 'number' ? fmt.n(v, spec.percent ? 1 : 0) : v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
