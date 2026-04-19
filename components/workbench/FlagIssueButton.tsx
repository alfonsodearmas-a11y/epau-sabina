'use client';

// Minimal "Flag issue" control on each chart. Opens an inline form that posts
// to /api/bug-reports.
import { useEffect, useRef, useState } from 'react';
import { WarnIcon } from '@/components/icons';

export interface FlagIssueButtonProps {
  indicatorIds: string[];
  defaultDateStart?: string;
  defaultDateEnd?: string;
}

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string };

export function FlagIssueButton({ indicatorIds, defaultDateStart, defaultDateEnd }: FlagIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [start, setStart] = useState(defaultDateStart ?? '');
  const [end, setEnd] = useState(defaultDateEnd ?? '');
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  async function submit() {
    if (!note.trim()) { setState({ kind: 'error', message: 'please describe the issue' }); return; }
    setState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indicatorIds,
          dateRangeStart: start || null,
          dateRangeEnd: end || null,
          note: note.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'failed');
      setState({ kind: 'sent' });
      setNote('');
      closeTimer.current = setTimeout(() => { setOpen(false); setState({ kind: 'idle' }); }, 1400);
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Something wrong with this chart? Flag it for review."
        className="h-8 px-3 rounded-md bg-white/[0.02] border border-white/10 text-text-tertiary hover:text-text-primary hover:border-white/20 text-[12px] flex items-center gap-1.5 transition-colors"
      >
        <WarnIcon className="w-3.5 h-3.5" /> Flag issue
      </button>
    );
  }

  const errorMessage = state.kind === 'error' ? state.message : null;
  const submitting = state.kind === 'submitting';
  const sent = state.kind === 'sent';

  return (
    <div className="glass rounded-lg p-3 w-[360px] border border-white/10">
      <div className="text-[12px] text-text-secondary mb-2">
        Flagging {indicatorIds.length} indicator{indicatorIds.length === 1 ? '' : 's'}.
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What looks wrong? e.g. values for 2023 look off; GDP growth chart shows ratios instead of percents."
        rows={3}
        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-quat resize-none focus:outline-none focus:border-white/20"
      />
      <div className="mt-2 flex items-center gap-2 text-[11px] text-text-tertiary">
        <label className="flex items-center gap-1">
          From
          <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="e.g. 2020" className="w-20 bg-black/20 border border-white/10 rounded px-1.5 py-0.5 text-text-primary text-[11px]" />
        </label>
        <label className="flex items-center gap-1">
          To
          <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="e.g. 2024" className="w-20 bg-black/20 border border-white/10 rounded px-1.5 py-0.5 text-text-primary text-[11px]" />
        </label>
      </div>
      {errorMessage ? <div className="mt-2 text-[11px] text-[#E08080]">{errorMessage}</div> : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setState({ kind: 'idle' }); }}
          className="h-7 px-2.5 rounded-md text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="h-7 px-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[11.5px] disabled:opacity-50"
        >
          {sent ? 'Sent ✓' : submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
