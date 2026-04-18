'use client';

// Commentary panel with Draft → generating → results states.
// Ported from docs/design/workbench.jsx; now backed by /api/query/narrate
// via lib/workbench.ts narrate() when indicatorIds are provided, with a
// canned-text fallback for the demo path.

import { useState, type CSSProperties } from 'react';
import { SparkleIcon, RefreshIcon, CopyIcon, CheckIcon } from '@/components/icons';
import { narrate } from '@/lib/workbench';

export interface CommentaryPanelProps {
  commentary: string | null;
  setCommentary: (c: string | null) => void;
  query?: string;
  indicatorIds?: string[];
  /** Canned fallback commentary for the mock/demo flow. */
  fallbackCommentary?: string | null;
}

export function CommentaryPanel({
  commentary, setCommentary, query, indicatorIds, fallbackCommentary,
}: CommentaryPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setCommentary(null);
    setError(null);
    try {
      if (indicatorIds && indicatorIds.length && query) {
        const live = await narrate(query, indicatorIds);
        if (live) {
          setCommentary(live);
        } else if (fallbackCommentary) {
          setCommentary(fallbackCommentary);
        } else {
          setError('Unable to draft commentary. Check that ANTHROPIC_API_KEY is set.');
        }
      } else if (fallbackCommentary) {
        // Mock path — simulate the prototype's latency.
        await new Promise((r) => setTimeout(r, 900));
        setCommentary(fallbackCommentary);
      } else {
        setError('No indicators selected.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    if (commentary) {
      navigator.clipboard?.writeText(commentary).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="mt-3">
      {!commentary && !generating && !error ? (
        <div className="glass rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SparkleIcon className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">
                Commentary
              </span>
            </div>
            <div className="text-[13px] text-text-secondary">
              Draft a 150-word paragraph in EPAU house style, grounded in these observations.
            </div>
          </div>
          <button onClick={generate}
            className="h-9 px-4 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12.5px] font-medium flex items-center gap-1.5 transition-colors">
            <SparkleIcon className="w-3.5 h-3.5" />
            Draft commentary
          </button>
        </div>
      ) : generating ? (
        <div className="glass-strong rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <SparkleIcon className="w-3.5 h-3.5 text-gold-300 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">
              Drafting commentary
            </span>
          </div>
          <div className="space-y-2">
            {[100, 95, 92, 80].map((w, i) => (
              <div key={i} className="skeleton-bar h-2.5 bg-white/6 rounded"
                style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="glass rounded-lg p-5 flex items-center justify-between border-l-2 border-l-[#E06C6C]/40">
          <div className="text-[12.5px] text-text-secondary">{error}</div>
          <button onClick={generate} className="h-8 px-3 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary text-[11.5px] flex items-center gap-1.5">
            <RefreshIcon className="w-3 h-3" /> Try again
          </button>
        </div>
      ) : (
        <div className="glass-strong rounded-lg p-5 gold-ring">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SparkleIcon className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">
                Commentary
              </span>
              <span className="text-text-quat">·</span>
              <span className="text-[11px] text-text-tertiary num">
                {commentary?.split(/\s+/).length ?? 0} words · EPAU house style
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={generate}
                className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                <RefreshIcon className="w-3 h-3" /> Regenerate
              </button>
              <button onClick={copy}
                className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                {copied ? (
                  <><CheckIcon className="w-3 h-3 text-[#7FC29B]" /> Copied</>
                ) : (
                  <><CopyIcon className="w-3 h-3" /> Copy to clipboard</>
                )}
              </button>
            </div>
          </div>
          <p className="text-[14px] leading-[1.65] text-text-primary max-w-[86ch]"
             style={{ textWrap: 'pretty' } as CSSProperties}>
            {commentary}
          </p>
        </div>
      )}
    </div>
  );
}
