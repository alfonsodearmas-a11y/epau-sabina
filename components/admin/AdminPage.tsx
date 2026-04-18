'use client';

// Admin / Ingestion surface. Ported from docs/design/surfaces.jsx.

import { useEffect, useState } from 'react';

import { ingestionWithFallback } from '@/lib/api';
import { INGESTION_RUN } from '@/lib/mock';
import type { IngestionRun } from '@/lib/types';
import { RefreshIcon, TerminalIcon, ChevIcon, FileIcon } from '@/components/icons';
import { Pill } from '@/components/ui/Pill';

import { StatCard } from './StatCard';
import { SeverityPill } from './SeverityPill';

const SEVERITY_BREAKDOWN = [
  { s: 'high', n: 4, c: '#E06C6C' },
  { s: 'medium', n: 5, c: '#E0A050' },
  { s: 'low', n: 5, c: '#7AA7D9' },
] as const;

const PREVIOUS_RUNS = [
  { d: 'Mar 10, 2026', n: 12 },
  { d: 'Mar 03, 2026', n: 8 },
  { d: 'Feb 24, 2026', n: 11 },
  { d: 'Feb 17, 2026', n: 9 },
];

export function AdminPage() {
  const [expanded, setExpanded] = useState(true);
  const [run, setRun] = useState<IngestionRun>(INGESTION_RUN);

  useEffect(() => {
    let cancelled = false;
    ingestionWithFallback().then((r) => { if (!cancelled) setRun(r); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">
            Admin · Ingestion
          </div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">
            Last workbook re-ingest.
          </h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-gold-300 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5">
          <RefreshIcon className="w-3.5 h-3.5" /> Re-ingest now
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <StatCard label="Run started" value={run.timestamp} span={2} />
        <StatCard label="Sheets parsed" value={String(run.sheets_parsed)} />
        <StatCard
          label="Indicators upserted"
          value={run.indicators_upserted.toLocaleString()}
        />
        <StatCard
          label="Observations upserted"
          value={run.observations_upserted.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-3">
        <div className="glass rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-gold-300" />
              <span className="text-[12.5px] text-text-primary font-medium">
                Quarantined cells
              </span>
              <Pill tone="warn">{run.issues_count} issues</Pill>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11.5px] text-text-tertiary hover:text-text-primary flex items-center gap-1"
            >
              {expanded ? 'Collapse' : 'Expand'}{' '}
              <ChevIcon
                className={`w-3.5 h-3.5 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
          {expanded ? (
            <div className="font-mono text-[11.5px]">
              <div className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-text-tertiary bg-white/[0.02] border-b border-white/5">
                <div>Sheet</div>
                <div>Cell</div>
                <div>Reason</div>
                <div>Severity</div>
              </div>
              {run.quarantine.map((q, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 border-b border-white/4 hover:bg-white/[0.02]"
                >
                  <div className="text-gold-200">{q.sheet}</div>
                  <div className="text-text-secondary num">{q.cell}</div>
                  <div className="text-text-primary font-sans text-[12px]">
                    {q.reason}
                  </div>
                  <div>
                    <SeverityPill s={q.severity} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
              Source workbook
            </div>
            <div className="flex items-center gap-2">
              <FileIcon className="w-4 h-4 text-text-tertiary" />
              <span className="text-[12.5px] text-text-primary font-mono truncate">
                {run.workbook}
              </span>
            </div>
            <div className="text-[11px] text-text-tertiary mt-1 num">
              {run.workbook_size} · 61 sheets · {run.duration} to parse
            </div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
              Severity breakdown
            </div>
            <div className="space-y-2">
              {SEVERITY_BREAKDOWN.map((x) => (
                <div key={x.s} className="flex items-center gap-2">
                  <span className="text-[11px] capitalize text-text-secondary w-16">
                    {x.s}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(x.n / 14) * 100}%`,
                        background: x.c,
                      }}
                    />
                  </div>
                  <span className="num text-[11px] text-text-primary w-5 text-right">
                    {x.n}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
              Previous runs
            </div>
            <div className="space-y-1.5 text-[11px] num">
              {PREVIOUS_RUNS.map((r) => (
                <div
                  key={r.d}
                  className="flex items-center justify-between text-text-secondary"
                >
                  <span>{r.d}</span>
                  <span className="text-text-tertiary">{r.n} issues</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
