// Caveats panel ported from docs/design/workbench.jsx.

import { WarnIcon } from '@/components/icons';

export interface Caveat {
  level: 'info' | 'warn';
  text: string;
}

export function CaveatsPanel({ caveats }: { caveats: Caveat[] }) {
  return (
    <div className="glass rounded-lg overflow-hidden border-l-2 border-l-[#E0A050]/40">
      <div className="px-4 pt-2 pb-1.5 flex items-center gap-2">
        <WarnIcon className="w-3.5 h-3.5 text-[#E0A050]" />
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">
          Caveats
        </span>
        <span className="num text-text-quat text-[10.5px] ml-auto">
          {caveats.length}
        </span>
      </div>
      {caveats.map((c, i) => (
        <div key={i} className="px-4 py-2 border-t border-white/5 flex gap-2">
          <span
            className={`w-1 mt-1 shrink-0 self-stretch rounded-sm ${
              c.level === 'warn' ? 'bg-[#E0A050]/60' : 'bg-white/15'
            }`}
          />
          <span className="text-[11.5px] text-text-secondary leading-snug">
            {c.text}
          </span>
        </div>
      ))}
    </div>
  );
}
