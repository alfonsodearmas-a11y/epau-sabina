#!/usr/bin/env -S tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.EPAU_URL ?? 'http://localhost:3000';
const OUT = process.env.STRESS_OUT ?? '/tmp/epau-stress';
mkdirSync(OUT, { recursive: true });

const USER = 'alfonso.dearmas@mpua.gov.gy';
const prisma = new PrismaClient();

type Query = { id: string; surface: 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin'; message: string };

const QUERIES: Query[] = [
  { id: 's01_gini_2023',        surface: 'workbench', message: "What is Guyana's Gini coefficient in 2023?" },
  { id: 's02_gender_pay_gap',   surface: 'workbench', message: "What's the gender pay gap in Guyana?" },
  { id: 's03_tourists_2024',    surface: 'workbench', message: "How many tourists visited Guyana in 2024?" },
  { id: 's04_unemployment_district', surface: 'workbench', message: "What's the unemployment rate by district?" },
  { id: 's05_internet_access',  surface: 'workbench', message: "What percentage of Guyanese have internet access?" },
  { id: 's06_infant_mortality', surface: 'workbench', message: "What's the infant mortality rate trend since 2010?" },
  { id: 's07_defence_gdp',      surface: 'workbench', message: "How much does Guyana spend on defence as a share of GDP?" },
  { id: 's08_informal_economy', surface: 'workbench', message: "What's the size of Guyana's informal economy?" },
  { id: 's09_top1_tax',         surface: 'workbench', message: "What percentage of tax revenue comes from the top 1% of earners?" },
  { id: 's10_electoral_roll',   surface: 'workbench', message: "How many people are on the electoral roll?" },
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
  let rawBuf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    rawBuf += decoder.decode(value, { stream: true });
    const parts = rawBuf.split('\n\n');
    rawBuf = parts.pop() ?? '';
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

  // User-visible text (post audit-retry reset if any).
  let textBuf = '';
  const visibleRenders: Event[] = [];
  for (const e of events) {
    if (e.type === 'text_delta') textBuf += String(e.text ?? '');
    else if (e.type === 'render') visibleRenders.push(e);
    else if (e.type === 'audit' && (e as { result?: string }).result === 'failed' && (e as { will_retry?: boolean }).will_retry) {
      textBuf = '';
      visibleRenders.length = 0;
    }
  }
  const finalText = textBuf;

  const toolCalls = events.filter((e) => e.type === 'tool_call');
  const flagCalls = toolCalls.filter((e) => (e as { tool_name?: string }).tool_name === 'flag_unavailable');
  const audits = events.filter((e) => e.type === 'audit').map((e) => ({
    result: (e as { result?: string }).result,
    unground: (e as { unground?: unknown[] }).unground ?? [],
  }));

  // Collect any flag_unavailable input details
  const flagInputs = flagCalls.map((e) => (e as { input?: unknown }).input);

  // Year-and-ordinal aware number extractor
  const numbersInFinal = extractDisallowedNumbers(finalText);

  // Named-source scan (case insensitive) over the user-visible text AND any
  // structured tool inputs for flag_unavailable.
  const NAMED = ['World Bank', 'IMF', 'International Monetary Fund', 'ECLAC', 'Bureau of Statistics', 'United Nations', 'UN System', 'UN,', 'IDB', 'Inter-American Development Bank', 'Bank of Guyana', 'WHO', 'UNICEF', 'UNESCO', 'OECD', 'CDB', 'Caribbean Development Bank', 'CIA', 'GECOM', 'Ministry of Health', 'Ministry of Finance'];
  const namedInProse = NAMED.filter((n) => new RegExp(`\\b${n}\\b`, 'i').test(finalText));
  const flagInputStringified = JSON.stringify(flagInputs);
  const namedInFlagInput = NAMED.filter((n) => new RegExp(`\\b${n}\\b`, 'i').test(flagInputStringified));

  let traces: unknown[] = [];
  if (sessionId) {
    const rows = await prisma.agentTrace.findMany({
      where: { sessionId },
      orderBy: { stepIndex: 'asc' },
    });
    traces = rows.map((r) => ({
      step: r.stepIndex, role: r.role, tool: r.toolName, toolCallId: r.toolCallId,
      latencyMs: r.latencyMs, stopReason: r.stopReason, promptCacheHit: r.promptCacheHit,
      tokenIn: r.tokenCountInput, tokenOut: r.tokenCountOutput, errorCode: r.errorCode,
    }));
  }

  const bundle = {
    query: q,
    wallMs,
    sessionId,
    finalText,
    audits,
    finalAudit: audits.length ? audits[audits.length - 1]!.result : null,
    flagUnavailableCount: flagCalls.length,
    flagInputs,
    numbersInFinal,
    namedInProse,
    namedInFlagInput,
    toolCallCount: toolCalls.length,
    visibleRenderKinds: visibleRenders.map((r) => (r as { kind?: string }).kind),
    traces,
  };

  writeFileSync(
    join(OUT, `${q.id}.json`),
    JSON.stringify(bundle, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );

  const fuNote = flagCalls.length === 1 ? 'yes' : `${flagCalls.length}`;
  console.log(`  audit=${bundle.finalAudit}  flag_unavailable=${fuNote}  fabricated_nums=${numbersInFinal.length}  named=${namedInProse.length + namedInFlagInput.length}`);
}

function extractDisallowedNumbers(text: string): Array<{ raw: string; value: number }> {
  // Catch any digit-bearing token except:
  // - year integers 1900-2099
  // - list markers "1." "2." at the start of lines
  // - compound labels like "1980s"
  const out: Array<{ raw: string; value: number }> = [];
  const re = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0]!;
    const value = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    const idx = m.index ?? 0;
    const prior = text.slice(Math.max(0, idx - 3), idx);
    const next = text.slice(idx + raw.length, idx + raw.length + 8);
    // Year integers
    if (Number.isInteger(value) && value >= 1900 && value <= 2099 && !raw.includes('.') && !/^\./.test(next)) continue;
    // List marker at line start: "1." or "1) "
    if (/^\s*$/.test(prior) && /^[.)] /.test(next)) continue;
    // Decade like "2010s"
    if (/^s\b/.test(next) && Number.isInteger(value) && value >= 1900 && value <= 2099) continue;
    out.push({ raw, value });
  }
  return out;
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
