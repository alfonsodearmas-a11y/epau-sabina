import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAnthropic, modelName } from '@/lib/anthropic';
import { buildInterpreterMessages, parseInterpretation, INTERPRETER_PROMPT_VERSION } from '@/lib/prompts/interpreter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const indicators = await prisma.indicator.findMany({
    select: { id: true, name: true, category: true, frequency: true, unit: true, caveat: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  const catalogIds = new Set(indicators.map((i) => i.id));

  const anthropic = getAnthropic();
  const { system, messages } = buildInterpreterMessages(query, indicators);
  const resp = await anthropic.messages.create({
    model: modelName(),
    max_tokens: 1200,
    temperature: 0,
    system,
    messages,
  });
  const raw = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
  try {
    const result = parseInterpretation(raw, catalogIds);
    return NextResponse.json({ ok: true, result, promptVersion: INTERPRETER_PROMPT_VERSION });
  } catch (e) {
    return NextResponse.json({ error: 'interpreter_failed', detail: (e as Error).message, raw }, { status: 502 });
  }
}
