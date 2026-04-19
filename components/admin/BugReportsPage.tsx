'use client';

// /admin/bug-reports — newest-first list of analyst-filed data issues.
import { useEffect, useState, useCallback } from 'react';

interface BugReport {
  id: string;
  userEmail: string;
  indicatorIds: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  note: string;
  resolved: boolean;
  createdAt: string;
}

type Filter = 'open' | 'resolved' | 'all';
type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; rows: BugReport[] };

export function BugReportsPage() {
  const [filter, setFilter] = useState<Filter>('open');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback((signal?: AbortSignal) => {
    setState({ kind: 'loading' });
    const qs = filter === 'open' ? '?resolved=false' : filter === 'resolved' ? '?resolved=true' : '';
    fetch(`/api/bug-reports${qs}`, { signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as { reports: BugReport[] };
      })
      .then((body) => setState({ kind: 'loaded', rows: body.reports }))
      .catch((e) => {
        if ((e as { name?: string }).name === 'AbortError') return;
        setState({ kind: 'error', message: (e as Error).message });
      });
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function setResolved(id: string, resolved: boolean) {
    await fetch(`/api/bug-reports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });
    load();
  }

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Bug reports</h1>
          <p className="text-[13px] text-text-tertiary mt-1">
            Analyst-filed issues from workbench charts. Each is raw, unmoderated feedback to investigate and either
            fix in the ingestion layer, document as intentional in the indicator caveat, or escalate.
          </p>
        </div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-md p-0.5">
          {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 h-7 text-[12px] rounded ${
                filter === f ? 'bg-white/10 text-text-primary' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {state.kind === 'error' ? <div className="text-[12px] text-[#E08080]">{state.message}</div> : null}

      {state.kind === 'loading' ? (
        <div className="text-[12px] text-text-tertiary">Loading…</div>
      ) : state.kind === 'loaded' && state.rows.length === 0 ? (
        <div className="glass rounded-lg p-6 text-center text-[13px] text-text-tertiary">
          No {filter === 'all' ? '' : filter + ' '}reports yet.
        </div>
      ) : state.kind === 'loaded' ? (
        <div className="space-y-2">
          {state.rows.map((r) => (
            <div key={r.id} className="glass rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text-tertiary mb-1">
                    <span className="text-text-secondary">{r.userEmail}</span>
                    <span className="mx-2">·</span>
                    {new Date(r.createdAt).toLocaleString()}
                    {r.dateRangeStart || r.dateRangeEnd ? (
                      <>
                        <span className="mx-2">·</span>
                        range {r.dateRangeStart ?? '?'} → {r.dateRangeEnd ?? '?'}
                      </>
                    ) : null}
                  </div>
                  <div className="text-[13.5px] text-text-primary whitespace-pre-wrap">{r.note}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.indicatorIds.map((id) => (
                      <code key={id} className="text-[11px] text-text-tertiary bg-white/[0.03] border border-white/10 rounded px-1.5 py-0.5">{id}</code>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setResolved(r.id, !r.resolved)}
                  className={`h-8 px-3 rounded-md text-[11.5px] border ${
                    r.resolved
                      ? 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-text-primary'
                      : 'bg-[#7FC29B]/10 border-[#7FC29B]/30 text-[#7FC29B] hover:bg-[#7FC29B]/20'
                  }`}
                >
                  {r.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
