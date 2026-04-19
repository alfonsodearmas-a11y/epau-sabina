'use client';

import { useCallback, useEffect, useState } from 'react';

export const PANEL_COOKIE = 'epau_panel_state';
export type PanelState = 'open' | 'collapsed';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

export function useAgentPanel(initial: PanelState = 'open') {
  const [state, setState] = useState<PanelState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCookie(PANEL_COOKIE);
    if (stored === 'open' || stored === 'collapsed') setState(stored);
    setHydrated(true);
  }, []);

  const setAndPersist = useCallback((next: PanelState) => {
    setState(next);
    writeCookie(PANEL_COOKIE, next);
  }, []);

  const toggle = useCallback(() => {
    setAndPersist(state === 'open' ? 'collapsed' : 'open');
  }, [state, setAndPersist]);

  return { state, hydrated, setState: setAndPersist, toggle };
}
