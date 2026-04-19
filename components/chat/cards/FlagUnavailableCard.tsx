'use client';

import { useState } from 'react';
import { ChevIcon, WarnIcon } from '@/components/icons';

// Payload shape mirrors FlagUnavailableInput from the tool. `suggested_alternatives`
// is deliberately not rendered — training-data named sources are unreliable,
// and dropping the field at render time is the belt-and-braces second half of
// the prompt-level restriction.
type FlagUnavailablePayload = {
  reason: string;
  missing: Array<{
    requested: string;
    closest_available: Array<{
      indicator_id?: string;
      comparison_table_id?: string;
      why: string;
    }>;
  }>;
  searched: Array<{
    tool: 'search_catalog' | 'list_comparison_tables';
    query: string;
    top_hits: string[];
  }>;
};

export type FlagUnavailableCardProps = {
  payload: FlagUnavailablePayload;
  onAlternativeClick?: (indicator_id: string | undefined, comparison_table_id: string | undefined) => void;
};

export function FlagUnavailableCard({ payload, onAlternativeClick }: FlagUnavailableCardProps) {
  const [searchedOpen, setSearchedOpen] = useState(false);
  const first = payload.missing[0];

  return (
    <div
      className="rounded-md border border-[#E0A050]/35 bg-[#E0A050]/[0.04] overflow-hidden"
      role="alert"
      aria-label="Data not available"
    >
      <div className="px-3 pt-3 pb-2 flex items-start gap-2.5 border-b border-[#E0A050]/20">
        <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full border border-[#E0A050]/50 text-[#E0A050] flex items-center justify-center">
          <WarnIcon className="w-3 h-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-[#E0A050] font-medium">
            Not available
          </div>
          <h3 className="text-[13px] font-medium text-text-primary mt-0.5 truncate">
            {first?.requested ?? 'Data not available'}
          </h3>
        </div>
      </div>

      <div className="px-3 py-3 text-[12.5px] leading-relaxed text-text-primary/90">
        {payload.reason}
      </div>

      {first && first.closest_available.length ? (
        <div className="px-3 pb-3">
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-text-tertiary mb-1.5">
            Closest available
          </div>
          <ul className="space-y-1">
            {first.closest_available.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left text-[12px] px-2 py-1.5 rounded-sm border border-white/5 hover:border-gold-300/30 hover:bg-white/[0.02] transition-colors"
                  onClick={() => onAlternativeClick?.(c.indicator_id, c.comparison_table_id)}
                >
                  <span className="text-gold-200 font-mono text-[11px]">
                    {c.indicator_id ?? c.comparison_table_id ?? '—'}
                  </span>
                  <span className="text-text-tertiary ml-2">— {c.why}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-[#E0A050]/20">
        <button
          type="button"
          onClick={() => setSearchedOpen((x) => !x)}
          aria-expanded={searchedOpen}
          className="w-full px-3 py-2 flex items-center justify-between text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <span>See what I searched ({payload.searched.length})</span>
          <ChevIcon
            className={`w-3 h-3 transition-transform ${searchedOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {searchedOpen ? (
          <ul className="px-3 pb-3 space-y-1.5">
            {payload.searched.map((s, i) => (
              <li key={i} className="text-[11px]">
                <div className="text-text-secondary">
                  <span className="font-mono text-text-tertiary">{s.tool}</span>{' '}
                  <span className="text-text-tertiary">→</span> &ldquo;{s.query}&rdquo;
                </div>
                {s.top_hits.length ? (
                  <div className="text-text-tertiary mt-0.5 ml-0.5">
                    hits: {s.top_hits.map((h) => (
                      <span key={h} className="font-mono text-[10.5px] mr-1.5">{h}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-text-tertiary mt-0.5 ml-0.5 italic">no matches</div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
