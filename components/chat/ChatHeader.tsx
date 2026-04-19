'use client';

import { ChevIcon, SparkleIcon } from '@/components/icons';

export type ChatHeaderProps = {
  turnCount: number;
  onNewChat: () => void;
  onCollapse: () => void;
  collapseLabel?: string;
};

export function ChatHeader({ turnCount, onNewChat, onCollapse, collapseLabel = 'Collapse' }: ChatHeaderProps) {
  return (
    <header className="px-4 pt-4 pb-3 border-b border-gold-300/15 relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-4 h-4 text-gold-300" />
          <h2 className="font-serif text-[17px] text-text-primary leading-none">EPAU Copilot</h2>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={collapseLabel}
          className="h-7 w-7 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary transition-colors flex items-center justify-center"
        >
          <ChevIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 h-5 rounded-sm text-[10.5px] font-medium uppercase tracking-[0.08em] border bg-white/[0.03] text-text-tertiary border-white/10">
          Session
          <span className="ml-1 text-text-secondary num normal-case tracking-normal">
            {turnCount} {turnCount === 1 ? 'turn' : 'turns'}
          </span>
        </span>
        <button
          type="button"
          onClick={onNewChat}
          disabled={turnCount === 0}
          className="text-[11px] text-gold-200 hover:text-gold-100 disabled:text-text-quat disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-sm border border-gold-300/20 hover:border-gold-300/40 disabled:border-white/5"
        >
          New chat
        </button>
      </div>
    </header>
  );
}
