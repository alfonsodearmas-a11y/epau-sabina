import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.getAll('indicator_id');
  if (!idsParam.length) return NextResponse.json({ error: 'indicator_id required' }, { status: 400 });
  const ids = idsParam.flatMap((p) => p.split(',')).map((s) => s.trim()).filter(Boolean);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const scenario = url.searchParams.get('scenario');

  const where: Record<string, unknown> = { indicatorId: { in: ids } };
  if (scenario) where.scenario = scenario;
  if (start || end) {
    const range: Record<string, Date> = {};
    if (start) range.gte = new Date(start);
    if (end) range.lte = new Date(end);
    where.periodDate = range;
  }

  const rows = await prisma.observation.findMany({
    where: where as never,
    orderBy: [{ indicatorId: 'asc' }, { periodDate: 'asc' }],
  });
  return NextResponse.json({
    observations: rows.map((r) => ({
      indicatorId: r.indicatorId,
      periodDate: r.periodDate.toISOString().slice(0, 10),
      periodLabel: r.periodLabel,
      value: r.value === null ? null : Number(r.value),
      isEstimate: r.isEstimate,
      scenario: r.scenario,
    })),
  });
}
