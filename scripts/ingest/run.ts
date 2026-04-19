#!/usr/bin/env -S tsx
/* Main ingest entrypoint. Runs:
 *   1. Parse 'List of Sheets' for MoF caveats
 *   2. Archetype A / B / C configs through generic runners
 *   3. Archetype D bespoke adapters (NRF, GOG Investment)
 *   4. Archetype E multi-block configs
 *   5. Archetype F/G comparison_tables
 *   6. Raw snapshots for every sheet
 *   7. Flush to JSON (dry) or DB (live)
 *
 * Usage:
 *   npm run ingest             # dry run, writes to scripts/ingest/output/
 *   npm run ingest -- --live   # writes to Supabase (requires DATABASE_URL)
 *   npm run ingest -- --file /path/to/other.xlsx
 */
import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkbook, makeContext } from './lib/context';
import { parseListOfSheets, applyIndicatorCaveats } from './lib/caveats';
import { captureAllSnapshots } from './lib/snapshots';
import { runArchetypeA, runArchetypeB, runArchetypeC } from './lib/runners';
import { runMultiBlock } from './lib/multiblock';
import { runComparison } from './lib/comparisons';
import { makeDbSink, makeJsonSink, type IngestSink } from './lib/sinks';
import { ARCHETYPE_A } from './configs/archetype_a';
import { ARCHETYPE_B } from './configs/archetype_b';
import { ARCHETYPE_C } from './configs/archetype_c';
import { ARCHETYPE_E } from './configs/archetype_e';
import { ARCHETYPE_F } from './configs/archetype_f';
import { ARCHETYPE_G } from './configs/archetype_g';
import { runNRF } from './adapters/nrf';
import { runGogInvestment } from './adapters/gog_investment';
import { runBOP } from './adapters/bop';
import { runMortgagesCB } from './adapters/mortgages_cb';
import { runCapexSector } from './adapters/capex_sector';
import { runPricesSummary } from './adapters/prices_summary';
import { runRevenueExpenditure } from './adapters/revenue_expenditure';
import { runApnuFuel } from './adapters/apnu_fuel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_WORKBOOK = process.env.EPAU_WORKBOOK_PATH
  ?? '/Users/alfonsodearmas/EPAU Sabina/Guyana Key Statistics_06022026 for Donald.xlsx';

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
      live: { type: 'boolean', default: false },
      dry:  { type: 'boolean', default: false },
    },
  });
  const path = values.file ?? DEFAULT_WORKBOOK;
  const lb = loadWorkbook(path);
  console.log(`[ingest] loaded ${lb.filename} (${(lb.sizeBytes / 1024 / 1024).toFixed(2)} MB, ${lb.book.SheetNames.length} sheets)`);
  const ctx = makeContext(lb);
  const startedAt = new Date().toISOString();

  parseListOfSheets(lb.book, ctx);
  console.log(`[ingest] parsed List of Sheets; ${ctx.caveats.size} caveats captured`);

  // Archetype A
  for (const cfg of ARCHETYPE_A) {
    const before = ctx.observations.length;
    runArchetypeA(lb.book, cfg, ctx);
    console.log(`[ingest] A  ${cfg.sheet.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  // Archetype B
  for (const cfg of ARCHETYPE_B) {
    const before = ctx.observations.length;
    runArchetypeB(lb.book, cfg, ctx);
    console.log(`[ingest] B  ${cfg.sheet.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  // Archetype C
  for (const cfg of ARCHETYPE_C) {
    const before = ctx.observations.length;
    runArchetypeC(lb.book, cfg, ctx);
    console.log(`[ingest] C  ${cfg.sheet.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  // Archetype D (bespoke)
  {
    const before = ctx.observations.length;
    runNRF(lb.book, ctx);
    console.log(`[ingest] D  ${'NRF'.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  {
    const before = ctx.observations.length;
    runGogInvestment(lb.book, ctx);
    console.log(`[ingest] D  ${'GOG Investment'.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  // Archetype E — bespoke first, then generic multi-block for the rest
  const bespokeE: [string, () => void][] = [
    ['BOP', () => runBOP(lb.book, ctx)],
    ['Mortgages_CB', () => runMortgagesCB(lb.book, ctx)],
    ['Capital Expenditure_Sector', () => runCapexSector(lb.book, ctx)],
    ['Prices_Summary', () => runPricesSummary(lb.book, ctx)],
    ['Revenue & Expenditure', () => runRevenueExpenditure(lb.book, ctx)],
    ['APNU_Fuel Prices (obs)', () => runApnuFuel(lb.book, ctx)],
  ];
  for (const [name, fn] of bespokeE) {
    const before = ctx.observations.length;
    fn();
    console.log(`[ingest] E  ${name.padEnd(30)} +${ctx.observations.length - before} obs  (bespoke)`);
  }
  for (const cfg of ARCHETYPE_E) {
    const before = ctx.observations.length;
    runMultiBlock(lb.book, cfg, ctx);
    console.log(`[ingest] E  ${cfg.sheet.padEnd(30)} +${ctx.observations.length - before} obs`);
  }
  // Archetype F
  for (const cfg of ARCHETYPE_F) {
    const before = ctx.comparisonTables.length;
    runComparison(lb.book, cfg, ctx);
    const t = ctx.comparisonTables[ctx.comparisonTables.length - 1];
    const added = ctx.comparisonTables.length - before;
    console.log(`[ingest] F  ${cfg.sheet.padEnd(30)} +${added} table(s), ${t?.rows.length ?? 0} rows`);
  }
  // Archetype G
  for (const cfg of ARCHETYPE_G) {
    const before = ctx.comparisonTables.length;
    runComparison(lb.book, cfg, ctx);
    const t = ctx.comparisonTables[ctx.comparisonTables.length - 1];
    const added = ctx.comparisonTables.length - before;
    console.log(`[ingest] G  ${cfg.sheet.padEnd(30)} +${added} table(s), ${t?.rows.length ?? 0} rows`);
  }
  // Raw snapshots
  captureAllSnapshots(lb.book, ctx);
  console.log(`[ingest] snapshots: ${ctx.snapshots.length} sheets`);

  applyIndicatorCaveats(ctx);

  const finishedAt = new Date().toISOString();
  const issues = (ctx as unknown as { issues: import('./lib/types').Issue[] }).issues;

  const live = Boolean(values.live);
  const sink: IngestSink = live
    ? await makeDbSink()
    : makeJsonSink(join(__dirname, 'output'));
  const summary = await sink.flush(ctx, issues, {
    startedAt, finishedAt,
    workbookFilename: lb.filename,
    workbookSizeBytes: lb.sizeBytes,
  });

  console.log('');
  console.log('='.repeat(60));
  console.log(`  Mode            : ${sink.mode}`);
  console.log(`  Indicators      : ${summary.indicatorsUpserted}`);
  console.log(`  Observations    : ${summary.observationsUpserted}`);
  console.log(`  Comparisons     : ${summary.comparisonTablesUpserted}`);
  console.log(`  Issues          : ${summary.issuesCount}`);
  console.log(`  Status          : ${summary.status}`);
  if (summary.outputDir) console.log(`  Output          : ${summary.outputDir}`);
  console.log('='.repeat(60));
}

main().catch((e) => { console.error(e); process.exit(1); });
