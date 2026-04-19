#!/usr/bin/env -S tsx
// Delete indicators from the live DB that no longer exist in the current
// dry-run catalog OR that have zero observations. Cascades to observations.
//
// Use after an ingest rewrite that renames or drops indicator IDs. The
// zero-obs sweep catches shells left behind when Prisma's skipDuplicates
// deduped every observation out from under an indicator.
//
//   env $(grep -E '^(DATABASE_URL|DIRECT_URL)=' .env.local | xargs) tsx scripts/cleanup_orphans.ts [--dry]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import type { IndicatorRecord } from './ingest/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { values } = parseArgs({ options: { dry: { type: 'boolean', default: false } } });

const catalog: IndicatorRecord[] = JSON.parse(
  readFileSync(join(__dirname, 'ingest', 'output', 'indicators.json'), 'utf8'),
);
const expected = new Set(catalog.map((i) => i.id));

const prisma = new PrismaClient();

interface Row { id: string; sourceTab: string; name: string }

async function main() {
  const live = await prisma.indicator.findMany({ select: { id: true, sourceTab: true, name: true } });
  const orphans: Row[] = live.filter((i) => !expected.has(i.id));
  const empty = await prisma.indicator.findMany({
    where: { observations: { none: {} } },
    select: { id: true, sourceTab: true, name: true },
  });
  const orphanIds = new Set(orphans.map((o) => o.id));
  const targets: Row[] = [...orphans, ...empty.filter((e) => !orphanIds.has(e.id))];
  console.log(`expected ${expected.size} indicators; live has ${live.length}; ${orphans.length} renamed + ${empty.length} empty = ${targets.length} total to remove`);
  if (!targets.length) return;

  const byTab = new Map<string, Row[]>();
  for (const o of targets) {
    const arr = byTab.get(o.sourceTab) ?? [];
    arr.push(o);
    byTab.set(o.sourceTab, arr);
  }
  for (const [tab, list] of [...byTab.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${tab}: ${list.length}`);
    for (const o of list.slice(0, 5)) console.log(`    ${o.id}  "${o.name}"`);
    if (list.length > 5) console.log(`    …and ${list.length - 5} more`);
  }

  if (values.dry) { console.log('\n--dry: no deletes performed'); return; }
  const ids = targets.map((t) => t.id);
  const deleted = await prisma.indicator.deleteMany({ where: { id: { in: ids } } });
  console.log(`\ndeleted ${deleted.count} indicators (observations cascaded)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
