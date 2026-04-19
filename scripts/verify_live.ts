#!/usr/bin/env -S tsx
// Quick live-DB verification. Confirms the indicator count, a few expected
// names, and spot-values for the checklist queries Sabina will run.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NAME_CHECKS = [
  { sheet: 'NRF', name: 'Petroleum Revenue Deposits' },
  { sheet: 'NRF', name: 'Royalties' },
  { sheet: 'NRF', name: 'Closing Balance' },
  { sheet: 'Private Sector Credit', name: 'Total Private Sector Credit' },
  { sheet: 'Central Gov Ops', name: 'Total Revenue' },
  { sheet: 'Central Gov Ops', name: 'Tax' },
  { sheet: 'GDP Growth by Sector', name: 'Overall GDP Growth' },
];

const VALUE_CHECKS: Array<{ id: string; period: string; scenario: string; expected: number; tol: number }> = [
  { id: 'nrf_petroleum_revenue_deposits', period: '2020', scenario: 'actual', expected: 198302.3, tol: 0.5 },
  { id: 'psc_total_private_sector_credit', period: '2023', scenario: 'actual', expected: 376119.4, tol: 1 },
  { id: 'gdp_growth_sector_overall_gdp_growth', period: '2022', scenario: 'actual', expected: 63.33, tol: 0.05 },
  { id: 'cgo_tax', period: '2023', scenario: 'actual', expected: 366615.01, tol: 1 },
];

async function main() {
  const indCount = await prisma.indicator.count();
  const obsCount = await prisma.observation.count();
  console.log(`indicators=${indCount}  observations=${obsCount}`);
  if (indCount < 900) throw new Error(`indicator count too low: ${indCount}`);

  const bug = await prisma.bugReport.count();
  console.log(`bug_reports table present, row count=${bug}`);

  for (const { sheet, name } of NAME_CHECKS) {
    const hit = await prisma.indicator.findFirst({ where: { sourceTab: sheet, name } });
    if (!hit) throw new Error(`missing name "${name}" on ${sheet}`);
    console.log(`  ok  ${sheet} / ${name}  (${hit.id})`);
  }

  for (const c of VALUE_CHECKS) {
    const row = await prisma.observation.findFirst({
      where: { indicatorId: c.id, periodLabel: c.period, scenario: c.scenario as 'actual' | 'budget' | 'revised' | 'projection' },
    });
    if (!row || row.value === null) throw new Error(`missing obs ${c.id} ${c.period}`);
    const got = Number(row.value);
    const delta = Math.abs(got - c.expected);
    if (delta > c.tol) throw new Error(`value mismatch ${c.id} ${c.period}: got ${got} expected ${c.expected} Δ=${delta}`);
    console.log(`  ok  ${c.id} ${c.period}  value=${got}`);
  }

  console.log('\nall live checks passed');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
