'use client';

// Sticky filter sidebar used by the Catalog page.

import { SectionLabel } from '@/components/ui/SectionLabel';
import { Divider } from '@/components/ui/Divider';
import { CategoryPill } from '@/components/ui/Pill';
import { WarnIcon } from '@/components/icons';
import type { IndicatorCategory, Frequency } from '@/lib/types';

import { FilterGroup } from './FilterGroup';
import { FilterCheck } from './FilterCheck';

export interface FilterSidebarProps {
  categoryList: IndicatorCategory[];
  frequencyList: Frequency[];
  sourceList: string[];
  cats: Set<IndicatorCategory>;
  freqs: Set<Frequency>;
  sources: Set<string>;
  caveatOnly: boolean;
  onToggleCategory: (v: IndicatorCategory) => void;
  onToggleFrequency: (v: Frequency) => void;
  onToggleSource: (v: string) => void;
  onToggleCaveatOnly: () => void;
}

export function FilterSidebar({
  categoryList,
  frequencyList,
  sourceList,
  cats,
  freqs,
  sources,
  caveatOnly,
  onToggleCategory,
  onToggleFrequency,
  onToggleSource,
  onToggleCaveatOnly,
}: FilterSidebarProps) {
  return (
    <div className="glass rounded-lg self-start sticky top-20 overflow-hidden">
      <SectionLabel>Filters</SectionLabel>
      <FilterGroup label="Category">
        {categoryList.map((c) => (
          <FilterCheck
            key={c}
            on={cats.has(c)}
            onToggle={() => onToggleCategory(c)}
            label={c}
            right={<CategoryPill category={c} />}
          />
        ))}
      </FilterGroup>
      <Divider />
      <FilterGroup label="Frequency">
        {frequencyList.map((f) => (
          <FilterCheck
            key={f}
            on={freqs.has(f)}
            onToggle={() => onToggleFrequency(f)}
            label={f}
          />
        ))}
      </FilterGroup>
      <Divider />
      <FilterGroup label="Source">
        {sourceList.map((s) => (
          <FilterCheck
            key={s}
            on={sources.has(s)}
            onToggle={() => onToggleSource(s)}
            label={s}
          />
        ))}
      </FilterGroup>
      <Divider />
      <div className="px-4 py-3">
        <button
          onClick={onToggleCaveatOnly}
          className={`w-full h-8 rounded-md flex items-center justify-between px-3 text-[12px] border transition-colors ${
            caveatOnly
              ? 'bg-[#E0A050]/10 border-[#E0A050]/30 text-[#E0A050]'
              : 'bg-white/[0.02] border-white/8 text-text-secondary hover:border-white/15'
          }`}
        >
          <span className="flex items-center gap-2">
            <WarnIcon className="w-3.5 h-3.5" /> Has caveat
          </span>
          <span
            className={`w-6 h-3.5 rounded-full relative ${
              caveatOnly ? 'bg-[#E0A050]/40' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-white/80 transition-all ${
                caveatOnly ? 'left-[10px]' : 'left-0'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}
