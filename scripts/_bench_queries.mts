#!/usr/bin/env -S tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.EPAU_URL ?? 'http://localhost:3000';
const OUT = process.env.BENCH_OUT ?? '/tmp/epau-bench';
mkdirSync(OUT, { recursive: true });

const USER = 'alfonso.dearmas@mpua.gov.gy';
const prisma = new PrismaClient();

type Query = { id: string; surface: 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin'; message: string };

const QUERIES: Query[] = [
  { id: 'q1_simple_factual',   surface: 'workbench', message: 'What was inflation in 2023?' },
  { id: 'q2_comparative',      surface: 'workbench', message: "Compare Guyana's GDP growth to global GDP growth over the past ten years and tell me what's notable." },
  { id: 'q3_report_note',      surface: 'workbench', message: "Draft a 200-word note on the NRF's performance since inception for the Minister's budget speech." },
  { id: 'q4_structural',       surface: 'workbench', message: 'What are the three biggest shifts in private sector credit composition since 2015?' },
  { id: 'q5_unavailable',      surface: 'workbench', message: "What's the Gini coefficient for Guyana?" },
];

type Event = { type: string; [k: string]: unknown };

async function runOne(q: Query) {
  console.log(`\n=== ${q.id} === ${q.message}`);
  const start = Date.now();

  const res = await fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-epau-user-resolved': USER,
    },
    body: JSON.stringify({
      message: q.message,
      surface: q.surface,
      start_new_session: true,
    }),
  });
  if (!res.ok || !res.body) {
    console.error(`bad response ${res.status}`);
    return;
  }

  const events: Event[] = [];
  let sessionId: string | null = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) {
      const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      try {
        const ev = JSON.parse(dataLine.slice(6)) as Event;
        events.push(ev);
        if (ev.type === 'session') sessionId = String(ev.session_id);
      } catch { /* ignore */ }
    }
  }
  const wallMs = Date.now() - start;

  // Assemble text. If an audit-failed event resets the timeline, restart from
  // there so we capture only what the user actually sees post-retry.
  let textBuf = '';
  const userVisibleRenders: Event[] = [];
  for (const e of events) {
    if (e.type === 'text_delta') textBuf += String(e.text ?? '');
    else if (e.type === 'render') userVisibleRenders.push(e);
    else if (e.type === 'audit' && e.result === 'failed') {
      textBuf = '';
      userVisibleRenders.length = 0;
    }
  }
  const finalText = textBuf;

  const toolCalls = events.filter((e) => e.type === 'tool_call');
  const renders = userVisibleRenders;
  const turnEnd = events.find((e) => e.type === 'turn_end');
  const audits = events.filter((e) => e.type === 'audit').map((e) => ({
    result: (e as { result?: string }).result,
    unground: (e as { unground?: unknown[] }).unground?.length ?? 0,
  }));

  // Pull traces
  let traces: unknown[] = [];
  if (sessionId) {
    const rows = await prisma.agentTrace.findMany({
      where: { sessionId },
      orderBy: { stepIndex: 'asc' },
    });
    traces = rows.map((r) => ({
      step: r.stepIndex,
      role: r.role,
      tool: r.toolName,
      toolCallId: r.toolCallId,
      latencyMs: r.latencyMs,
      stopReason: r.stopReason,
      promptCacheHit: r.promptCacheHit,
      tokenIn: r.tokenCountInput,
      tokenOut: r.tokenCountOutput,
      errorCode: r.errorCode,
      content: r.content,
    }));
  }

  const bundle = {
    query: q,
    wallMs,
    sessionId,
    summary: {
      toolCallCount: toolCalls.length,
      renderCount: renders.length,
      stopReason: (turnEnd as { stop_reason?: string } | undefined)?.stop_reason ?? null,
      steps: (turnEnd as { steps?: number } | undefined)?.steps ?? null,
      audits,
      finalAudit: audits.length ? audits[audits.length - 1]!.result : null,
    },
    finalText,
    toolCalls: toolCalls.map((e) => ({ tool: e.tool_name, input: e.input })),
    renders: renders.map((e) => ({ kind: e.kind, payload: e.payload })),
    events,
    traces,
  };

  writeFileSync(
    join(OUT, `${q.id}.json`),
    JSON.stringify(bundle, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  console.log(`  wall=${wallMs}ms  steps=${bundle.summary.steps}  tools=${toolCalls.length}  renders=${renders.length}  stop=${bundle.summary.stopReason}`);
  console.log(`  → ${join(OUT, q.id + '.json')}`);
}

async function main() {
  const filter = process.argv[2];
  for (const q of QUERIES) {
    if (filter && !q.id.includes(filter)) continue;
    await runOne(q);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
