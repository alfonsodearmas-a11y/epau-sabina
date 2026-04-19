'use client';

// Application frame wrapping every route. Owns the Cmd+K / Escape keybinding
// wiring and renders the top nav, the palette modal portal, the chat panel,
// and the bottom status bar around the page's children.

import { useEffect, useState, type ReactNode } from 'react';

import { TopNav } from '@/components/layout/TopNav';
import { BottomStatus } from '@/components/layout/BottomStatus';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ChatPanelSpacer } from '@/components/chat/ChatPanelSpacer';

export interface AppFrameProps {
  children: ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((x) => !x);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="min-h-screen">
      <TopNav onOpenPalette={() => setPaletteOpen(true)} />
      <ChatPanelSpacer>
        <main>{children}</main>
      </ChatPanelSpacer>
      <ChatPanel />
      {paletteOpen ? (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      ) : null}
      <BottomStatus />
    </div>
  );
}
