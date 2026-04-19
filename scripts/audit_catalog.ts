#!/usr/bin/env -S tsx
/**
 * Catalog audit — systematic data-quality scan of the ingested catalog.
 *
 *   npm run audit                 # dry-run JSON (default)
 *   npm run audit -- --live       # live DB via Prisma
 *   npm run audit -- --json       # machine-readable JSON output
 *   npm run audit -- --md         # (default) write a markdown report under docs/audit_reports/
 *   npm run audit -- --stdout     # also echo a pretty report to stdout
 *
 * Checks:
 *   - Junk names (single char, numeric, roman, subtotal/header strings, source refs, etc.)
 *   - Single-character indicator IDs
 *   - Name equals source_tab / duplicates within a tab
 *   - Zero observations / all-null observations
 *   - Obs count < 3 (parser probably hit the wrong row)
 *   - Unit-range plausibility:
 *       percent: all |v| < 1 → mis-scaled ratio
 *                any |v| > 500 → probably wrong unit
 *       G$ millions: median < 1 → probably billions mislabeled
 *                    median > 10,000,000 → probably thousands mislabeled
 *       US$ millions: same bounds as G$ but scaled 1:1
 *   - Gap: obs count noticeably less than the indicator's period span
 *   - Staleness: latest observation date > 3 years before today
 *
 * Does NOT delete or modify anything. Report only.
 */
import { parseArgs } from 'node:util';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IndicatorRecord, ObservationRecord } from './ingest/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DRY_OUTPUT = join(__dirname, 'ingest', 'output');
const REPORT_DIR = join(__dirname, '..', 'docs', 'audit_reports');
const STALE_MAX_YEARS = 3;
const LOW_OBS_THRESHOLD = 3;

// ---------- Junk-pattern detectors ----------
const ROMAN = /^[IVXLCDM]+$/i;
// 2-char country / region codes that are legitimate names. The short_name flag
// would otherwise fire for every FDI-by-country row where the source workbook
// uses the abbreviation. Extend as new geographies surface.
const COUNTRY_CODES_2 = new Set(['uk', 'us', 'eu', 'uae', 'ae', 'au', 'nz', 'za', 'cn']);
const JUNK_WORDS = new Set([
  'total', 'subtotal', 'sub-total', 'sub total', 'grand total',
  'of which', 'of which:', 'memo', 'memo:', 'memo items', 'memorandum',
  'memorandum items', 'memorandum items:', 'sum', 'note', 'notes',
  'summary', 'source', 'sources', 'item', 'items',
]);

type Flag =
  | 'single_char_name'
  | 'single_char_id'
  | 'numeric_only_name'
  | 'roman_numeral_name'
  | 'short_name'
  | 'junk_keyword_name'
  | 'name_equals_source_tab'
  | 'zero_observations'
  | 'all_null_observations'
  | 'low_observation_count'
  | 'percent_all_lt_1'
  | 'percent_any_gt_500'
  | 'gd_mill_too_small'
  | 'gd_mill_too_large'
  | 'usd_mill_too_small'
  | 'usd_mill_too_large'
  | 'large_period_gaps'
  | 'stale_observations';

interface Finding {
  id: string; name: string; sourceTab: string; unit: string;
  flags: Flag[];
  n: number;       // non-null observation count
  nullCount: number;
  min: number | null; median: number | null; max: number | null;
  firstDate: string | null; lastDate: string | null;
}

function normalize(s: string): string { return s.trim().toLowerCase().replace(/\s+/g, ' '); }

function classifyNames(ind: IndicatorRecord): Flag[] {
  const flags: Flag[] = [];
  const name = ind.name ?? '';
  const idTail = ind.id.split('_').slice(1).join('_') || ind.id;
  if (name.trim().length === 1) flags.push('single_char_name');
  if (idTail.length === 1) flags.push('single_char_id');
  if (/^\d+(\.\d+)?$/.test(name.trim())) flags.push('numeric_only_name');
  if (ROMAN.test(name.trim())) flags.push('roman_numeral_name');
  if (
    name.trim().length > 0 &&
    name.trim().length < 3 &&
    !flags.includes('single_char_name') &&
    !COUNTRY_CODES_2.has(name.trim().toLowerCase())
  ) flags.push('short_name');
  if (JUNK_WORDS.has(normalize(name))) flags.push('junk_keyword_name');
  if (normalize(name) === normalize(ind.sourceTab)) flags.push('name_equals_source_tab');
  return flags;
}

function classifyValues(ind: IndicatorRecord, obs: ObservationRecord[]): { flags: Flag[]; stats: { n: number; nullCount: number; min: number | null; med: number | null; max: number | null; first: string | null; last: string | null } } {
  const flags: Flag[] = [];
  const nullCount = obs.filter((o) => o.value === null).length;
  const nums = obs.map((o) => o.value).filter((v): v is number => v !== null && Number.isFinite(v));
  const n = nums.length;
  nums.sort((a, b) => a - b);
  const min = nums[0] ?? null;
  const max = nums[nums.length - 1] ?? null;
  const med = nums[Math.floor(nums.length / 2)] ?? null;

  if (obs.length === 0) flags.push('zero_observations');
  else if (n === 0) flags.push('all_null_observations');
  if (n > 0 && n < LOW_OBS_THRESHOLD) flags.push('low_observation_count');

  const unit = (ind.unit ?? '').toLowerCase();
  if (/percent/.test(unit) || unit === '%') {
    if (n > 0 && nums.every((v) => Math.abs(v) < 1) && (max ?? 0) !== 0) flags.push('percent_all_lt_1');
    if (n > 0 && nums.some((v) => Math.abs(v) > 500)) flags.push('percent_any_gt_500');
  }
  if (/g\$ (millions|m)/.test(unit)) {
    if (med !== null && med !== 0 && Math.abs(med) < 1) flags.push('gd_mill_too_small');
    if (med !== null && Math.abs(med) > 1e7) flags.push('gd_mill_too_large');
  }
  if (/us\$ (millions|m)/.test(unit)) {
    if (med !== null && med !== 0 && Math.abs(med) < 1) flags.push('usd_mill_too_small');
    if (med !== null && Math.abs(med) > 1e7) flags.push('usd_mill_too_large');
  }

  // Date-based checks
  const dates = obs.map((o) => o.periodDate).filter(Boolean).sort();
  const first = dates[0] ?? null;
  const last = dates[dates.length - 1] ?? null;
  if (last) {
    const lastYear = Number(last.slice(0, 4));
    const nowYear = new Date().getUTCFullYear();
    if (Number.isFinite(lastYear) && nowYear - lastYear > STALE_MAX_YEARS) flags.push('stale_observations');
  }
  // Gap check: if we have first and last and obs are annual, expected span is
  // (lastYear - firstYear + 1). Compare to observation count.
  if (first && last && obs.length >= 3) {
    const span = Number(last.slice(0, 4)) - Number(first.slice(0, 4)) + 1;
    if (ind.frequency === 'annual' && span > obs.length * 2) flags.push('large_period_gaps');
  }

  return { flags, stats: { n, nullCount, min, med, max, first, last } };
}

async function loadLive(): Promise<{ inds: IndicatorRecord[]; obs: ObservationRecord[] }> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const inds = await prisma.indicator.findMany();
  const obs = await prisma.observation.findMany();
  await prisma.$disconnect();
  return {
    inds: inds.map((i) => i as unknown as IndicatorRecord),
    obs: obs.map((o) => ({
      indicatorId: o.indicatorId,
      periodDate: o.periodDate.toISOString().slice(0, 10),
      periodLabel: o.periodLabel,
      value: o.value === null ? null : Number(o.value),
      scenario: o.scenario as ObservationRecord['scenario'],
    })),
  };
}

function loadJson(): { inds: IndicatorRecord[]; obs: ObservationRecord[] } {
  const indPath = join(DRY_OUTPUT, 'indicators.json');
  const obsPath = join(DRY_OUTPUT, 'observations.json');
  if (!existsSync(indPath) || !existsSync(obsPath)) {
    console.error('[audit] dry-run output missing. Run `npm run ingest` first.');
    process.exit(2);
  }
  return {
    inds: JSON.parse(readFileSync(indPath, 'utf8')),
    obs: JSON.parse(readFileSync(obsPath, 'utf8')),
  };
}

function fmtNum(n: number | null, digits = 3): string {
  if (n === null) return '—';
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(digits);
}

// ---------- Main ----------
async function main() {
  const { values } = parseArgs({
    options: {
      live:    { type: 'boolean', default: false },
      json:    { type: 'boolean', default: false },
      md:      { type: 'boolean', default: true },
      stdout:  { type: 'boolean', default: false },
    },
  });
  const { inds, obs } = values.live ? await loadLive() : loadJson();

  const obsByInd = new Map<string, ObservationRecord[]>();
  for (const o of obs) {
    const arr = obsByInd.get(o.indicatorId) ?? [];
    arr.push(o);
    obsByInd.set(o.indicatorId, arr);
  }

  const findings: Finding[] = [];
  const summaries = new Map<string, Finding>();
  for (const ind of inds) {
    const obsList = obsByInd.get(ind.id) ?? [];
    const nameFlags = classifyNames(ind);
    const { flags: valueFlags, stats } = classifyValues(ind, obsList);
    const all: Flag[] = [...nameFlags, ...valueFlags];
    const entry: Finding = {
      id: ind.id, name: ind.name, sourceTab: ind.sourceTab, unit: ind.unit,
      flags: all, n: stats.n, nullCount: stats.nullCount,
      min: stats.min, median: stats.med, max: stats.max,
      firstDate: stats.first, lastDate: stats.last,
    };
    summaries.set(ind.id, entry);
    if (all.length) findings.push(entry);
  }

  const flagCounts: Partial<Record<Flag, number>> = {};
  for (const f of findings) for (const fl of f.flags) flagCounts[fl] = (flagCounts[fl] ?? 0) + 1;

  // By tab
  const byTab = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = byTab.get(f.sourceTab) ?? [];
    arr.push(f);
    byTab.set(f.sourceTab, arr);
  }

  if (values.json) {
    console.log(JSON.stringify({ totalIndicators: inds.length, suspectCount: findings.length, flagCounts, findings }, null, 2));
    return;
  }

  // ---------- Markdown report ----------
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportLines: string[] = [];
  reportLines.push(`# Catalog Audit — ${stamp}`);
  reportLines.push('');
  reportLines.push(`- Source: ${values.live ? 'live DB' : 'dry-run JSON'}`);
  reportLines.push(`- Total indicators: **${inds.length}**`);
  reportLines.push(`- Suspect indicators: **${findings.length}** (${((findings.length / inds.length) * 100).toFixed(1)}%)`);
  reportLines.push(`- Tabs with flags: **${byTab.size}**`);
  reportLines.push('');
  reportLines.push('## Flag counts');
  reportLines.push('');
  reportLines.push('| Flag | Count |');
  reportLines.push('|------|------:|');
  for (const [flag, count] of Object.entries(flagCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
    reportLines.push(`| ${flag} | ${count} |`);
  }
  reportLines.push('');

  reportLines.push('## Findings by source tab');
  reportLines.push('');
  const tabs = [...byTab.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [tab, list] of tabs) {
    reportLines.push(`### ${tab} — ${list.length} flagged`);
    reportLines.push('');
    reportLines.push('| id | name | unit | flags | n | min | median | max | first | last |');
    reportLines.push('|----|------|------|-------|--:|----:|-------:|----:|-------|------|');
    for (const f of list) {
      reportLines.push(`| \`${f.id}\` | ${f.name} | ${f.unit} | ${f.flags.join(', ')} | ${f.n} | ${fmtNum(f.min)} | ${fmtNum(f.median)} | ${fmtNum(f.max)} | ${f.firstDate ?? '—'} | ${f.lastDate ?? '—'} |`);
    }
    reportLines.push('');
  }

  // Stat summary for ALL indicators (not just flagged) so the user can eyeball
  // ranges across the catalog.
  reportLines.push('## Range summary (all indicators)');
  reportLines.push('');
  reportLines.push('Indicators are sorted alphabetically within each source tab. Columns: n = count of non-null observations.');
  reportLines.push('');
  const tabSummary = new Map<string, Finding[]>();
  for (const [id, f] of summaries) {
    const arr = tabSummary.get(f.sourceTab) ?? [];
    arr.push(f);
    tabSummary.set(f.sourceTab, arr);
    void id;
  }
  for (const tab of [...tabSummary.keys()].sort()) {
    const list = (tabSummary.get(tab) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    reportLines.push(`### ${tab} — ${list.length} indicator(s)`);
    reportLines.push('');
    reportLines.push('| id | name | unit | n | min | median | max | last |');
    reportLines.push('|----|------|------|--:|----:|-------:|----:|------|');
    for (const f of list) {
      reportLines.push(`| \`${f.id}\` | ${f.name} | ${f.unit} | ${f.n} | ${fmtNum(f.min)} | ${fmtNum(f.median)} | ${fmtNum(f.max)} | ${f.lastDate ?? '—'} |`);
    }
    reportLines.push('');
  }

  let reportPath = '';
  if (values.md) {
    mkdirSync(REPORT_DIR, { recursive: true });
    reportPath = join(REPORT_DIR, `catalog_audit_${stamp}.md`);
    writeFileSync(reportPath, reportLines.join('\n'));
  }

  // ---------- Stdout pretty summary ----------
  console.log('='.repeat(70));
  console.log(`  Catalog audit`);
  console.log(`  Source: ${values.live ? 'live DB' : 'dry-run JSON'}`);
  console.log(`  Total indicators: ${inds.length}`);
  console.log(`  Suspect indicators: ${findings.length}  (${((findings.length / inds.length) * 100).toFixed(1)}%)`);
  console.log(`  Tabs with flags: ${byTab.size}`);
  console.log('='.repeat(70));
  console.log('');
  console.log('Flag counts:');
  for (const [flag, count] of Object.entries(flagCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
    console.log(`  ${flag.padEnd(28)} ${count}`);
  }
  console.log('');
  if (values.stdout) {
    for (const [tab, list] of tabs) {
      console.log(`--- ${tab}  (${list.length} flagged) ---`);
      for (const f of list.slice(0, 40)) {
        console.log(`  ${f.id.padEnd(50)} [${f.flags.join(',')}]  n=${f.n}  min=${fmtNum(f.min)} med=${fmtNum(f.median)} max=${fmtNum(f.max)}`);
      }
      if (list.length > 40) console.log(`  ... and ${list.length - 40} more`);
    }
  }
  if (reportPath) {
    console.log('');
    console.log(`  Markdown report: ${reportPath}`);
  }
  console.log('='.repeat(70));
}

main().catch((e) => { console.error(e); process.exit(2); });
