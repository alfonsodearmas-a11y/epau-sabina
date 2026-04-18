'use client';

// Collapsible data table in the workbench right rail.
// Ported from docs/design/workbench.jsx.

import { fmt } from '@/lib/fmt';
import { TableIcon, ChevIcon } from '@/components/icons';
import type { Spec } from './spec';

function isNumeric1dp(k: string): boolean {
  return k === 'npl' || k.includes('nonoil') || k.includes('overall');
}

export interface DataTableToggleProps {
  spec: Spec;
  open: boolean;
  onToggle: () => void;
}

export function DataTableToggle({ spec, open, onToggle }: DataTableToggleProps) {
  const firstKey = spec.table[0];
  return (
    <div className="glass rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TableIcon className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-[12px] text-text-secondary">Data table</span>
          <span className="num text-text-quat text-[10.5px]">
            {spec.data.length} rows
          </span>
        </div>
        <ChevIcon
          className={`w-4 h-4 text-text-tertiary transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open ? (
        <div className="border-t border-white/5 max-h-56 overflow-y-auto scroll-thin">
          <table className="w-full text-[11px] num">
            <thead className="bg-white/[0.02] text-text-tertiary">
              <tr>
                {spec.table.map((k) => (
                  <th
                    key={k}
                    className="text-right font-medium px-3 py-1.5 first:text-left uppercase tracking-[0.1em] text-[10px]"
                  >
                    {spec.tableLabels[k] ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.data.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-white/5 hover:bg-white/[0.02]"
                >
                  {spec.table.map((k) => {
                    const v = row[k];
                    const isFirst = k === firstKey;
                    return (
                      <td
                        key={k}
                        className={`px-3 py-1.5 text-right first:text-left ${
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
      ) : null}
    </div>
  );
}
