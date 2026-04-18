// Full results table (shown when the chart-type switcher is set to Table).
// Ported from docs/design/workbench.jsx.

import { fmt } from '@/lib/fmt';
import type { Spec } from './spec';

function isNumeric1dp(k: string): boolean {
  return k === 'npl' || k === 'nonoil' || k === 'overall';
}

export function ResultsTable({ spec }: { spec: Spec }) {
  const firstKey = spec.table[0];
  return (
    <div className="h-full overflow-auto scroll-thin">
      <table className="w-full text-[12px] num">
        <thead className="bg-white/[0.02] text-text-tertiary sticky top-0">
          <tr>
            {spec.table.map((k) => (
              <th
                key={k}
                className="text-right font-medium px-4 py-2 first:text-left uppercase tracking-[0.1em] text-[10.5px]"
              >
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
                const isFirst = k === firstKey;
                return (
                  <td
                    key={k}
                    className={`px-4 py-2 text-right first:text-left ${
                      isFirst ? 'text-text-secondary' : 'text-text-primary'
                    }`}
                  >
                    {v === null || v === undefined ? (
                      <span className="text-text-quat">—</span>
                    ) : typeof v === 'number' ? (
                      fmt.n(v, isNumeric1dp(k) ? 1 : 0)
                    ) : (
                      v
                    )}
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
