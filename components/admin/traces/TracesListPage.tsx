'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pill } from '@/components/ui/Pill';
import { CopyIcon } from '@/components/icons';
import { useCallback } from 'react';

export type SessionRow = {
  id: string;
  userEmail: string;
  surface: string;
  startedAt: string;
  lastTurnAt: string | null;
  turnCount: number;
  toolCalls: number;
  auditFailures: number;
  flagUnavailableCalls: number;
};

export type Filters = {
  user: string;
  failures: boolean;
  flag_unavailable: boolean;
  range: string;
};

type Props = {
  rows: SessionRow[];
  total: number;
  page: number;
  pageSize: number;
  users: string[];
  filters: Filters;
};

export function TracesListPage({ rows, total, page, pageSize, users, filters }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const updateParam = useCallback((key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    router.push(`/admin/traces?${next.toString()}`);
  }, [router, sp]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-4 md:px-8 pt-6 pb-16 md:pb-24 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Admin · Agent Traces</div>
          <h1 className="font-serif text-[28px] md:text-[34px] leading-[1.1] text-text-primary mt-1">
            {total.toLocaleString()} {total === 1 ? 'session' : 'sessions'}
          </h1>
        </div>
      </div>

      <div className="glass rounded-lg p-3 mb-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">User</span>
          <select
            value={filters.user}
            onChange={(e) => updateParam('user', e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-sm text-[12px] px-2 py-1 text-text-primary"
          >
            <option value="">all</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Range</span>
          <select
            value={filters.range}
            onChange={(e) => updateParam('range', e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-sm text-[12px] px-2 py-1 text-text-primary"
          >
            <option value="24h">last 24h</option>
            <option value="7d">last 7 days</option>
            <option value="30d">last 30 days</option>
            <option value="all">all</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
          <input
            type="checkbox"
            checked={filters.failures}
            onChange={(e) => updateParam('failures', e.target.checked ? '1' : null)}
          />
          audit failures
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
          <input
            type="checkbox"
            checked={filters.flag_unavailable}
            onChange={(e) => updateParam('flag_unavailable', e.target.checked ? '1' : null)}
          />
          has flag_unavailable
        </label>
      </div>

      <div className="glass rounded-lg overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-[0.1em] text-text-tertiary bg-white/[0.02] border-b border-white/5">
                <th className="text-left px-3 py-2 font-medium">Session</th>
                <th className="text-left px-3 py-2 font-medium">User</th>
                <th className="text-left px-3 py-2 font-medium">Surface</th>
                <th className="text-left px-3 py-2 font-medium">Started</th>
                <th className="text-left px-3 py-2 font-medium">Last turn</th>
                <th className="text-right px-3 py-2 font-medium">Turns</th>
                <th className="text-right px-3 py-2 font-medium">Tools</th>
                <th className="text-left px-3 py-2 font-medium">Audit fails</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/traces/${r.id}`} className="font-mono text-gold-200 hover:text-gold-100 text-[11.5px]">
                        {r.id.slice(0, 8)}
                      </Link>
                      <CopyButton value={r.id} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{r.userEmail}</td>
                  <td className="px-3 py-2 text-text-tertiary">{r.surface}</td>
                  <td className="px-3 py-2 text-text-tertiary num text-[11px]">{fmtDate(r.startedAt)}</td>
                  <td className="px-3 py-2 text-text-tertiary num text-[11px]">{r.lastTurnAt ? fmtDate(r.lastTurnAt) : '—'}</td>
                  <td className="px-3 py-2 text-right num">{r.turnCount}</td>
                  <td className="px-3 py-2 text-right num">{r.toolCalls}</td>
                  <td className="px-3 py-2">
                    {r.auditFailures > 0 ? (
                      <Pill tone="danger">{r.auditFailures}</Pill>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-text-tertiary">no sessions match</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-3 mt-3 text-[12px] text-text-secondary">
          <span>page {page} / {pageCount}</span>
          <Link
            aria-disabled={page <= 1}
            href={`/admin/traces?${new URLSearchParams({ ...Object.fromEntries(sp), page: String(page - 1) }).toString()}`}
            className={`px-2 py-1 rounded-sm border border-white/10 ${page <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-white/[0.04]'}`}
          >prev</Link>
          <Link
            aria-disabled={page >= pageCount}
            href={`/admin/traces?${new URLSearchParams({ ...Object.fromEntries(sp), page: String(page + 1) }).toString()}`}
            className={`px-2 py-1 rounded-sm border border-white/10 ${page >= pageCount ? 'opacity-40 pointer-events-none' : 'hover:bg-white/[0.04]'}`}
          >next</Link>
        </div>
      ) : null}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function CopyButton({ value }: { value: string }) {
  const copy = () => navigator.clipboard?.writeText(value).catch(() => {});
  return (
    <button
      onClick={copy}
      aria-label="Copy session id"
      className="text-text-tertiary hover:text-gold-200"
    >
      <CopyIcon className="w-3 h-3" />
    </button>
  );
}
