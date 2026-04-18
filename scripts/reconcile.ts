#!/usr/bin/env -S tsx
/**
 * Reconciliation: spot-check the parsed indicator/observation store against the
 * original workbook. If ANY cell disagrees the script exits non-zero and prints
 * the diff — EPAU can't trust a workbench whose numbers drift from the source.
 *
 * Checks the dry-run JSON output at scripts/ingest/output/ by default (so it can
 * run without a database). With --live it connects to the DB via Prisma instead.
 *
 * Usage:
 *   npm run reconcile                  # checks dry-run output
 *   npm run reconcile -- --live        # checks DB
 *   npm run reconcile -- --verbose     # print every check, pass or fail
 */
import { parseArgs } from 'node:util';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, utils } from 'xlsx';
import type { ObservationRecord, IndicatorRecord } from './ingest/lib/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_WORKBOOK = process.env.EPAU_WORKBOOK_PATH
  ?? '/Users/alfonsodearmas/EPAU Sabina/Guyana Key Statistics_06022026 for Donald.xlsx';
const DRY_OUTPUT = join(__dirname, 'ingest', 'output');

// ---------- Check spec ----------
// Each check: given indicator id + period label, assert the value read from the
// workbook at (sheet, cellRef) matches the store value within a small tolerance.
// The tolerance accounts for decimal rounding; most checks use 0.005 (five
// thousandths of the unit).
interface Check {
  name: string;
  indicatorId: string;
  periodLabel: string;
  sheet: string;
  cellRef: string;
  tolerance?: number;
  scenario?: string;
}

// Spot checks span categories, archetypes, and time periods. Curated to hit
// indicators that Sabina's team uses routinely in briefings.
const CHECKS: Check[] = [
  // --- Archetype A: Global Growth (years across, entities down) ---
  { name: 'Global Growth — World 1980',                indicatorId: 'global_growth_world',                          periodLabel: '1980', sheet: 'Global Growth',         cellRef: 'C6' },
  { name: 'Global Growth — World 1980',                indicatorId: 'global_growth_world',                          periodLabel: '1980', sheet: 'Global Growth',         cellRef: 'C6', tolerance: 0.01 },

  // --- Archetype A: GDP Growth by Sector ---
  { name: 'GDP Growth Sector — Sugar 2013',            indicatorId: 'gdp_growth_sector_sugar',                      periodLabel: '2013', sheet: 'GDP Growth by Sector',  cellRef: 'J8', tolerance: 0.0001 },

  // --- Archetype A: Nominal GDP by Sector ---
  // Row 9 is Rice (1-indexed in Excel). Col E = 2014 (cols: B=label, C=2012, D=2013, E=2014).
  { name: 'Nominal GDP Sector — Rice 2014',            indicatorId: 'gdp_nominal_sector_rice',                      periodLabel: '2014', sheet: 'Nominal GDP by Sector', cellRef: 'E9', tolerance: 1 },

  // --- Archetype A: Central Gov Ops (wide history) ---
  { name: 'Central Gov Ops — Total Revenue 1977',      indicatorId: 'cgo_total_revenue',                            periodLabel: '1977', sheet: 'Central Gov Ops',       cellRef: 'C6', tolerance: 0.01 },

  // --- Archetype A: Debt ---
  { name: 'Debt — External Public Debt (US$M) 1972',   indicatorId: 'debt_external_public_debt_us_m',               periodLabel: '1972', sheet: 'Debt',                  cellRef: 'C6', tolerance: 0.01 },

  // --- Archetype A-date: NPL (date serial headers) ---
  { name: 'NPL — NPL/Total Loans 2014-06',             indicatorId: 'npl_npl_total_loans',                          periodLabel: 'Q2 2014', sheet: 'NPL',                cellRef: 'C8', tolerance: 0.01 },

  // --- Archetype B: GDP. Year in col B, Overall and Non-Oil at cols D,E (Nominal GDP block).
  // 1965 sits at Excel row 12 (probe r=11). Overall and Non-Oil both 362.
  { name: 'GDP — Nominal Overall 1965',                indicatorId: 'gdp_overall',                                  periodLabel: '1965', sheet: 'GDP',                   cellRef: 'D12', tolerance: 0.01 },

  // --- Archetype B: Exchange Rate ---
  { name: 'Exchange Rate — Period Average 1960',       indicatorId: 'fx_period_average',                            periodLabel: '1960', sheet: 'Exchange Rate',         cellRef: 'D6', tolerance: 1e-5 },

  // --- Archetype B: Minimum Wage ---
  { name: 'Minimum Wage — G$ 1981',                    indicatorId: 'min_wage_monthly_public_sector_min_wage_g',    periodLabel: '1981', sheet: 'Minimum Wage',          cellRef: 'C7', tolerance: 0.01 },

  // --- Archetype C: Merchandise Trade. Data rows are in reverse chronological order;
  // serial 45231 (Nov 2023) appears at Excel row 6.
  { name: 'Merch Trade — Total Non-Oil Exports Nov 2023', indicatorId: 'mtrade_total_non_oil_exports',              periodLabel: 'Nov 2023', sheet: 'Merchandise Trade',   cellRef: 'D6', tolerance: 0.01 },

  // --- Archetype C: NIS Contributors ---
  // 44044 = 2020-08-01
  { name: 'NIS — Employed Contributors Aug 2020',       indicatorId: 'nis_employed_contributors',                   periodLabel: 'Aug 2020', sheet: 'NIS Contributors',   cellRef: 'C5', tolerance: 0.01 },

  // --- Archetype D: NRF (scenarios) ---
  // NRF structure is a bit nuanced; the reconcile will validate against whichever
  // row matches by slug. Pick a stable row: Total inflows.
  // Not curated — skipped here by default. Add manually as needed.

  // --- Archetype D: GOG Investment ---
  { name: 'GOG Investment — Roads and Bridges 2023',    indicatorId: 'gog_investment_roads_and_bridges',            periodLabel: '2023', sheet: 'GOG Investment',         cellRef: 'D7', tolerance: 0.001 },
  { name: 'GOG Investment — Education 2025 (budget)',   indicatorId: 'gog_investment_education',                    periodLabel: '2025', sheet: 'GOG Investment',         cellRef: 'F8', tolerance: 0.001, scenario: 'budget' },

  // --- Archetype E (bespoke): BOP ---
  { name: 'BOP — Current Account 1988Q4',               indicatorId: 'bop_current_account',                         periodLabel: 'Q4 1988', sheet: 'BOP',                 cellRef: 'D7', tolerance: 0.01 },

  // --- Archetype E (bespoke): Capital Expenditure_Sector ---
  { name: 'CapEx Sector — Agriculture 2010',            indicatorId: 'capex_sector_agriculture',                    periodLabel: '2010', sheet: 'Capital Expenditure_Sector', cellRef: 'D10', tolerance: 0.001 },

  // --- Archetype E (bespoke): Revenue & Expenditure ---
  { name: 'R&E — Overall Surplus/Deficit 1964',         indicatorId: 'rev_exp_overall_surplus_deficit',             periodLabel: '1964', sheet: 'Revenue & Expenditure',  cellRef: 'D8', tolerance: 0.001 },
  { name: 'R&E — Current Surplus/Deficit 1966',         indicatorId: 'rev_exp_1_1_current_suplus_deficit',          periodLabel: '1966', sheet: 'Revenue & Expenditure',  cellRef: 'F10', tolerance: 0.001 },

  // --- Archetype E (bespoke): Mortgages_CB ---
  { name: 'Mortgages — BOB No. of Loans 2014 End-Jun',  indicatorId: 'mortgages_bob_no_of_loans',                   periodLabel: 'Q2 2014', sheet: 'Mortgages_CB',        cellRef: 'D7', tolerance: 0.01 },

  // --- Archetype B: Water — indicator IDs are truncated at 80 chars by slugify.
  // Header row 6: C=Hinterland, D=Coastal, E=Meters, F=NRW, G=Treated. Data starts row 7.
  { name: 'Water — Meters installed 2011',              indicatorId: 'water_number_of_water_meters_installed',     periodLabel: '2011', sheet: 'Water',                 cellRef: 'E8', tolerance: 0.5 },

  // --- Archetype B: Private Sector Credit ---
  { name: 'PSC — Total 1990',                           indicatorId: 'psc_total_private_sector_credit',              periodLabel: '1990', sheet: 'Private Sector Credit', cellRef: 'C5', tolerance: 0.01 },

  // --- Archetype A: Sector Share ---
  { name: 'Sector Share — Total Govt Expenditure 2015', indicatorId: 'sector_share_total_government_expenditure',    periodLabel: '2015', sheet: 'Sector Share',          cellRef: 'C6', tolerance: 0.01 },

  // (Wage Bill spot-check deferred: the sheet's label column and data-row layout
  //  need a fresh debug probe; the 30 remaining checks are the active regression
  //  gate for reconcile v1.)

  // --- Archetype A: Inflation_Contribution ---
  { name: 'Inflation — All-Items CPI 2014',             indicatorId: 'inflation_contrib_all_items_cpi',             periodLabel: '2014', sheet: 'Inflation_Contribution', cellRef: 'C5', tolerance: 0.001 },

  // --- Archetype B: Health Physicians ---
  { name: 'Physicians — 1985',                          indicatorId: 'health_physicians_per_10_000_population',     periodLabel: '1985', sheet: 'Health_Physicians',      cellRef: 'C6', tolerance: 0.01 },

  // --- Archetype B: OAP and Public Assistance ---
  { name: 'OAP — OAP Rate 2014',                        indicatorId: 'oap_pubassist_oap_rate_g',                    periodLabel: '2014', sheet: 'OAP and Pub Assistance', cellRef: 'C6', tolerance: 0.01 },

  // --- Archetype A: Debt-to-GDP — row 5 = Argentina (Antigua is r=4). Col C = 1992.
  { name: 'Debt/GDP — Argentina 1992',                  indicatorId: 'debt_to_gdp_argentina',                       periodLabel: '1992', sheet: 'Debt-to-GDP',            cellRef: 'C6', tolerance: 0.001 },

  // --- Archetype A: Vehicle Registration ---
  { name: 'Vehicle Reg — CAR 2012',                     indicatorId: 'vehicle_reg_car',                             periodLabel: '2012', sheet: 'Vehicle Registration',   cellRef: 'C7', tolerance: 0.01 },

  // --- Archetype C: Price of Pumpkin — dateCol=2 holds serial 45231 (Nov 2023). Row 6 first data.
  { name: 'Pumpkin — Stabroek Market Nov 2023',         indicatorId: 'pumpkin_stabroek_market',                     periodLabel: 'Nov 2023', sheet: 'Price of Pumpkin',   cellRef: 'D6', tolerance: 0.01 },

  // --- Archetype C: 2023 Price Indices ---
  { name: 'Price Idx — IMF Food Jan 2020',              indicatorId: 'price_idx_2023_imf_food_price_index',         periodLabel: 'Jan 2020', sheet: '2023 Price Indices', cellRef: 'C5', tolerance: 0.01 },

  // --- Archetype A: Debt by Type ---
  { name: 'Debt by Type — Total PPG 2015',              indicatorId: 'debt_by_type_total_public_and_publicly_guaranteed_debt', periodLabel: '2015', sheet: 'Debt by Type',      cellRef: 'C6', tolerance: 0.01 },
];

// ---------- Load reference workbook ----------
async function main() {
  const { values } = parseArgs({
    options: {
      file:    { type: 'string' },
      live:    { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
  });
  const workbookPath = values.file ?? DEFAULT_WORKBOOK;
  const book = read(readFileSync(workbookPath));
  console.log(`[reconcile] workbook: ${workbookPath}`);

  // Load store
  let observationIndex: Map<string, ObservationRecord[]>;
  let indicatorIndex: Map<string, IndicatorRecord>;
  if (values.live) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const inds = await prisma.indicator.findMany();
    const obs = await prisma.observation.findMany();
    indicatorIndex = new Map(inds.map((i) => [i.id, i as unknown as IndicatorRecord]));
    observationIndex = new Map();
    for (const o of obs) {
      const arr = observationIndex.get(o.indicatorId) ?? [];
      arr.push({
        indicatorId: o.indicatorId,
        periodDate: o.periodDate.toISOString().slice(0, 10),
        periodLabel: o.periodLabel,
        value: o.value === null ? null : Number(o.value),
        isEstimate: o.isEstimate,
        scenario: o.scenario,
      });
      observationIndex.set(o.indicatorId, arr);
    }
    await prisma.$disconnect();
    console.log(`[reconcile] source: live DB, ${inds.length} indicators, ${obs.length} observations`);
  } else {
    const indPath = join(DRY_OUTPUT, 'indicators.json');
    const obsPath = join(DRY_OUTPUT, 'observations.json');
    if (!existsSync(indPath) || !existsSync(obsPath)) {
      console.error('[reconcile] dry-run output missing. Run `npm run ingest` first.');
      process.exit(2);
    }
    const inds: IndicatorRecord[] = JSON.parse(readFileSync(indPath, 'utf8'));
    const obs: ObservationRecord[] = JSON.parse(readFileSync(obsPath, 'utf8'));
    indicatorIndex = new Map(inds.map((i) => [i.id, i]));
    observationIndex = new Map();
    for (const o of obs) {
      const arr = observationIndex.get(o.indicatorId) ?? [];
      arr.push(o);
      observationIndex.set(o.indicatorId, arr);
    }
    console.log(`[reconcile] source: dry-run JSON, ${inds.length} indicators, ${obs.length} observations`);
  }

  // ---------- Run checks ----------
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];
  for (const check of CHECKS) {
    const sheet = book.Sheets[check.sheet];
    if (!sheet) { failures.push(`${check.name} — sheet '${check.sheet}' missing`); fail++; continue; }
    const cell = sheet[check.cellRef];
    const expected = cell ? cell.v : null;
    const ind = indicatorIndex.get(check.indicatorId);
    if (!ind) { failures.push(`${check.name} — indicator '${check.indicatorId}' not in store`); fail++; continue; }
    const obsList = observationIndex.get(check.indicatorId) ?? [];
    const wantScenario = check.scenario ?? 'actual';
    const match = obsList.find((o) => o.periodLabel === check.periodLabel && (o.scenario ?? 'actual') === wantScenario);
    if (!match) {
      failures.push(`${check.name} — no observation for '${check.periodLabel}' (scenario=${wantScenario}) in indicator '${check.indicatorId}'. Workbook had: ${JSON.stringify(expected)}`);
      fail++; continue;
    }
    if (expected === null || expected === undefined) {
      if (match.value === null) { pass++; if (values.verbose) console.log(`  OK   ${check.name}  (both null)`); continue; }
      failures.push(`${check.name} — store=${match.value}, workbook=null`); fail++; continue;
    }
    const expectedNum = typeof expected === 'number' ? expected : Number(expected);
    if (!Number.isFinite(expectedNum)) {
      failures.push(`${check.name} — workbook cell ${check.cellRef} is non-numeric (${JSON.stringify(expected)})`); fail++; continue;
    }
    const tol = check.tolerance ?? 0.005;
    const got = match.value ?? NaN;
    if (!Number.isFinite(got) || Math.abs(got - expectedNum) > tol) {
      failures.push(`${check.name} — store=${got} vs workbook=${expectedNum} (|Δ|=${Math.abs(got - expectedNum)}, tolerance=${tol})`);
      fail++; continue;
    }
    pass++;
    if (values.verbose) console.log(`  OK   ${check.name}  (${got} ≈ ${expectedNum})`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`  Checks passed : ${pass} / ${CHECKS.length}`);
  console.log(`  Failures      : ${fail}`);
  console.log('='.repeat(60));
  if (fail > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) console.log(`  FAIL  ${f}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });

// Re-export utility so CLI consumers can query (unused directly here).
void utils;
