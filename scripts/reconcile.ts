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
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

  // --- Percent-format spot checks (cells carry "0.0%" format; both sides of
  //     the compare apply ×100 so values land in 0–100).
  { name: 'GDP Growth — Overall 2022 (percent)',        indicatorId: 'gdp_growth_sector_overall_gdp_growth',        periodLabel: '2022', sheet: 'GDP Growth by Sector',   cellRef: 'S45', tolerance: 0.1 },
  { name: 'GDP Growth — Sugar 2013 (percent)',          indicatorId: 'gdp_growth_sector_sugar',                     periodLabel: '2013', sheet: 'GDP Growth by Sector',   cellRef: 'J8',  tolerance: 0.01 },
  { name: 'GDP Growth — Gold 2023 (percent)',           indicatorId: 'gdp_growth_sector_gold',                      periodLabel: '2023', sheet: 'GDP Growth by Sector',   cellRef: 'T17', tolerance: 0.1 },
  { name: 'GDP Growth — Construction 2022 (percent)',   indicatorId: 'gdp_growth_sector_construction',              periodLabel: '2022', sheet: 'GDP Growth by Sector',   cellRef: 'S28', tolerance: 0.1 },
  { name: 'GDP Growth — Services 2021 (percent)',       indicatorId: 'gdp_growth_sector_services',                  periodLabel: '2021', sheet: 'GDP Growth by Sector',   cellRef: 'R30', tolerance: 0.1 },

  // --- Archetype D: NRF (Block 1).
  { name: 'NRF — Petroleum Revenue Deposits 2020',      indicatorId: 'nrf_petroleum_revenue_deposits',              periodLabel: '2020', sheet: 'NRF',                    cellRef: 'D10', tolerance: 0.01 },
  { name: 'NRF — Royalties 2026 (budget)',              indicatorId: 'nrf_royalties',                               periodLabel: '2026', sheet: 'NRF',                    cellRef: 'N12', tolerance: 0.01, scenario: 'budget' },
  { name: 'NRF — Closing Balance 2025 (revised)',       indicatorId: 'nrf_closing_balance',                         periodLabel: '2025', sheet: 'NRF',                    cellRef: 'M24', tolerance: 0.01, scenario: 'revised' },
];

// ---------- Catalog-integrity assertions ----------
// Shape-level checks over the whole catalog (not cell values) — catches junk
// names, empty indicators, missing required series, and below-minimum counts.
interface IntegrityCheck { name: string; assert(inds: Map<string, IndicatorRecord>, obs: Map<string, ObservationRecord[]>): string | null }

const JUNK_NAME_PATTERNS: RegExp[] = [
  /^[A-Z]$/,                                // single uppercase letter
  /^[0-9]+(\.[0-9]+)?$/,                    // numeric-only
  /^[IVXLCDM]+$/i,                          // roman numerals
  /^(total|subtotal|sub[- ]total|grand[- ]total|of which|memo|items|summary)$/i,
  /^source[s]?\s*:/i,
  /^charts? and analysis/i,
  /^updated\s+\d/i,
  /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,
];

// Names that must exist on each key sheet, matched case-insensitively against
// the indicator record's `name` field.
const REQUIRED_NAMES: Record<string, string[]> = {
  NRF: [
    'Petroleum Revenue Deposits',
    'Government Share of Profit Oil',
    'Royalties',
    'Withdrawal Amount',
    'Closing Balance',
    'Opening Balance',
  ],
  'Private Sector Credit': [
    'Total Private Sector Credit',
  ],
  'Central Gov Ops': [
    'Total Revenue',
  ],
  'Revenue & Expenditure': [
    'Overall Surplus/Deficit',
  ],
  BOP: [
    'Current Account',
  ],
};

// Minimum indicator counts per sheet. Tripwires for silent regressions where a
// parser fix for one sheet accidentally stops emitting rows on another.
const MIN_INDICATORS_BY_SHEET: Record<string, number> = {
  NRF: 10,
  'Private Sector Credit': 5,
  'Central Gov Ops': 10,
  'Revenue & Expenditure': 15,
  'Debt by Type': 5,
  'Capital Expenditure_Sector': 5,
  BOP: 4,
};

// ---------- Cross-series identity checks ----------
// Economic relationships that MUST hold in a sound dataset. Each check either
// returns null (pass), a "skip" string (data unavailable), or a failure message.
// A check can emit multiple sub-results (one per period); we aggregate.
interface IdentityResult { name: string; status: 'pass' | 'fail' | 'skip'; detail: string; samples?: Array<{ period: string; lhs: number; rhs: number; delta: number }> }
interface IdentityCheck { name: string; run(inds: Map<string, IndicatorRecord>, obs: Map<string, ObservationRecord[]>): IdentityResult }

// Period lookups are called repeatedly by the identity checks — cache each
// indicator's period→value map after first build.
const PERIOD_CACHE = new Map<string, Map<string, number>>();
function actualObsByPeriod(obs: Map<string, ObservationRecord[]>, id: string): Map<string, number> {
  const cached = PERIOD_CACHE.get(id);
  if (cached) return cached;
  const out = new Map<string, number>();
  for (const o of obs.get(id) ?? []) {
    if (o.value === null) continue;
    if ((o.scenario ?? 'actual') !== 'actual') continue;
    out.set(o.periodLabel, o.value);
  }
  PERIOD_CACHE.set(id, out);
  return out;
}

function absRelDelta(lhs: number, rhs: number): number {
  if (lhs === 0 && rhs === 0) return 0;
  const denom = Math.max(Math.abs(lhs), Math.abs(rhs), 1);
  return Math.abs(lhs - rhs) / denom;
}

// Tolerate small relative diffs (percent of magnitude) plus a small absolute floor.
function identityOk(lhs: number, rhs: number, relTol: number, absTol = 0.01): boolean {
  return Math.abs(lhs - rhs) <= absTol || absRelDelta(lhs, rhs) <= relTol;
}

const IDENTITY_CHECKS: IdentityCheck[] = [
  {
    name: 'PSC: Total = sum of components',
    run(inds, obs) {
      const totalId = 'psc_total_private_sector_credit';
      const componentIds = [
        'psc_credit_to_agriculture', 'psc_credit_to_mining_quarrying',
        'psc_credit_to_manufacturing', 'psc_credit_to_services',
        'psc_credit_to_households', 'psc_real_estate_mortgages',
        'psc_credit_cards', 'psc_other_forms_of_credit',
      ];
      if (!inds.has(totalId) || !componentIds.every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'total or at least one component missing' };
      }
      const total = actualObsByPeriod(obs, totalId);
      const byP = new Map<string, { lhs: number; rhs: number }>();
      for (const [p, lhs] of total) {
        let rhs = 0, any = false;
        for (const id of componentIds) {
          const v = actualObsByPeriod(obs, id).get(p);
          if (v !== undefined) { rhs += v; any = true; }
        }
        if (any) byP.set(p, { lhs, rhs });
      }
      const samples = [...byP.entries()].map(([period, { lhs, rhs }]) => ({ period, lhs, rhs, delta: lhs - rhs }));
      const bad = samples.filter((s) => !identityOk(s.lhs, s.rhs, 0.005));
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no overlapping periods between total and components' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} periods exceed 0.5%`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} periods match within 0.5%`, samples: samples.slice(0, 5) };
    },
  },
  {
    // Current Revenue = Tax + Non-Tax in MoF's definition. Oil-era inflows
    // (NRF withdrawals, GRIF, Carbon Credit) are totalled separately in
    // "Captures Other Inflows" and excluded here.
    name: 'Central Gov: Current Revenue = Tax + Non-Tax',
    run(inds, obs) {
      const required = ['cgo_current_revenue', 'cgo_tax', 'cgo_non_tax'];
      if (!required.every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'required cgo_ indicators missing' };
      }
      const componentIds = ['cgo_tax', 'cgo_non_tax'];
      const lhs = actualObsByPeriod(obs, 'cgo_current_revenue');
      const samples: Array<{ period: string; lhs: number; rhs: number; delta: number }> = [];
      for (const [p, l] of lhs) {
        let rhs = 0;
        for (const id of componentIds) {
          const v = actualObsByPeriod(obs, id).get(p);
          if (v !== undefined) rhs += v;
        }
        samples.push({ period: p, lhs: l, rhs, delta: l - rhs });
      }
      const bad = samples.filter((s) => !identityOk(s.lhs, s.rhs, 0.01));
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no overlapping periods' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} periods exceed 1%`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} periods match within 1%`, samples: samples.slice(0, 5) };
    },
  },
  {
    name: 'NRF: Closing(N) = Opening(N+1)',
    run(inds, obs) {
      if (!['nrf_closing_balance', 'nrf_opening_balance'].every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'NRF closing/opening missing' };
      }
      const closing = actualObsByPeriod(obs, 'nrf_closing_balance');
      const opening = actualObsByPeriod(obs, 'nrf_opening_balance');
      const samples: Array<{ period: string; lhs: number; rhs: number; delta: number }> = [];
      for (const [p, c] of closing) {
        const y = Number(p);
        if (!Number.isFinite(y)) continue;
        const nextOpen = opening.get(String(y + 1));
        if (nextOpen === undefined) continue;
        samples.push({ period: `${y}→${y + 1}`, lhs: c, rhs: nextOpen, delta: c - nextOpen });
      }
      const bad = samples.filter((s) => !identityOk(s.lhs, s.rhs, 0.01));
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no adjacent-year pairs' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} transitions exceed 1%`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} transitions match within 1%`, samples: samples.slice(0, 5) };
    },
  },
  {
    name: 'Trade: Balance = Exports + Imports (imports stored as negative)',
    run(inds, obs) {
      if (!['mtrade_balance', 'mtrade_total_exports', 'mtrade_total_imports'].every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'merchandise trade indicators missing' };
      }
      const bal = actualObsByPeriod(obs, 'mtrade_balance');
      const exp = actualObsByPeriod(obs, 'mtrade_total_exports');
      const imp = actualObsByPeriod(obs, 'mtrade_total_imports');
      const samples: Array<{ period: string; lhs: number; rhs: number; delta: number }> = [];
      for (const [p, b] of bal) {
        const e = exp.get(p); const m = imp.get(p);
        if (e === undefined || m === undefined) continue;
        samples.push({ period: p, lhs: b, rhs: e + m, delta: b - (e + m) });
      }
      const bad = samples.filter((s) => !identityOk(s.lhs, s.rhs, 0.01));
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no overlapping periods' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} periods exceed 1%`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} periods match within 1%`, samples: samples.slice(0, 5) };
    },
  },
  {
    name: 'GDP: YoY growth from levels matches stated BOS growth rate',
    run(inds, obs) {
      if (!['gdp_overall', 'gdp_bos_growth_rate'].every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'gdp_overall or gdp_bos_growth_rate missing' };
      }
      const levels = actualObsByPeriod(obs, 'gdp_overall');
      const stated = actualObsByPeriod(obs, 'gdp_bos_growth_rate');
      const samples: Array<{ period: string; lhs: number; rhs: number; delta: number }> = [];
      for (const [p, s] of stated) {
        const y = Number(p);
        if (!Number.isFinite(y)) continue;
        const cur = levels.get(String(y));
        const prev = levels.get(String(y - 1));
        if (cur === undefined || prev === undefined || prev === 0) continue;
        const computed = ((cur - prev) / prev) * 100;
        samples.push({ period: p, lhs: s, rhs: computed, delta: s - computed });
      }
      const bad = samples.filter((s) => Math.abs(s.delta) > 0.5);
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no overlapping years with a prior year' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} years differ by > 0.5pp`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} years within 0.5pp`, samples: samples.slice(0, 5) };
    },
  },
  {
    name: 'Debt-to-GDP: Debt sheet Guyana ratio = Debt-to-GDP sheet Guyana ratio',
    run(inds, obs) {
      if (!['debt_total_public_debt_as_a_of_gdp', 'debt_to_gdp_guyana'].every((id) => inds.has(id))) {
        return { name: this.name, status: 'skip', detail: 'cross-sheet Debt-to-GDP indicators missing' };
      }
      const a = actualObsByPeriod(obs, 'debt_total_public_debt_as_a_of_gdp');
      const b = actualObsByPeriod(obs, 'debt_to_gdp_guyana');
      const samples: Array<{ period: string; lhs: number; rhs: number; delta: number }> = [];
      for (const [p, av] of a) {
        const bv = b.get(p);
        if (bv === undefined) continue;
        samples.push({ period: p, lhs: av, rhs: bv, delta: av - bv });
      }
      const bad = samples.filter((s) => Math.abs(s.delta) > 1);
      if (!samples.length) return { name: this.name, status: 'skip', detail: 'no overlapping years' };
      if (bad.length) return { name: this.name, status: 'fail', detail: `${bad.length}/${samples.length} years differ by > 1pp`, samples: bad.slice(0, 10) };
      return { name: this.name, status: 'pass', detail: `${samples.length} years within 1pp`, samples: samples.slice(0, 5) };
    },
  },
  {
    name: 'GDP: Nominal ≈ Real × deflator',
    run() {
      return { name: this.name, status: 'skip', detail: 'no explicit GDP deflator series in workbook' };
    },
  },
  {
    name: 'PSC: Business Enterprises = sum of sector sub-components',
    run() {
      return { name: this.name, status: 'skip', detail: 'no separate Business Enterprises total; PSC sheet exposes sector components only' };
    },
  },
];

const INTEGRITY_CHECKS: IntegrityCheck[] = [
  {
    name: 'No junk-pattern indicator names in catalog',
    assert(inds) {
      const hits: string[] = [];
      for (const ind of inds.values()) {
        const name = (ind.name ?? '').trim();
        if (!name) { hits.push(`${ind.id} has empty name`); continue; }
        for (const rx of JUNK_NAME_PATTERNS) {
          if (rx.test(name)) { hits.push(`${ind.id} name="${name}" matches ${rx}`); break; }
        }
      }
      if (hits.length) return `${hits.length} indicator(s) with junk-pattern names: ${hits.slice(0, 5).join('; ')}${hits.length > 5 ? '…' : ''}`;
      return null;
    },
  },
  {
    name: 'No indicator ID whose tail is a single character',
    assert(inds) {
      const hits: string[] = [];
      for (const ind of inds.values()) {
        const parts = ind.id.split('_');
        const tail = parts.slice(1).join('_');
        if (tail.length === 1) hits.push(ind.id);
      }
      if (hits.length) return `single-char-tail IDs: ${hits.join(', ')}`;
      return null;
    },
  },
  {
    name: 'No indicator with zero observations',
    assert(inds, obs) {
      const hits: string[] = [];
      for (const ind of inds.values()) {
        if ((obs.get(ind.id) ?? []).length === 0) hits.push(ind.id);
      }
      if (hits.length) return `${hits.length} indicator(s) with zero observations: ${hits.slice(0, 5).join(', ')}${hits.length > 5 ? '…' : ''}`;
      return null;
    },
  },
  {
    name: 'No indicator where every observation value is null',
    assert(inds, obs) {
      const hits: string[] = [];
      for (const ind of inds.values()) {
        const list = obs.get(ind.id) ?? [];
        if (list.length > 0 && list.every((o) => o.value === null)) hits.push(ind.id);
      }
      if (hits.length) return `${hits.length} indicator(s) with all-null observations: ${hits.slice(0, 5).join(', ')}${hits.length > 5 ? '…' : ''}`;
      return null;
    },
  },
  {
    name: 'Required indicator names exist on every key sheet',
    assert(inds) {
      const bySheet = new Map<string, Set<string>>();
      for (const ind of inds.values()) {
        const set = bySheet.get(ind.sourceTab) ?? new Set<string>();
        set.add((ind.name ?? '').trim().toLowerCase());
        bySheet.set(ind.sourceTab, set);
      }
      const missing: string[] = [];
      for (const [sheet, required] of Object.entries(REQUIRED_NAMES)) {
        const haveSet = bySheet.get(sheet);
        if (!haveSet) { missing.push(`${sheet}: no indicators at all`); continue; }
        for (const name of required) {
          if (!haveSet.has(name.toLowerCase())) missing.push(`${sheet}: "${name}"`);
        }
      }
      if (missing.length) return `missing required names: ${missing.join('; ')}`;
      return null;
    },
  },
  {
    name: 'Minimum indicator counts per key sheet',
    assert(inds) {
      const counts = new Map<string, number>();
      for (const ind of inds.values()) counts.set(ind.sourceTab, (counts.get(ind.sourceTab) ?? 0) + 1);
      const hits: string[] = [];
      for (const [sheet, min] of Object.entries(MIN_INDICATORS_BY_SHEET)) {
        const got = counts.get(sheet) ?? 0;
        if (got < min) hits.push(`${sheet}: ${got} < ${min}`);
      }
      if (hits.length) return `below minimum: ${hits.join('; ')}`;
      return null;
    },
  },
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
  const book = read(readFileSync(workbookPath), { cellNF: true });
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
    const cell = sheet[check.cellRef] as { v?: unknown; z?: string } | undefined;
    let expected = cell ? cell.v : null;
    // Mirror the ingest-side transform: percent-formatted cells are stored as
    // decimal ratios in Excel but the catalog has already multiplied them by
    // 100, so compare to the scaled value here as well.
    if (typeof expected === 'number' && typeof cell?.z === 'string' && /%/.test(cell.z)) {
      expected = expected * 100;
    }
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

  // ---------- Catalog-integrity assertions ----------
  let integrityPass = 0;
  let integrityFail = 0;
  const integrityFailures: string[] = [];
  for (const ic of INTEGRITY_CHECKS) {
    const result = ic.assert(indicatorIndex, observationIndex);
    if (result === null) {
      integrityPass++;
      if (values.verbose) console.log(`  OK   [integrity] ${ic.name}`);
    } else {
      integrityFail++;
      integrityFailures.push(`[integrity] ${ic.name} — ${result}`);
    }
  }

  // ---------- Cross-series identity checks ----------
  const identityResults = IDENTITY_CHECKS.map((c) => c.run(indicatorIndex, observationIndex));
  const identityPass = identityResults.filter((r) => r.status === 'pass').length;
  const identitySkip = identityResults.filter((r) => r.status === 'skip').length;
  const identityFail = identityResults.filter((r) => r.status === 'fail').length;

  console.log('');
  console.log('='.repeat(60));
  console.log(`  Cell checks passed  : ${pass} / ${CHECKS.length}`);
  console.log(`  Cell check failures : ${fail}`);
  console.log(`  Integrity passed    : ${integrityPass} / ${INTEGRITY_CHECKS.length}`);
  console.log(`  Integrity failures  : ${integrityFail}`);
  console.log(`  Identity passed     : ${identityPass} / ${IDENTITY_CHECKS.length} (skipped: ${identitySkip})`);
  console.log(`  Identity failures   : ${identityFail}`);
  console.log('='.repeat(60));

  // ---------- Markdown report ----------
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = join(__dirname, '..', 'docs', 'audit_reports');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `reconcile_${stamp}.md`);
  const md: string[] = [];
  md.push(`# Reconciliation Report — ${stamp}`);
  md.push('');
  md.push(`- Workbook: \`${workbookPath}\``);
  md.push(`- Source: ${values.live ? 'live DB' : 'dry-run JSON'}`);
  md.push(`- Indicators: ${indicatorIndex.size}`);
  md.push(`- Observations: ${[...observationIndex.values()].reduce((n, arr) => n + arr.length, 0)}`);
  md.push('');
  md.push('## Cell-level spot checks');
  md.push(`- Passed: **${pass} / ${CHECKS.length}**`);
  md.push(`- Failed: **${fail}**`);
  if (failures.length) {
    md.push('');
    for (const f of failures) md.push(`- ❌ ${f}`);
  }
  md.push('');
  md.push('## Catalog-integrity assertions');
  md.push(`- Passed: **${integrityPass} / ${INTEGRITY_CHECKS.length}**`);
  md.push(`- Failed: **${integrityFail}**`);
  if (integrityFailures.length) {
    md.push('');
    for (const f of integrityFailures) md.push(`- ❌ ${f}`);
  }
  md.push('');
  md.push('## Cross-series identity checks');
  md.push('');
  for (const r of identityResults) {
    const badge = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⏭️' : '❌';
    md.push(`### ${badge} ${r.name}`);
    md.push('');
    md.push(`- Status: **${r.status}**`);
    md.push(`- Detail: ${r.detail}`);
    if (r.samples?.length) {
      md.push('');
      md.push('| period | lhs | rhs | delta |');
      md.push('|--------|----:|----:|------:|');
      for (const s of r.samples) md.push(`| ${s.period} | ${s.lhs.toFixed(3)} | ${s.rhs.toFixed(3)} | ${s.delta.toFixed(3)} |`);
    }
    md.push('');
  }
  writeFileSync(reportPath, md.join('\n'));
  console.log(`  Report: ${reportPath}`);

  // Identity failures are warnings, not hard fails — an identity violation
  // usually signals a data-reporting change or definition mismatch to
  // investigate, not a correctness bug. See the markdown report for context.
  if (identityFail > 0) {
    console.log('');
    console.log('Identity warnings (review in report, escalate if unexpected):');
    for (const r of identityResults) if (r.status === 'fail') console.log(`  WARN  [identity] ${r.name} — ${r.detail}`);
  }
  if (fail > 0 || integrityFail > 0) {
    console.log('');
    console.log('Hard failures:');
    for (const f of failures) console.log(`  FAIL  ${f}`);
    for (const f of integrityFailures) console.log(`  FAIL  ${f}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });

// Re-export utility so CLI consumers can query (unused directly here).
void utils;
