'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pill } from '@/components/ui/Pill';
import { ChevIcon } from '@/components/icons';

export type TraceStep = {
  id: string;
  step: number;
  role: string;
  toolName: string | null;
  toolCallId: string | null;
  content: unknown;
  latencyMs: number | null;
  stopReason: string | null;
  promptCacheHit: boolean | null;
  tokenIn: number | null;
  tokenOut: number | null;
  modelId: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  createdAt: string;
};

export type Turn = {
  turnIndex: number;
  userMsg: string;
  wallMs: number;
  steps: TraceStep[];
  auditResult: string | null;
  finalStopReason: string | null;
};

export type SessionHeader = {
  id: string;
  userEmail: string;
  surface: string;
  startedAt: string;
  lastTurnAt: string | null;
  turnCount: number;
  totalToolCalls: number;
  auditFailures: number;
};

export function TraceDetailPage({ session, turns }: { session: SessionHeader; turns: Turn[] }) {
  return (
    <div className="px-4 md:px-8 pt-6 pb-16 md:pb-24 max-w-[1400px] mx-auto">
      <div className="mb-4">
        <Link href="/admin/traces" className="text-[11.5px] uppercase tracking-[0.14em] text-text-tertiary hover:text-gold-200">
          ← admin · agent traces
        </Link>
      </div>

      <div className="glass rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-mono text-[14px] text-text-primary">{session.id}</h1>
          {session.auditFailures > 0 ? <Pill tone="danger">{session.auditFailures} audit failures</Pill> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-[11.5px]">
          <Stat label="User" value={session.userEmail} />
          <Stat label="Surface" value={session.surface} />
          <Stat label="Started" value={fmtDate(session.startedAt)} />
          <Stat label="Last turn" value={session.lastTurnAt ? fmtDate(session.lastTurnAt) : '—'} />
          <Stat label="Turns" value={String(session.turnCount)} />
          <Stat label="Tool calls" value={String(session.totalToolCalls)} />
        </div>
      </div>

      <div className="space-y-3">
        {turns.map((t) => <TurnBlock key={t.turnIndex} turn={t} />)}
        {turns.length === 0 ? (
          <div className="glass rounded-lg p-6 text-center text-text-tertiary">no turns in this session</div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</div>
      <div className="text-text-primary mt-0.5 truncate" title={value}>{value}</div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: Turn }) {
  const [open, setOpen] = useState(turn.auditResult === 'failed');
  const audit = turn.auditResult;
  const auditTone: 'cool' | 'gold' | 'danger' | 'neutral' =
    audit === 'pass' ? 'cool'
    : audit === 'retried_pass' ? 'gold'
    : audit === 'failed' ? 'danger'
    : 'neutral';

  return (
    <div className="glass rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/5 hover:bg-white/[0.02]"
      >
        <ChevIcon className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">turn {turn.turnIndex}</span>
        <span className="text-[12.5px] text-text-primary truncate flex-1">
          {turn.userMsg || <em className="text-text-tertiary">(no user message)</em>}
        </span>
        {audit ? <Pill tone={auditTone}>audit: {audit}</Pill> : null}
        <span className="text-[11px] text-text-tertiary num">{(turn.wallMs / 1000).toFixed(1)}s</span>
      </button>
      {open ? (
        <div className="divide-y divide-white/5">
          {turn.steps.map((s) => <StepRow key={s.id} step={s} />)}
        </div>
      ) : null}
    </div>
  );
}

function StepRow({ step }: { step: TraceStep }) {
  const tone: 'cool' | 'gold' | 'warn' | 'neutral' =
    step.role === 'assistant' ? 'gold'
    : step.role === 'tool_call' ? 'cool'
    : step.role === 'tool_result' ? 'cool'
    : step.role === 'system_event' ? 'warn'
    : 'neutral';

  return (
    <div className="px-4 py-2.5 hover:bg-white/[0.02]">
      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
        <span className="num w-10">#{step.step}</span>
        <Pill tone={tone}>{step.role}{step.toolName ? ` · ${step.toolName}` : ''}</Pill>
        {step.latencyMs !== null ? <span className="num">{step.latencyMs} ms</span> : null}
        {step.tokenIn !== null ? <span className="num">in {step.tokenIn}</span> : null}
        {step.tokenOut !== null ? <span className="num">out {step.tokenOut}</span> : null}
        {step.promptCacheHit ? <span>cache hit</span> : null}
        {step.modelId ? <span className="font-mono text-[10px]">{step.modelId}</span> : null}
        {step.errorCode ? <Pill tone="danger">{step.errorCode}</Pill> : null}
      </div>
      <ContentBlock role={step.role} content={step.content} />
    </div>
  );
}

function ContentBlock({ role, content }: { role: string; content: unknown }) {
  if (content === null || content === undefined) return null;

  if (role === 'user') {
    const text = (content as { text?: unknown }).text;
    if (typeof text === 'string') {
      return <div className="mt-1 text-[13px] text-text-primary">{text}</div>;
    }
  }

  if (role === 'assistant') {
    const text = (content as { text?: unknown }).text;
    if (typeof text === 'string' && text.trim()) {
      return <div className="mt-1 text-[12.5px] text-text-secondary whitespace-pre-wrap">{text}</div>;
    }
  }

  if (role === 'system_event') {
    return <JsonPreview value={content} />;
  }

  return <JsonPreview value={content} />;
}

function JsonPreview({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  const text = JSON.stringify(value, null, 2);
  const short = text.length > 240 ? text.slice(0, 240) + '…' : text;
  return (
    <div className="mt-1.5">
      <button onClick={() => setOpen((v) => !v)} className="text-[10.5px] text-text-tertiary hover:text-gold-200">
        {open ? 'collapse' : 'expand'} · {text.length} chars
      </button>
      <pre className="mt-1 bg-white/[0.02] border border-white/5 rounded-sm p-2 text-[11px] font-mono overflow-x-auto scroll-thin text-text-secondary whitespace-pre-wrap">
{open ? text : short}
      </pre>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
