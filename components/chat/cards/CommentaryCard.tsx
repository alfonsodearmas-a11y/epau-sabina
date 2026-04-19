'use client';

import { useState } from 'react';
import { CopyIcon, CheckIcon } from '@/components/icons';

type CommentaryPayload = {
  text: string;
  pullquote?: string;
  caveat?: string;
};

export function CommentaryCard({ payload }: { payload: CommentaryPayload }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable in some contexts */
    }
  };

  return (
    <div
      className="glass rounded-md overflow-hidden"
      role="article"
      aria-label="Commentary"
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
        <span className="text-[10.5px] uppercase tracking-[0.12em] text-gold-200 font-medium">
          Commentary
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy to briefing'}
          className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-gold-200 transition-colors px-2 py-1 rounded-sm border border-white/5 hover:border-gold-300/30"
        >
          {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy to briefing'}
        </button>
      </div>

      {payload.pullquote ? (
        <blockquote className="px-4 pt-4 pb-1 font-serif text-gold-100 text-[18px] leading-snug">
          {payload.pullquote}
        </blockquote>
      ) : null}

      <div className="px-4 py-3 text-[13px] leading-relaxed text-text-primary/95 whitespace-pre-wrap">
        {payload.text}
      </div>

      {payload.caveat ? (
        <div className="px-4 py-2 text-[11px] text-text-tertiary border-t border-white/5 bg-white/[0.015]">
          {payload.caveat}
        </div>
      ) : null}
    </div>
  );
}
