'use client';

import { fmt } from '@/lib/fmt';

type Format = 'text' | 'number' | 'percent' | 'currency_gyd' | 'currency_usd' | 'date';

type TableColumn = {
  key: string;
  label: string;
  format?: Format;
  align?: 'left' | 'right';
};

type TablePayload = {
  title: string;
  subtitle?: string;
  caveat?: string;
  columns: TableColumn[];
  rows: Array<Record<string, string | number | null>>;
};

function formatCell(v: string | number | null | undefined, format?: Format): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (format === 'percent') return `${fmt.pct(v * (Math.abs(v) < 1 ? 100 : 1), 1)}%`;
  if (format === 'currency_gyd') return `G$${fmt.n(v, 0)}`;
  if (format === 'currency_usd') return `US$${fmt.n(v, 0)}`;
  if (format === 'date') return String(v).slice(0, 10);
  if (format === 'text') return String(v);
  return fmt.n(v, Math.abs(v) < 10 ? 2 : 0);
}

export function TableCard({ payload }: { payload: TablePayload }) {
  return (
    <div className="glass rounded-md overflow-hidden" role="region" aria-label={payload.title}>
      <div className="px-3 pt-3 pb-2 border-b border-white/5">
        <h3 className="text-[13px] font-medium text-text-primary">{payload.title}</h3>
        {payload.subtitle ? (
          <div className="text-[11px] text-text-tertiary mt-0.5">{payload.subtitle}</div>
        ) : null}
      </div>
      <div className="overflow-x-auto scroll-thin max-h-80">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-text-tertiary uppercase tracking-[0.08em] text-[10px]">
              {payload.columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-3 py-2 font-medium ${
                    c.align === 'right' || (c.format && c.format !== 'text' && c.format !== 'date')
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/[0.04]">
                {payload.columns.map((c) => {
                  const isNumeric = c.format && c.format !== 'text' && c.format !== 'date';
                  return (
                    <td
                      key={c.key}
                      className={`px-3 py-1.5 ${isNumeric ? 'text-right num' : ''} ${
                        c.align === 'right' ? 'text-right' : ''
                      } text-text-primary/90`}
                    >
                      {formatCell(row[c.key], c.format)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payload.caveat ? (
        <div className="px-3 py-2 text-[11px] text-text-tertiary border-t border-white/5 bg-white/[0.015]">
          {payload.caveat}
        </div>
      ) : null}
    </div>
  );
}
