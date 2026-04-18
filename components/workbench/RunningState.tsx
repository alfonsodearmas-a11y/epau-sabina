'use client';

// Skeleton + step list shown while the workbench resolves a query.
// Ported from docs/design/workbench.jsx.

import { CheckIcon } from '@/components/icons';

interface Step {
  label: string;
  done: boolean;
  active?: boolean;
}

const STEPS: Step[] = [
  { label: 'Parsing query intent', done: true },
  { label: 'Matching indicators against catalog', done: true },
  { label: 'Fetching observations (1,247 rows)', done: false, active: true },
  { label: 'Rendering chart', done: false },
];

export function RunningState() {
  return (
    <div className="grid grid-cols-[1fr_320px] gap-3 mt-3 fade-up">
      <div className="glass rounded-lg p-4 h-[420px] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" />
          <span className="text-[11.5px] uppercase tracking-[0.14em] text-gold-300 font-medium">
            Running
          </span>
          <span className="text-[11px] text-text-tertiary ml-auto num">1.2s</span>
        </div>
        <div className="space-y-2 mb-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[12px]">
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  s.done
                    ? 'bg-gold-300/20 border-gold-300/50'
                    : s.active
                    ? 'border-gold-300'
                    : 'border-white/15'
                }`}
              >
                {s.done ? (
                  <CheckIcon className="w-2.5 h-2.5 text-gold-300" />
                ) : s.active ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" />
                ) : null}
              </span>
              <span
                className={
                  s.done
                    ? 'text-text-secondary'
                    : s.active
                    ? 'text-text-primary'
                    : 'text-text-tertiary'
                }
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="0"
                y1={40 * i + 10}
                x2="400"
                y2={40 * i + 10}
                stroke="rgba(255,255,255,0.04)"
              />
            ))}
            <path
              d="M 10 160 Q 60 150, 90 140 T 170 110 T 250 80 T 330 60 T 390 40"
              stroke="rgba(212,175,55,0.45)"
              strokeWidth="1.8"
              fill="none"
              strokeDasharray="4 4"
              className="skeleton-bar"
            />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {[56, 80, 120].map((h, i) => (
          <div key={i} className="glass rounded-lg p-3">
            <div
              className="skeleton-bar h-2 w-20 bg-white/10 rounded mb-2"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
            <div
              className="skeleton-bar h-1.5 bg-white/5 rounded mb-1.5"
              style={{ animationDelay: `${i * 0.15 + 0.1}s` }}
            />
            <div
              className="skeleton-bar h-1.5 w-3/4 bg-white/5 rounded mb-1.5"
              style={{ animationDelay: `${i * 0.15 + 0.2}s` }}
            />
            <div
              className="skeleton-bar h-1.5 w-5/6 bg-white/5 rounded"
              style={{
                animationDelay: `${i * 0.15 + 0.3}s`,
                height: h > 100 ? '40px' : undefined,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
