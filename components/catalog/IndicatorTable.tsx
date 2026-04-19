'use client';

// Dense row list rendered on the right side of the Catalog page.

import { CategoryPill, FreqPill } from '@/components/ui/Pill';
import { KeyCap } from '@/components/ui/KeyCap';
import { SearchIcon, WarnIcon, ChevIcon } from '@/components/icons';
import type { Indicator } from '@/lib/types';

export interface IndicatorTableProps {
  indicators: Indicator[];
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (ind: Indicator) => void;
}

export function IndicatorTable({
  indicators,
  query,
  onQueryChange,
  onSelect,
}: IndicatorTableProps) {
  return (
    <div>
      <div className="glass rounded-t-lg p-1.5 flex items-center gap-2">
        <SearchIcon className="w-4 h-4 text-text-tertiary ml-2" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter indicators by name"
          className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1"
        />
        <KeyCap>/</KeyCap>
      </div>
      <div className="bg-white/[0.01] border border-white/6 border-t-0 rounded-b-lg overflow-hidden">
        <div className="hidden md:block">
          <div className="overflow-x-auto scroll-thin">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-text-tertiary bg-white/[0.02]">
                <div>Indicator</div>
                <div>Category</div>
                <div>Frequency</div>
                <div>Latest</div>
                <div>Source</div>
                <div />
              </div>
              <div className="max-h-[640px] overflow-y-auto scroll-thin">
                {indicators.map((ind) => {
                  const sourcePrefix = ind.source.split(',')[0] ?? ind.source;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => onSelect(ind)}
                      className="w-full grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 border-t border-white/5 hover:bg-white/[0.025] transition-colors text-left items-center"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {ind.caveat ? (
                          <WarnIcon className="w-3.5 h-3.5 text-[#E0A050] shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="text-[12.5px] text-text-primary truncate">{ind.name}</span>
                      </div>
                      <div><CategoryPill category={ind.category} /></div>
                      <div><FreqPill frequency={ind.frequency} /></div>
                      <div className="text-[11.5px] num text-text-secondary">{ind.latest}</div>
                      <div className="text-[11px] text-text-tertiary truncate">{sourcePrefix}</div>
                      <ChevIcon className="w-4 h-4 text-text-quat -rotate-90" />
                    </button>
                  );
                })}
                {indicators.length === 0 ? (
                  <div className="px-4 py-6 text-[12px] text-text-tertiary">No indicators match those filters.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden max-h-[70vh] overflow-y-auto scroll-thin">
          {indicators.map((ind) => {
            const sourcePrefix = ind.source.split(',')[0] ?? ind.source;
            return (
              <button
                key={ind.id}
                onClick={() => onSelect(ind)}
                className="w-full border-t border-white/5 first:border-t-0 px-4 py-3 flex items-start gap-3 text-left hover:bg-white/[0.025] transition-colors"
              >
                {ind.caveat ? (
                  <WarnIcon className="w-4 h-4 text-[#E0A050] shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-text-primary leading-snug">{ind.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <CategoryPill category={ind.category} />
                    <FreqPill frequency={ind.frequency} />
                    <span className="text-[11px] num text-text-tertiary">{ind.latest}</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-1 truncate">{sourcePrefix}</div>
                </div>
                <ChevIcon className="w-4 h-4 text-text-quat -rotate-90 mt-1 shrink-0" />
              </button>
            );
          })}
          {indicators.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-text-tertiary">No indicators match those filters.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
