import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAnthropic, modelName } from '@/lib/anthropic';
import { buildNarratorMessages, NARRATOR_PROMPT_VERSION } from '@/lib/prompts/narrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query : '';
  const indicatorIds: string[] = Array.isArray(body?.indicatorIds) ? body.indicatorIds : [];
  if (!query || !indicatorIds.length) {
    return NextResponse.json({ error: 'query and indicatorIds required' }, { status: 400 });
  }

  const [indicators, observations] = await Promise.all([
    prisma.indicator.findMany({ where: { id: { in: indicatorIds } } }),
    prisma.observation.findMany({
      where: { indicatorId: { in: indicatorIds } },
      orderBy: [{ indicatorId: 'asc' }, { periodDate: 'asc' }],
    }),
  ]);
  if (!indicators.length) return NextResponse.json({ error: 'no_indicators_found' }, { status: 404 });

  const anthropic = getAnthropic();
  const { system, messages } = buildNarratorMessages({
    originalQuery: query,
    indicators: indicators.map((i) => ({
      id: i.id, name: i.name, unit: i.unit, frequency: i.frequency, source: i.source, caveat: i.caveat,
    })),
    observations: observations.map((o) => ({
      indicatorId: o.indicatorId,
      periodLabel: o.periodLabel,
      value: o.value === null ? null : Number(o.value),
      scenario: o.scenario,
    })),
  });
  const resp = await anthropic.messages.create({
    model: modelName(),
    max_tokens: 700,
    temperature: 0.4,
    system,
    messages,
  });
  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
  // Post-process: strip any accidental emdashes or code fences.
  const cleaned = text.replace(/[—–]/g, ', ').replace(/^```[\s\S]*?\n?/, '').replace(/```$/, '').trim();
  return NextResponse.json({ ok: true, commentary: cleaned, promptVersion: NARRATOR_PROMPT_VERSION });
}
