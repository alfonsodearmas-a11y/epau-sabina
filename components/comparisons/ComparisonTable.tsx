// Grouped-column comparison table. Ported from docs/design/surfaces.jsx.

import { fmt } from '@/lib/fmt';
import type { ComparisonTable as ComparisonTableType } from '@/lib/types';

const GROUP_COLORS = ['#C8A87F', '#7AA7D9', '#B099D4'] as const;

export function ComparisonTable({ table }: { table: ComparisonTableType }) {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-[12.5px] num border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium px-4 py-2 border-b border-white/10 align-bottom">
              Indicator
            </th>
            {table.groups.map((g, i) => {
              const color = GROUP_COLORS[i % GROUP_COLORS.length] ?? '#C8A87F';
              return (
                <th
                  key={i}
                  colSpan={g.span}
                  className="text-center text-[11px] uppercase tracking-[0.14em] font-medium px-2 py-2 border-b border-white/10"
                  style={{ color }}
                >
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border"
                    style={{
                      borderColor: `${color}40`,
                      background: `${color}0d`,
                    }}
                  >
                    {g.label}
                  </span>
                </th>
              );
            })}
            <th className="w-0 border-b border-white/10" />
          </tr>
          <tr>
            <th className="px-4 py-1.5 border-b border-white/5" />
            {table.groups
              .flatMap((g) => g.sub)
              .map((s, i) => (
                <th
                  key={i}
                  className="text-right text-[10.5px] font-normal text-text-tertiary px-3 py-1.5 border-b border-white/5"
                >
                  {s}
                </th>
              ))}
            <th className="border-b border-white/5" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => {
            const commaIdx = row.label.indexOf(',');
            const head = commaIdx === -1 ? row.label : row.label.slice(0, commaIdx);
            const tail = commaIdx === -1 ? '' : row.label.slice(commaIdx + 1);
            return (
              <tr key={ri} className="hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 text-[12.5px] text-text-primary border-b border-white/5">
                  <span>{head}</span>
                  <span className="text-text-tertiary text-[11px] ml-1.5">
                    {tail}
                  </span>
                </td>
                {row.cells.map((c, ci) => {
                  const isNullish = c === null || c === undefined;
                  const cls = isNullish
                    ? 'text-text-quat'
                    : (c as number) < 0
                    ? 'text-[#E06C6C]'
                    : 'text-text-primary';
                  return (
                    <td
                      key={ci}
                      className={`text-right px-3 py-2.5 border-b border-white/5 ${cls}`}
                    >
                      {isNullish
                        ? '—'
                        : typeof c === 'number'
                        ? fmt.n(c, Math.abs(c) < 100 ? 1 : 0)
                        : c}
                    </td>
                  );
                })}
                <td className="border-b border-white/5" />
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
        Values in parentheses are negative. Bureau of Statistics and Ministry
        of Finance compilations.
      </div>
    </div>
  );
}
