import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      workbookFilename: true,
      workbookSizeBytes: true,
      indicatorsUpserted: true,
      observationsUpserted: true,
      comparisonTablesUpserted: true,
      issuesCount: true,
      status: true,
      notes: true,
    },
  });
  return NextResponse.json({
    runs: runs.map((r) => ({
      ...r,
      workbookSizeBytes: r.workbookSizeBytes === null ? null : Number(r.workbookSizeBytes),
    })),
  });
}
