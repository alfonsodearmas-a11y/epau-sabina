'use client';

// Fixed-position status bar pinned to the bottom of every page.
// Ported from docs/design/app.jsx with Next.js pathname-based label lookup.

import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  '/workbench': 'Workbench',
  '/catalog': 'Indicator Catalog',
  '/saved': 'Saved Views',
  '/comparisons': 'Comparisons',
  '/admin': 'Ingestion Admin',
};

export function BottomStatus() {
  const pathname = usePathname() ?? '/workbench';
  const key =
    Object.keys(LABELS).find((k) => pathname.startsWith(k)) ?? '/workbench';
  const label = LABELS[key] ?? 'Workbench';

  return (
    <div className="hidden md:block fixed bottom-0 left-0 right-0 h-6 bg-ink-950/85 backdrop-blur border-t border-white/5 z-20">
      <div className="max-w-[1500px] mx-auto h-full px-8 flex items-center justify-between text-[10.5px] text-text-tertiary font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#7FC29B]" /> connected
          </span>
          <span>{label}</span>
          <span>workbook rev 2026.03.17</span>
        </div>
        <div className="flex items-center gap-4">
          <span>1,384 indicators · 94,726 observations</span>
          <span>GYT 14:22</span>
        </div>
      </div>
    </div>
  );
}
