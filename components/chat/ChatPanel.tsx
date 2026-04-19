'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SparkleIcon, CloseIcon } from '@/components/icons';
import { useAgentPanel } from './hooks/useAgentPanel';
import { useAgentStream } from './hooks/useAgentStream';
import { useAgentSurfaceContext } from './hooks/useAgentSurfaceContext';
import { useAgentKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { EmptyState } from './EmptyState';
import { TurnBlock } from './TurnBlock';

export function ChatPanel() {
  const panel = useAgentPanel('open');
  const surface = useAgentSurfaceContext();
  const { turns, isStreaming, send, clear } = useAgentStream();

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const panelRootRef = useRef<HTMLElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Autoscroll on new events.
  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const handleSend = useCallback(
    (text: string) => {
      void send({
        message: text,
        surface: surface.surface,
        surface_context: surface.context,
      });
    },
    [send, surface.surface, surface.context],
  );

  const handleNewChat = useCallback(() => {
    clear();
  }, [clear]);

  const openAndFocus = useCallback(() => {
    if (isMobile) setMobileOpen(true);
    else if (panel.state !== 'open') panel.setState('open');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isMobile, panel]);

  useAgentKeyboardShortcuts({
    inputRef,
    onOpenAndFocus: openAndFocus,
    onNewChat: handleNewChat,
    isInsidePanel: (el) => !!el && !!panelRootRef.current && panelRootRef.current.contains(el),
  });

  if (surface.isExcluded) return null;

  // Desktop collapsed: slim sliver with an icon; click expands.
  if (!isMobile && panel.state === 'collapsed') {
    return (
      <aside
        ref={panelRootRef}
        role="complementary"
        aria-label="EPAU Copilot (collapsed)"
        className="hidden md:flex fixed right-0 top-[48px] bottom-0 w-12 border-l border-gold-300/15 glass items-start justify-center pt-6 z-30"
      >
        <button
          type="button"
          onClick={() => panel.setState('open')}
          aria-label="Open EPAU Copilot"
          className="w-8 h-8 rounded-md text-gold-300 hover:bg-white/5 flex items-center justify-center"
        >
          <SparkleIcon className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  if (isMobile && !mobileOpen) {
    return (
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open EPAU Copilot"
        className="md:hidden fixed bottom-5 right-5 w-14 h-14 rounded-full glass-strong gold-ring text-gold-300 flex items-center justify-center z-40 safe-bottom"
      >
        <SparkleIcon className="w-5 h-5" />
      </button>
    );
  }

  const panelClasses = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-[#0A0E1A]/98 glass-strong'
    : 'hidden md:flex fixed right-0 top-[48px] bottom-0 w-[400px] flex-col border-l border-gold-300/15 glass z-30';

  return (
    <aside
      ref={panelRootRef}
      role="complementary"
      aria-label="EPAU Copilot"
      className={panelClasses}
    >
      {isMobile ? (
        <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top">
          <span className="font-serif text-[17px] text-text-primary">EPAU Copilot</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
            className="h-8 w-8 rounded-md hover:bg-white/5 text-text-tertiary hover:text-text-secondary flex items-center justify-center"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <ChatHeader
          turnCount={turns.length}
          onNewChat={handleNewChat}
          onCollapse={() => panel.setState('collapsed')}
        />
      )}

      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-5"
      >
        {turns.length === 0 ? (
          <EmptyState onPick={handleSend} />
        ) : (
          turns.map((t) => (
            <TurnBlock
              key={t.id}
              turn={t}
              onAlternativeClick={(indicatorId, comparisonTableId) => {
                if (indicatorId) handleSend(`Show me ${indicatorId}`);
                else if (comparisonTableId) handleSend(`Open comparison table ${comparisonTableId}`);
              }}
            />
          ))
        )}
      </div>

      <ChatInput
        ref={inputRef}
        disabled={isStreaming}
        onSubmit={handleSend}
        surfaceLabel={surface.label}
        placeholder={isStreaming ? 'Assistant is replying…' : undefined}
      />
    </aside>
  );
}
