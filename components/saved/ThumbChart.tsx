// Tiny inline preview chart rendered as pure SVG (no Recharts).
// Ported from docs/design/surfaces.jsx.

import type { SavedViewChart } from '@/lib/types';

const POINTS: Record<SavedViewChart, string | null> = {
  area: 'M0,40 L0,22 Q20,20 40,18 T80,14 T120,10 T160,8 T200,6 L200,40 Z',
  line: 'M0,32 Q20,26 40,30 T80,16 T120,20 T160,8 T200,12',
  'line-fall': 'M0,8 Q20,10 40,12 T80,16 T120,20 T160,24 T200,22',
  'bar-paired': null,
  dual: 'M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6',
};

export function ThumbChart({ kind }: { kind: SavedViewChart }) {
  const d = POINTS[kind];
  const gradientId = `thumb_${kind}`;
  return (
    <div className="h-20 rounded-md bg-white/[0.02] border border-white/5 relative overflow-hidden">
      <svg
        viewBox="0 0 200 40"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {kind === 'bar-paired' ? (
          <g>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <g key={i}>
                <rect
                  x={i * 28 + 8}
                  y={20 + (i % 2 === 0 ? 0 : 2)}
                  width="8"
                  height={20 - (i % 2 === 0 ? 0 : 2)}
                  fill="#D4AF37"
                />
                <rect
                  x={i * 28 + 18}
                  y={16 + (i % 3 === 0 ? 2 : 0)}
                  width="8"
                  height={24 - (i % 3 === 0 ? 2 : 0)}
                  fill="#7AA7D9"
                />
              </g>
            ))}
          </g>
        ) : kind === 'dual' ? (
          <g>
            <path
              d="M0,28 Q20,26 40,24 T80,20 T120,18 T160,14 T200,10"
              stroke="#7AA7D9"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6"
              stroke="#D4AF37"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        ) : kind === 'area' ? (
          <path
            d={d ?? ''}
            stroke="#D4AF37"
            strokeWidth="1.5"
            fill={`url(#${gradientId})`}
          />
        ) : (
          <path d={d ?? ''} stroke="#D4AF37" strokeWidth="1.5" fill="none" />
        )}
      </svg>
    </div>
  );
}
