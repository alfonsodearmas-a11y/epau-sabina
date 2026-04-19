'use client';

// Shown when the interpreter resolves a query to multiple candidate
// indicators. The caller passes the candidate list and message; we render a
// click-to-select grid.
import { SparkleIcon } from '@/components/icons';

export interface DisambiguationCandidate {
  id: string;
  name?: string;
  reason: string;
}

export interface DisambiguationProps {
  candidates: DisambiguationCandidate[];
  message: string;
  onPick: (id: string) => void;
}

export function Disambiguation({ candidates, message, onPick }: DisambiguationProps) {
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-start gap-2 mb-2">
        <div className="text-gold-300 mt-0.5">
          <SparkleIcon className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[13px] text-text-primary">
            {message || 'Which indicator did you mean?'}
          </div>
          <div className="text-[11px] text-text-tertiary">
            Pick one to run, or refine the query.
          </div>
        </div>
      </div>
      {candidates.length === 0 ? (
        <div className="text-[12px] text-text-tertiary py-4 text-center">
          No candidate indicators came back; rephrase and try again.
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-2 mt-2 ${candidates.length >= 3 ? 'md:grid-cols-3' : candidates.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {candidates.map((c) => (
            <button key={c.id} onClick={() => onPick(c.id)}
              className="text-left p-3 rounded-md bg-white/[0.02] border border-white/8 hover:border-gold-300/40 hover:bg-gold-300/5 transition-colors">
              <div className="text-[12.5px] text-text-primary font-medium leading-tight">
                {c.name ?? c.id}
              </div>
              <div className="text-[10.5px] text-text-tertiary mt-1">{c.reason}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
