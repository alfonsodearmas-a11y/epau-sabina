'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAgentPanel } from './hooks/useAgentPanel';
import { resolveSurface } from './hooks/useAgentSurfaceContext';

const OPEN_WIDTH_PX = 400;
const COLLAPSED_WIDTH_PX = 48;

export function ChatPanelSpacer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, hydrated } = useAgentPanel('open');
  const surface = resolveSurface(pathname);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (surface.isExcluded) return <>{children}</>;

  // Reserve space on desktop so the fixed right-edge panel doesn't occlude
  // the main content. Mobile uses a floating overlay; no spacer needed.
  const pad = isDesktop
    ? (!hydrated || state === 'open' ? OPEN_WIDTH_PX : COLLAPSED_WIDTH_PX)
    : 0;

  return (
    <div className="transition-[padding] duration-200" style={{ paddingRight: pad }}>
      {children}
    </div>
  );
}
