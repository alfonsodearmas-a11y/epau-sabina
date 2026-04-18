const { useState, useEffect, useRef, useMemo, useCallback } = React;
const R = window.Recharts || {};
const { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } = R;


// EPAU mock data. Illustrative, not official.
// Using Guyanese series from the 'Guyana Key Statistics' workbook.

const INDICATORS = [
  {
    id: 'psc_total',
    name: 'Private Sector Credit, Total',
    category: 'Monetary',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Statistical Bulletin Tbl 3.4',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Monetary_03',
  },
  {
    id: 'psc_business',
    name: 'Private Sector Credit, Business Enterprises',
    category: 'Monetary',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Statistical Bulletin Tbl 3.4',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Monetary_03',
  },
  {
    id: 'psc_mortgages',
    name: 'Private Sector Credit, Real Estate Mortgages',
    category: 'Monetary',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Statistical Bulletin Tbl 3.4',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Monetary_03',
  },
  {
    id: 'psc_households',
    name: 'Private Sector Credit, Households',
    category: 'Monetary',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Statistical Bulletin Tbl 3.4',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Monetary_03',
  },
  {
    id: 'nrf_inflows_actual',
    name: 'NRF Inflows, Actual',
    category: 'Fiscal',
    frequency: 'Annual',
    latest: '2025',
    source: 'Ministry of Finance, NRF Quarterly Reports',
    unit: 'US$ millions',
    caveat: 'Royalties recorded on cash basis; 2025 figures provisional pending audit.',
    sheet: 'Fiscal_22',
  },
  {
    id: 'nrf_inflows_budget',
    name: 'NRF Inflows, Budget',
    category: 'Fiscal',
    frequency: 'Annual',
    latest: '2026',
    source: 'National Budget Speech, Appendix III',
    unit: 'US$ millions',
    caveat: null,
    sheet: 'Fiscal_22',
  },
  {
    id: 'gdp_real_growth',
    name: 'Real GDP Growth, Overall',
    category: 'Macro',
    frequency: 'Annual',
    latest: '2025',
    source: 'Bureau of Statistics, National Accounts',
    unit: 'percent',
    caveat: '2025 is a first estimate; subject to revision with Q4 national accounts release.',
    sheet: 'Macro_01',
  },
  {
    id: 'gdp_nonoil_growth',
    name: 'Real GDP Growth, Non-Oil',
    category: 'Macro',
    frequency: 'Annual',
    latest: '2025',
    source: 'Bureau of Statistics, National Accounts',
    unit: 'percent',
    caveat: null,
    sheet: 'Macro_01',
  },
  {
    id: 'npl_ratio',
    name: 'Non-Performing Loans Ratio',
    category: 'Monetary',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Bank of Guyana, Financial Stability Report',
    unit: 'percent',
    caveat: null,
    sheet: 'Monetary_11',
  },
  {
    id: 'cpi_yoy',
    name: 'CPI Inflation, 12-month',
    category: 'Macro',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bureau of Statistics, CPI Release',
    unit: 'percent',
    caveat: null,
    sheet: 'Macro_12',
  },
  {
    id: 'fx_rate_avg',
    name: 'Exchange Rate, Period Average',
    category: 'External',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Mid-Rate Series',
    unit: 'G$ per US$',
    caveat: 'Series reflects mid-rate; cambio rates may differ by up to 1.5 percent.',
    sheet: 'External_04',
  },
  {
    id: 'fx_reserves',
    name: 'Gross International Reserves',
    category: 'External',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, International Reserves',
    unit: 'US$ millions',
    caveat: null,
    sheet: 'External_01',
  },
  {
    id: 'debt_ext',
    name: 'External Public Debt Stock',
    category: 'Debt',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Ministry of Finance, Debt Management Division',
    unit: 'US$ millions',
    caveat: null,
    sheet: 'Debt_02',
  },
  {
    id: 'debt_dom',
    name: 'Domestic Public Debt Stock',
    category: 'Debt',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Ministry of Finance, Debt Management Division',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Debt_03',
  },
  {
    id: 'fiscal_revenue',
    name: 'Central Government Revenue, Total',
    category: 'Fiscal',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Ministry of Finance, Fiscal Out-Turn',
    unit: 'G$ millions',
    caveat: null,
    sheet: 'Fiscal_01',
  },
  {
    id: 'fiscal_expenditure',
    name: 'Central Government Expenditure, Total',
    category: 'Fiscal',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Ministry of Finance, Fiscal Out-Turn',
    unit: 'G$ millions',
    caveat: 'Capital expenditure reclassified in 2023; pre-2023 values not strictly comparable.',
    sheet: 'Fiscal_01',
  },
  {
    id: 'oil_production',
    name: 'Crude Oil Production',
    category: 'External',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Ministry of Natural Resources, Petroleum Production Report',
    unit: 'thousand barrels per day',
    caveat: null,
    sheet: 'External_21',
  },
  {
    id: 'unemployment',
    name: 'Unemployment Rate',
    category: 'Social',
    frequency: 'Annual',
    latest: '2024',
    source: 'Labour Force Survey, Bureau of Statistics',
    unit: 'percent',
    caveat: 'LFS methodology revised in 2021; figures pre-2021 not directly comparable.',
    sheet: 'Social_04',
  },
  {
    id: 'because_rollout',
    name: 'BECAUSE Cash Transfer, Beneficiaries',
    category: 'Social',
    frequency: 'Annual',
    latest: '2025',
    source: 'Ministry of Human Services, Programme Reports',
    unit: 'persons',
    caveat: null,
    sheet: 'Social_17',
  },
  {
    id: 'bop_current',
    name: 'Current Account Balance',
    category: 'External',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Bank of Guyana, Balance of Payments',
    unit: 'US$ millions',
    caveat: null,
    sheet: 'External_11',
  },
  {
    id: 'bop_capital',
    name: 'Capital and Financial Account Balance',
    category: 'External',
    frequency: 'Quarterly',
    latest: 'Q4 2025',
    source: 'Bank of Guyana, Balance of Payments',
    unit: 'US$ millions',
    caveat: null,
    sheet: 'External_11',
  },
  {
    id: 'gini',
    name: 'Gini Coefficient',
    category: 'Social',
    frequency: 'Annual',
    latest: '2024',
    source: 'Bureau of Statistics, Household Budget Survey',
    unit: 'index',
    caveat: 'Derived from HBS 2019 and 2024; intercensal years imputed.',
    sheet: 'Social_31',
  },
  {
    id: 'tbill_91',
    name: '91-day Treasury Bill Rate',
    category: 'Monetary',
    frequency: 'Monthly',
    latest: 'Feb 2026',
    source: 'Bank of Guyana, Auction Results',
    unit: 'percent',
    caveat: null,
    sheet: 'Monetary_21',
  },
];

// NRF actual vs budget, annual, 2020-2026 (US$ millions, illustrative)
const NRF_SERIES = [
  { year: '2020', actual: 70,   budget: 80   },
  { year: '2021', actual: 410,  budget: 420  },
  { year: '2022', actual: 1270, budget: 1250 },
  { year: '2023', actual: 1620, budget: 1800 },
  { year: '2024', actual: 2690, budget: 2550 },
  { year: '2025', actual: 2450, budget: 2900 },
  { year: '2026', actual: null, budget: 2800 },
];

// Private sector credit by sector since 2015, annual (G$ millions, illustrative)
const PSC_SERIES = [
  { year: '2015', business: 132000, mortgages: 52000,  households: 24000 },
  { year: '2016', business: 138000, mortgages: 56000,  households: 25000 },
  { year: '2017', business: 145000, mortgages: 60000,  households: 26500 },
  { year: '2018', business: 152000, mortgages: 66000,  households: 28000 },
  { year: '2019', business: 168000, mortgages: 74000,  households: 30500 },
  { year: '2020', business: 178000, mortgages: 82000,  households: 32000 },
  { year: '2021', business: 192000, mortgages: 92000,  households: 34500 },
  { year: '2022', business: 215000, mortgages: 108000, households: 38000 },
  { year: '2023', business: 238000, mortgages: 128000, households: 42500 },
  { year: '2024', business: 258000, mortgages: 152000, households: 47000 },
  { year: '2025', business: 272000, mortgages: 168000, households: 49500 },
  { year: '2026', business: 278000, mortgages: 172000, households: 50800 },
];

// Real GDP growth, overall + non-oil, annual
const GDP_SERIES = [
  { year: '2017', overall: 2.1,  nonoil: 1.9  },
  { year: '2018', overall: 4.4,  nonoil: 2.8  },
  { year: '2019', overall: 5.4,  nonoil: 4.5  },
  { year: '2020', overall: 43.5, nonoil: -7.3 },
  { year: '2021', overall: 20.1, nonoil: 4.6  },
  { year: '2022', overall: 63.3, nonoil: 11.5 },
  { year: '2023', overall: 33.0, nonoil: 11.7 },
  { year: '2024', overall: 43.6, nonoil: 8.5  },
  { year: '2025', overall: 14.4, nonoil: 6.3  },
];

// NPL ratio, quarterly
const NPL_SERIES = [
  { q: '2017Q1', npl: 11.8 }, { q: '2017Q3', npl: 12.4 },
  { q: '2018Q1', npl: 12.9 }, { q: '2018Q3', npl: 11.6 },
  { q: '2019Q1', npl: 10.2 }, { q: '2019Q3', npl:  9.1 },
  { q: '2020Q1', npl:  8.4 }, { q: '2020Q3', npl:  7.6 },
  { q: '2021Q1', npl:  7.0 }, { q: '2021Q3', npl:  6.2 },
  { q: '2022Q1', npl:  5.8 }, { q: '2022Q3', npl:  5.3 },
  { q: '2023Q1', npl:  5.0 }, { q: '2023Q3', npl:  4.7 },
  { q: '2024Q1', npl:  4.4 }, { q: '2024Q3', npl:  4.2 },
  { q: '2025Q1', npl:  4.3 }, { q: '2025Q3', npl:  4.5 },
  { q: '2025Q4', npl:  4.6 },
];

const SAVED_VIEWS = [
  {
    id: 'sv1',
    name: 'Monthly Cabinet briefing: credit allocation',
    query: 'private sector credit by sector since 2015',
    indicators: ['PSC Business', 'PSC Mortgages', 'PSC Households'],
    last_run: 'Mar 17, 2026',
    chart: 'area',
  },
  {
    id: 'sv2',
    name: 'NRF performance: actual vs budget',
    query: 'NRF inflows actual vs budget 2020 to 2026',
    indicators: ['NRF Actual', 'NRF Budget'],
    last_run: 'Mar 17, 2026',
    chart: 'bar-paired',
  },
  {
    id: 'sv3',
    name: 'Oil-driven growth divergence',
    query: 'real GDP overall vs non-oil since 2017',
    indicators: ['Real GDP', 'Non-oil GDP'],
    last_run: 'Mar 11, 2026',
    chart: 'line',
  },
  {
    id: 'sv4',
    name: 'Financial stability snapshot',
    query: 'NPL ratio quarterly since 2017',
    indicators: ['NPL Ratio'],
    last_run: 'Mar 02, 2026',
    chart: 'line-fall',
  },
  {
    id: 'sv5',
    name: 'External buffer: reserves trajectory',
    query: 'gross international reserves monthly 2019 to present',
    indicators: ['Reserves'],
    last_run: 'Feb 24, 2026',
    chart: 'area',
  },
  {
    id: 'sv6',
    name: 'Inflation and exchange rate pass-through',
    query: 'CPI inflation and G$/US$ rate since 2020',
    indicators: ['CPI YoY', 'FX Rate'],
    last_run: 'Feb 19, 2026',
    chart: 'dual',
  },
];

const COMPARISON_TABLES = [
  {
    id: 'cmp-admin',
    name: 'Selected indicators, by administration',
    description: 'Averages over each administration\'s tenure. Values are illustrative.',
    groups: [
      { label: 'APNU+AFC', span: 3, sub: ['2015', '2016 to 2020 avg', '2020'] },
      { label: 'PPP/C', span: 3, sub: ['2020', '2021 to 2025 avg', '2025'] },
    ],
    rows: [
      { label: 'Real GDP growth, percent', unit: 'percent', cells: [3.1, 4.2, 43.5, 43.5, 34.9, 14.4] },
      { label: 'Non-oil GDP growth, percent', unit: 'percent', cells: [1.9, 2.4, -7.3, -7.3, 8.5, 6.3] },
      { label: 'CPI inflation, year avg', unit: 'percent', cells: [-0.9, 1.4, 0.9, 0.9, 4.3, 2.6] },
      { label: 'NPL ratio, year-end', unit: 'percent', cells: [6.9, 11.6, 8.4, 8.4, 4.9, 4.6] },
      { label: 'NRF inflows, US$ millions', unit: 'US$m', cells: [null, null, 70, 70, 1688, 2450] },
      { label: 'Gross reserves, US$ millions', unit: 'US$m', cells: [598, 540, 690, 690, 812, 1010] },
    ],
  },
  {
    id: 'cmp-beneficiaries',
    name: 'Social programme beneficiaries, headcount',
    description: 'Enumerated beneficiaries per year.',
    groups: [{ label: 'Year', span: 4, sub: ['2022', '2023', '2024', '2025'] }],
    rows: [
      { label: 'BECAUSE cash transfer', unit: 'persons', cells: [48000, 61200, 74800, 82100] },
      { label: 'Public assistance', unit: 'persons', cells: [19800, 20600, 21100, 21800] },
      { label: 'Old age pension', unit: 'persons', cells: [64500, 66800, 69200, 71400] },
      { label: 'School uniform voucher', unit: 'persons', cells: [205000, 212000, 218000, 224000] },
    ],
  },
  {
    id: 'cmp-sectors',
    name: 'Sectoral GDP contribution, share of total',
    description: 'Share of nominal GDP at producer prices.',
    groups: [{ label: 'Year', span: 4, sub: ['2017', '2020', '2022', '2025'] }],
    rows: [
      { label: 'Agriculture', unit: 'percent', cells: [14.8, 9.6, 5.1, 4.2] },
      { label: 'Mining and quarrying (ex-oil)', unit: 'percent', cells: [12.1, 8.4, 4.9, 3.8] },
      { label: 'Crude oil and gas', unit: 'percent', cells: [0.0, 34.2, 62.0, 64.5] },
      { label: 'Manufacturing', unit: 'percent', cells: [8.2, 5.9, 3.6, 3.1] },
      { label: 'Construction', unit: 'percent', cells: [4.5, 5.1, 4.9, 5.6] },
      { label: 'Services', unit: 'percent', cells: [60.4, 36.8, 19.5, 18.8] },
    ],
  },
];

const INGESTION_RUN = {
  timestamp: 'Mar 17, 2026 at 09:14 GYT',
  workbook: 'Guyana Key Statistics v2026.03.xlsx',
  workbook_size: '4.8 MB',
  sheets_parsed: 61,
  indicators_upserted: 1384,
  observations_upserted: 94726,
  duration: '38.2 seconds',
  issues_count: 14,
  quarantine: [
    { sheet: 'Fiscal_22', cell: 'F47', reason: 'Merged cell spans two indicator rows; cannot disambiguate.', severity: 'high' },
    { sheet: 'External_11', cell: 'K118', reason: 'Non-numeric value "n.a." in a numeric column.', severity: 'low' },
    { sheet: 'External_11', cell: 'K119', reason: 'Non-numeric value "n.a." in a numeric column.', severity: 'low' },
    { sheet: 'Monetary_11', cell: 'D3', reason: 'Header row has no unit annotation; defaulted to percent.', severity: 'medium' },
    { sheet: 'Debt_02', cell: 'H204', reason: 'Value 0 in a series previously non-zero; flagged for review.', severity: 'medium' },
    { sheet: 'Social_17', cell: 'C9',  reason: 'Date string "FY24/25" could not be mapped to a single calendar year.', severity: 'high' },
    { sheet: 'Social_31', cell: 'E22', reason: 'Formula reference #REF! in source; cell skipped.', severity: 'high' },
    { sheet: 'Macro_01', cell: 'G2',  reason: 'Footnote superscript embedded in value: "43.5¹". Stripped and ingested.', severity: 'low' },
    { sheet: 'Macro_12', cell: 'P88', reason: 'Row label blank; indicator cannot be named.', severity: 'high' },
    { sheet: 'External_04', cell: 'B3', reason: 'Unit cell contains "G$ / US$" with non-standard slash character.', severity: 'low' },
    { sheet: 'Fiscal_01', cell: 'AA55', reason: 'Column beyond documented schema; ignored.', severity: 'medium' },
    { sheet: 'External_21', cell: 'D14', reason: 'Negative oil production value in a cumulative series.', severity: 'high' },
    { sheet: 'Debt_03', cell: 'F77', reason: 'Duplicate quarter label (2023Q2) appears twice in same row.', severity: 'medium' },
    { sheet: 'Monetary_21', cell: 'J8', reason: 'Rate of 0.00 recorded where previous month was 4.05.', severity: 'medium' },
  ],
};

window.EPAU_DATA = {
  INDICATORS, NRF_SERIES, PSC_SERIES, GDP_SERIES, NPL_SERIES,
  SAVED_VIEWS, COMPARISON_TABLES, INGESTION_RUN,
};


// ---- next file ----

// Small reusable bits. Kept inline-style-free; Tailwind only.

// --- Icons (inline SVG, hand-tuned minimal strokes) ---
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="9" r="6"/><path d="m14 14 4 4"/></svg>
  ),
  Sliders: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...p}><path d="M3 6h9M15 6h2M3 14h3M9 14h8"/><circle cx="13.5" cy="6" r="1.6" fill="currentColor"/><circle cx="7.5" cy="14" r="1.6" fill="currentColor"/></svg>
  ),
  Command: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 4a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v10a2 2 0 1 0 2-2H5a2 2 0 1 0 2 2z"/></svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M6 4.5v11a.75.75 0 0 0 1.16.63l9-5.5a.75.75 0 0 0 0-1.26l-9-5.5A.75.75 0 0 0 6 4.5Z"/></svg>
  ),
  Chart: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17V3M3 17h14M6 13V9M10 13V6M14 13v-2"/></svg>
  ),
  Table: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="14" height="12" rx="1"/><path d="M3 8h14M3 12h14M10 4v12"/></svg>
  ),
  Archive: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="16" height="4" rx="1"/><path d="M3 8v8h14V8M8 12h4"/></svg>
  ),
  Columns: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="14" height="14" rx="1"/><path d="M10 3v14M3 7h14M3 13h14"/></svg>
  ),
  Terminal: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="16" height="12" rx="1"/><path d="m5 9 3 2-3 2M11 13h4"/></svg>
  ),
  Warn: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3 2 17h16L10 3z"/><path d="M10 8v4M10 14.5v.5"/></svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 5l10 10M15 5 5 15"/></svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m4 10 4 4 8-8"/></svg>
  ),
  Copy: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="6" y="6" width="10" height="10" rx="1.5"/><path d="M4 14V5a1 1 0 0 1 1-1h9"/></svg>
  ),
  Download: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v10M5 9l5 5 5-5M4 17h12"/></svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3 7 8l-3 .5 7.5 7.5.5-3 5-5zM4 16l3-3"/></svg>
  ),
  Chev: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 8 4 4 4-4"/></svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 10a6 6 0 0 1 10-4.5L16 7M16 4v3h-3M16 10a6 6 0 0 1-10 4.5L4 13M4 16v-3h3"/></svg>
  ),
  Sparkle: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2"/></svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h14l-5 7v4l-4-1v-3z"/></svg>
  ),
  Dot: (p) => <svg viewBox="0 0 8 8" {...p}><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>,
  Keyboard: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="5" width="16" height="10" rx="1.5"/><path d="M5 8h.01M8 8h.01M11 8h.01M14 8h.01M5 11h.01M8 11h.01M11 11h.01M14 11h.01M7 14h6"/></svg>
  ),
  File: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3h7l4 4v10H5z"/><path d="M12 3v4h4"/></svg>
  ),
  Globe: (p) => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14"/></svg>
  ),
};

// --- Formatters ---
const fmt = {
  // 1,234,567 with separators; negatives in parentheses
  n: (v, digits = 0) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '';
    const neg = v < 0;
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return neg ? `(${s})` : s;
  },
  nc: (v, digits = 0) => {
    // compact for chart axes: 1.2k, 1.2M, etc. Financial parens for negatives.
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const a = Math.abs(v);
    let s;
    if (a >= 1e9) s = (a/1e9).toFixed(1).replace(/\.0$/, '') + 'bn';
    else if (a >= 1e6) s = (a/1e6).toFixed(1).replace(/\.0$/, '') + 'm';
    else if (a >= 1e3) s = (a/1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else s = a.toFixed(digits);
    return neg ? `(${s})` : s;
  },
  pct: (v, digits = 1) => {
    if (v === null || v === undefined) return '';
    const neg = v < 0;
    const s = Math.abs(v).toFixed(digits);
    return neg ? `(${s})` : s;
  },
};

// --- Small primitives ---
const Pill = ({ tone = 'neutral', children, className = '' }) => {
  const tones = {
    neutral: 'bg-white/5 text-text-secondary border-white/10',
    gold: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
    cool: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
    warn: 'bg-[#E0A050]/10 text-[#E0A050] border-[#E0A050]/25',
    danger: 'bg-[#E06C6C]/10 text-[#E06C6C] border-[#E06C6C]/25',
    macro: 'bg-[#7AA7D9]/10 text-[#A9C5E3] border-[#7AA7D9]/25',
    monetary: 'bg-gold-300/10 text-gold-200 border-gold-300/30',
    fiscal: 'bg-[#C8A87F]/10 text-[#C8A87F] border-[#C8A87F]/25',
    external: 'bg-[#7FC29B]/10 text-[#7FC29B] border-[#7FC29B]/25',
    debt: 'bg-[#C89878]/10 text-[#C89878] border-[#C89878]/25',
    social: 'bg-[#B099D4]/10 text-[#B099D4] border-[#B099D4]/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 h-5 rounded-sm text-[10.5px] font-medium uppercase tracking-[0.08em] border ${tones[tone] || tones.neutral} ${className}`}>
      {children}
    </span>
  );
};

const CategoryPill = ({ category }) => {
  const tone = { Macro: 'macro', Monetary: 'monetary', Fiscal: 'fiscal', External: 'external', Debt: 'debt', Social: 'social' }[category] || 'neutral';
  return <Pill tone={tone}>{category}</Pill>;
};

const FreqPill = ({ frequency }) => (
  <span className="num inline-flex items-center justify-center px-1.5 h-5 rounded-sm text-[10px] font-medium tracking-[0.08em] uppercase bg-white/[0.03] text-text-tertiary border border-white/5">
    {frequency === 'Monthly' ? 'M' : frequency === 'Quarterly' ? 'Q' : frequency === 'Annual' ? 'A' : frequency[0]}
    <span className="ml-1 normal-case tracking-normal opacity-70">{frequency.toLowerCase()}</span>
  </span>
);

const KeyCap = ({ children, className = '' }) => (
  <kbd className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-[3px] text-[10px] font-medium bg-white/[0.06] border border-white/10 text-text-secondary ${className}`}>{children}</kbd>
);

const Divider = ({ className = '' }) => (
  <div className={`h-px bg-white/[0.06] ${className}`} />
);

const SectionLabel = ({ children, right, className = '' }) => (
  <div className={`flex items-center justify-between px-4 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-tertiary ${className}`}>
    <span>{children}</span>
    {right}
  </div>
);

Object.assign(window, {
  Icon, fmt, Pill, CategoryPill, FreqPill, KeyCap, Divider, SectionLabel,
});


// ---- next file ----

// Workbench surface — the hero. Three states: empty, running, results.

const EXAMPLE_QUERIES = [
  'private sector credit by sector since 2015',
  'NRF inflows actual vs budget 2020 to 2026',
  'real GDP overall vs non-oil since 2017',
  'NPL ratio quarterly since 2017',
  'CPI inflation and G$ exchange rate since 2020',
];

// Map a natural-language query to a canned result.
function resolveQuery(q) {
  const t = q.toLowerCase();
  if (t.includes('credit') || t.includes('psc')) return 'psc';
  if (t.includes('nrf')) return 'nrf';
  if (t.includes('gdp') || t.includes('growth')) return 'gdp';
  if (t.includes('npl') || t.includes('non-performing')) return 'npl';
  if (t.includes('cpi') || t.includes('inflation') || t.includes('exchange')) return 'ambiguous';
  return 'psc';
}

// --- Chart wrapper with our styling ---
const axisProps = {
  tick: { fill: '#8A8778', fontSize: 11, fontFamily: 'Outfit' },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
  tickLine: { stroke: 'rgba(255,255,255,0.06)' },
};

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-strong rounded-md px-3 py-2 text-[11px] shadow-xl">
      <div className="font-medium text-text-primary mb-1 font-mono">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-3 justify-between min-w-[180px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[1px]" style={{ background: p.color }} />
            <span className="text-text-secondary">{p.name}</span>
          </div>
          <span className="num text-text-primary font-medium">
            {p.value === null || p.value === undefined ? '—' : (typeof p.value === 'number' ? p.value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : p.value)}
          </span>
        </div>
      ))}
      {unit ? <div className="mt-1 pt-1 border-t border-white/5 text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{unit}</div> : null}
    </div>
  );
}

function PscAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }} stackOffset="none">
        <defs>
          <linearGradient id="g_biz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="g_mort" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#7AA7D9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#7AA7D9" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="g_hh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#B099D4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#B099D4" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v)} />
        <Tooltip content={<CustomTooltip unit="G$ millions" />} cursor={{ stroke: 'rgba(212,175,55,0.25)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="business"   stackId="1" name="Business enterprises" stroke="#D4AF37" strokeWidth={1.6} fill="url(#g_biz)" />
        <Area type="monotone" dataKey="mortgages"  stackId="1" name="Real estate mortgages" stroke="#7AA7D9" strokeWidth={1.4} fill="url(#g_mort)" />
        <Area type="monotone" dataKey="households" stackId="1" name="Households"            stroke="#B099D4" strokeWidth={1.4} fill="url(#g_hh)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function NrfBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }} barCategoryGap={24}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => fmt.nc(v)} />
        <Tooltip content={<CustomTooltip unit="US$ millions" />} cursor={{ fill: 'rgba(212,175,55,0.06)' }} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
        <Bar dataKey="actual" name="Actual" fill="#D4AF37" radius={[2,2,0,0]} />
        <Bar dataKey="budget" name="Budget" fill="#7AA7D9" radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GdpLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="year" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
        <Tooltip content={<CustomTooltip unit="percent" />} cursor={{ stroke: 'rgba(212,175,55,0.25)' }} />
        <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11, color: '#C7C2B3' }} iconType="square" />
        <Line type="monotone" dataKey="overall" name="Overall real GDP" stroke="#D4AF37" strokeWidth={1.8} dot={{ r: 2.5, fill: '#D4AF37' }} />
        <Line type="monotone" dataKey="nonoil" name="Non-oil real GDP" stroke="#7AA7D9" strokeWidth={1.6} dot={{ r: 2.5, fill: '#7AA7D9' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function NplLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: 8 }}>
        <defs>
          <linearGradient id="g_npl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#D4AF37" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="q" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<CustomTooltip unit="percent" />} cursor={{ stroke: 'rgba(212,175,55,0.25)' }} />
        <Area type="monotone" dataKey="npl" name="NPL ratio" stroke="#D4AF37" strokeWidth={1.8} fill="url(#g_npl)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// --- Query bar ---
function QueryBar({ value, onChange, onRun, manualMode, onToggleManual, disabled }) {
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPh((p) => (p + 1) % EXAMPLE_QUERIES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass-strong rounded-lg p-1.5 flex items-center gap-1.5 gold-ring">
      <div className="pl-3 pr-1 text-gold-300">
        <Icon.Sparkle className="w-4 h-4" />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onRun(); }}
        placeholder={`Try: ${EXAMPLE_QUERIES[ph]}`}
        className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary py-2.5 px-1 font-normal"
        disabled={disabled}
      />
      <button
        onClick={onToggleManual}
        className={`h-9 px-3 rounded-md text-[12px] flex items-center gap-1.5 border transition-colors ${manualMode ? 'bg-white/[0.06] border-white/15 text-text-primary' : 'bg-transparent border-white/10 text-text-tertiary hover:text-text-secondary hover:border-white/20'}`}
        title="Toggle manual picker"
      >
        <Icon.Sliders className="w-3.5 h-3.5" />
        Manual
      </button>
      <div className="w-px h-6 bg-white/10 mx-1" />
      <button
        onClick={onRun}
        disabled={disabled}
        className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold tracking-wide flex items-center gap-1.5 transition-colors disabled:opacity-50"
      >
        Run
        <KeyCap className="!bg-black/20 !border-black/20 !text-ink-950">↵</KeyCap>
      </button>
    </div>
  );
}

function ManualPicker({ selected, onToggle }) {
  const all = window.EPAU_DATA.INDICATORS;
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">Manual: pick indicators</div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <span>Date range</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Jan 2015</span>
            <span>to</span>
            <span className="num text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Feb 2026</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span>Chart</span>
            <span className="text-text-secondary bg-white/5 border border-white/10 rounded px-2 py-0.5">Stacked area</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto scroll-thin pr-1">
        {all.map((ind) => {
          const on = selected.includes(ind.id);
          return (
            <button
              key={ind.id}
              onClick={() => onToggle(ind.id)}
              className={`text-left px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-2 ${on ? 'bg-gold-300/10 border-gold-300/40 text-text-primary' : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-text-secondary'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-gold-300 bg-gold-300' : 'border-white/20'}`}>
                {on ? <Icon.Check className="w-3 h-3 text-ink-950" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] leading-tight truncate">{ind.name}</span>
                <span className="block text-[10px] text-text-tertiary">{ind.source.split(',')[0]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Disambiguation({ onPick }) {
  const options = [
    { id: 'cpi',   title: 'CPI inflation, 12-month', detail: 'Macro · monthly · latest Feb 2026' },
    { id: 'fx',    title: 'Exchange rate, G$ per US$ period average', detail: 'External · monthly · latest Feb 2026' },
    { id: 'both',  title: 'Both, on a dual-axis chart', detail: 'Combine CPI and FX pass-through' },
  ];
  return (
    <div className="glass rounded-lg mt-2 p-3 fade-up">
      <div className="flex items-start gap-2 mb-2">
        <div className="text-gold-300 mt-0.5"><Icon.Sparkle className="w-3.5 h-3.5" /></div>
        <div>
          <div className="text-[13px] text-text-primary">Three possible matches. Which did you mean?</div>
          <div className="text-[11px] text-text-tertiary">Pick one to run, or refine the query.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className="text-left p-3 rounded-md bg-white/[0.02] border border-white/8 hover:border-gold-300/40 hover:bg-gold-300/5 transition-colors"
          >
            <div className="text-[12.5px] text-text-primary font-medium leading-tight">{o.title}</div>
            <div className="text-[10.5px] text-text-tertiary mt-1">{o.detail}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Skeleton / running state ---
function RunningState() {
  const steps = [
    { label: 'Parsing query intent', done: true },
    { label: 'Matching indicators against catalog', done: true },
    { label: 'Fetching observations (1,247 rows)', done: false, active: true },
    { label: 'Rendering chart', done: false },
  ];
  return (
    <div className="grid grid-cols-[1fr_320px] gap-3 mt-3 fade-up">
      <div className="glass rounded-lg p-4 h-[420px] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" />
          <span className="text-[11.5px] uppercase tracking-[0.14em] text-gold-300 font-medium">Running</span>
          <span className="text-[11px] text-text-tertiary ml-auto num">1.2s</span>
        </div>
        <div className="space-y-2 mb-5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-[12px]">
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${s.done ? 'bg-gold-300/20 border-gold-300/50' : s.active ? 'border-gold-300' : 'border-white/15'}`}>
                {s.done ? <Icon.Check className="w-2.5 h-2.5 text-gold-300" /> : s.active ? <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-pulse" /> : null}
              </span>
              <span className={s.done ? 'text-text-secondary' : s.active ? 'text-text-primary' : 'text-text-tertiary'}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full">
            {[0,1,2,3,4].map(i => <line key={i} x1="0" y1={40*i+10} x2="400" y2={40*i+10} stroke="rgba(255,255,255,0.04)" />)}
            <path d="M 10 160 Q 60 150, 90 140 T 170 110 T 250 80 T 330 60 T 390 40"
              stroke="rgba(212,175,55,0.45)" strokeWidth="1.8" fill="none" strokeDasharray="4 4" className="skeleton-bar"/>
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {[56,80,120].map((h,i) => (
          <div key={i} className="glass rounded-lg p-3">
            <div className="skeleton-bar h-2 w-20 bg-white/10 rounded mb-2" style={{ animationDelay: `${i*0.15}s` }}/>
            <div className="skeleton-bar h-1.5 bg-white/5 rounded mb-1.5" style={{ animationDelay: `${i*0.15+0.1}s` }}/>
            <div className="skeleton-bar h-1.5 w-3/4 bg-white/5 rounded mb-1.5" style={{ animationDelay: `${i*0.15+0.2}s` }}/>
            <div className="skeleton-bar h-1.5 w-5/6 bg-white/5 rounded" style={{ animationDelay: `${i*0.15+0.3}s`, height: h > 100 ? '40px' : undefined }}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Results: the main payload ---
function ResultsPanel({ view, setView, commentary, setCommentary }) {
  const [chartType, setChartType] = useState(view.chart);
  const [showTable, setShowTable] = useState(false);
  const { PSC_SERIES, NRF_SERIES, GDP_SERIES, NPL_SERIES } = window.EPAU_DATA;

  const spec = {
    psc: {
      title: 'Private sector credit by sector',
      subtitle: 'Annual stock, G$ millions, 2015 to 2026',
      indicators: [
        { id: 'psc_business',   name: 'Business enterprises',    unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#D4AF37' },
        { id: 'psc_mortgages',  name: 'Real estate mortgages',   unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#7AA7D9' },
        { id: 'psc_households', name: 'Households',              unit: 'G$ millions', source: 'BoG Statistical Bulletin Tbl 3.4', color: '#B099D4' },
      ],
      caveats: [
        { level: 'info', text: 'Figures are end-of-period stock; flows are derivable as first differences.' },
        { level: 'warn', text: 'Credit classification revised in the 2022 Statistical Bulletin; "other services" was reallocated across business and households. Pre-2022 values are BoG-backcast.' },
      ],
      headline: { label: 'Total, 2026 (Feb)', value: '500,800', unit: 'G$ millions', delta: '+12.4%', deltaLabel: 'vs. same month 2025' },
      data: PSC_SERIES,
      render: (d) => <PscAreaChart data={d} />,
      table: ['year','business','mortgages','households'],
      tableLabels: { year: 'Year', business: 'Business', mortgages: 'Mortgages', households: 'Households' },
      commentary: "Private sector credit climbed to G$500.8 billion in February 2026, extending a broad-based expansion that has run alongside the oil-era investment cycle. Business enterprise lending remains the largest single category, but the share of real estate mortgages has risen from roughly 22 percent of the portfolio in 2015 to 34 percent today, reflecting sustained mortgage underwriting by commercial banks against the backdrop of firm residential demand in Regions 3 and 4. Household credit has grown in tandem with formal-sector employment, though from a low base. The composition shift warrants continued macroprudential attention, particularly as the mortgage book has now doubled in nominal terms over four years; stress-testing results due from the Bank of Guyana in Q2 will inform whether the sector-specific capital add-ons require recalibration.",
    },
    nrf: {
      title: 'NRF inflows, actual versus budget',
      subtitle: 'US$ millions, 2020 to 2026',
      indicators: [
        { id: 'nrf_inflows_actual', name: 'Actual',  unit: 'US$ millions', source: 'MoF NRF Quarterly Reports',   color: '#D4AF37' },
        { id: 'nrf_inflows_budget', name: 'Budget',  unit: 'US$ millions', source: 'National Budget Appendix III', color: '#7AA7D9' },
      ],
      caveats: [
        { level: 'warn', text: 'Royalties recorded on cash basis; 2025 figures remain provisional pending audit completion.' },
        { level: 'info', text: '2026 actual not yet observed; budget value shown for comparison.' },
      ],
      headline: { label: '2025 shortfall', value: '(450)', unit: 'US$ millions', delta: '-15.5%', deltaLabel: 'vs. budget' },
      data: NRF_SERIES,
      render: (d) => <NrfBarChart data={d} />,
      table: ['year','actual','budget'],
      tableLabels: { year: 'Year', actual: 'Actual', budget: 'Budget' },
      commentary: "NRF inflows in 2025 totalled US$2,450 million, undershooting the US$2,900 million budget by about US$450 million. The shortfall reflects softer realised Brent prices in the second half and a scheduled Liza Phase 1 maintenance turnaround that trimmed lifted volumes. On a multi-year view, the Fund has received US$8,510 million since 2020, tracking 94 percent of cumulative budget. The 2026 budget of US$2,800 million assumes an average realised price of US$75 per barrel and continued ramp of the Payara and Yellowtail developments; risks are weighted to the downside on price and to the upside on volumes. EPAU recommends retaining the current withdrawal rule pending the Q2 reassessment.",
    },
    gdp: {
      title: 'Real GDP growth: overall versus non-oil',
      subtitle: 'Percent, year-on-year, 2017 to 2025',
      indicators: [
        { id: 'gdp_real_growth',   name: 'Overall real GDP', unit: 'percent', source: 'BoS National Accounts', color: '#D4AF37' },
        { id: 'gdp_nonoil_growth', name: 'Non-oil real GDP', unit: 'percent', source: 'BoS National Accounts', color: '#7AA7D9' },
      ],
      caveats: [
        { level: 'warn', text: '2025 is a first estimate and is subject to revision with the Q4 national accounts release scheduled for April.' },
        { level: 'info', text: 'Non-oil series excludes direct contribution of crude production; indirect effects through services and construction remain.' },
      ],
      headline: { label: 'Non-oil GDP, 2025', value: '6.3', unit: 'percent', delta: '-2.2pp', deltaLabel: 'vs. 2024' },
      data: GDP_SERIES,
      render: (d) => <GdpLineChart data={d} />,
      table: ['year','overall','nonoil'],
      tableLabels: { year: 'Year', overall: 'Overall', nonoil: 'Non-oil' },
      commentary: "Real GDP expanded 14.4 percent in 2025, a notable moderation from 43.6 percent in 2024 as the base effect from Payara first oil rolled off. Non-oil growth registered 6.3 percent, down from 8.5 percent the prior year but still well above the pre-oil trend of roughly 3 percent. Construction and wholesale and retail trade continued to lead the non-oil expansion, supported by public capital execution at 91 percent of budget. Services, particularly transport and communication, decelerated mildly in the second half. The divergence between headline and non-oil growth will narrow further as additional production phases reach nameplate and base effects compress, making the non-oil series the more policy-relevant gauge from 2026 onward.",
    },
    npl: {
      title: 'Non-performing loans ratio',
      subtitle: 'Percent of total loans, quarterly, 2017 to 2025',
      indicators: [
        { id: 'npl_ratio', name: 'NPL ratio', unit: 'percent', source: 'BoG Financial Stability Report', color: '#D4AF37' },
      ],
      caveats: [
        { level: 'info', text: 'Classification follows IFRS 9 Stage 3; restructured loans are included after the observation period.' },
      ],
      headline: { label: 'Q4 2025', value: '4.6', unit: 'percent', delta: '-8.0pp', deltaLabel: 'vs. 2018 peak' },
      data: NPL_SERIES,
      render: (d) => <NplLineChart data={d} />,
      table: ['q','npl'],
      tableLabels: { q: 'Quarter', npl: 'NPL ratio' },
      commentary: "The non-performing loans ratio stood at 4.6 percent in the fourth quarter of 2025, essentially flat against the prior quarter and well below the 12.9 percent peak recorded in the first quarter of 2018. The decade-long decline reflects both numerator and denominator effects: resolution of legacy exposures in the gold and rice sectors, tighter underwriting standards following the 2019 prudential reforms, and rapid growth in the performing loan book. The modest uptick over the past four quarters warrants monitoring; it is concentrated in small and medium enterprise exposures, particularly in construction subcontracting. Absent a broader deterioration, current coverage ratios of approximately 78 percent suggest the banking system retains ample buffers.",
    },
  }[view.kind];

  return (
    <div className="mt-3 fade-up">
      {/* Header row: title + chart type switcher */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-[26px] leading-[1.15] text-text-primary">{spec.title}</h2>
          <div className="text-[12.5px] text-text-tertiary mt-0.5">{spec.subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/[0.03] border border-white/8">
            {[
              { id: 'area', label: 'Area', icon: 'Chart' },
              { id: 'line', label: 'Line', icon: 'Chart' },
              { id: 'bar',  label: 'Bar',  icon: 'Chart' },
              { id: 'table',label: 'Table',icon: 'Table' },
            ].map((t) => {
              const ActiveIcon = Icon[t.icon];
              const on = chartType === t.id;
              return (
                <button key={t.id} onClick={() => setChartType(t.id)}
                  className={`px-2.5 h-7 rounded flex items-center gap-1.5 text-[11.5px] transition-colors ${on ? 'bg-white/[0.08] text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}>
                  <ActiveIcon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button className="h-7 w-7 rounded-md bg-white/[0.03] border border-white/8 text-text-tertiary hover:text-text-primary flex items-center justify-center" title="Pin to saved views">
            <Icon.Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        {/* Chart region */}
        <div className="glass rounded-lg p-4 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.label}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-[32px] leading-none text-gold-300 num">{spec.headline.value}</span>
                <span className="text-[11.5px] text-text-tertiary">{spec.headline.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{spec.headline.deltaLabel}</div>
              <div className={`text-[18px] num mt-0.5 ${spec.headline.delta.startsWith('-') || spec.headline.delta.startsWith('(') ? 'text-[#E06C6C]' : 'text-[#7FC29B]'}`}>{spec.headline.delta}</div>
            </div>
          </div>
          <div className="h-[320px]">
            {chartType === 'table' ? (
              <ResultsTable spec={spec} />
            ) : spec.render(spec.data)}
          </div>
          {/* Inline legend / source */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center gap-3 flex-wrap">
              {spec.indicators.map((ind) => (
                <div key={ind.id} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-text-secondary">{ind.name}</span>
                  <span className="text-text-quat">·</span>
                  <span className="text-text-tertiary">{ind.unit}</span>
                </div>
              ))}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
              As of Mar 17, 2026
            </div>
          </div>
        </div>

        {/* Right stack */}
        <div className="space-y-3">
          <SidePanel title="Selected indicators" count={spec.indicators.length}>
            {spec.indicators.map((ind) => (
              <div key={ind.id} className="px-4 py-2.5 border-t border-white/5 first:border-t-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ind.color }} />
                  <span className="text-[12.5px] text-text-primary font-medium truncate">{ind.name}</span>
                </div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5 pl-3.5">
                  {ind.unit} · {ind.source}
                </div>
              </div>
            ))}
          </SidePanel>

          <CaveatsPanel caveats={spec.caveats} />

          <DataTableToggle spec={spec} open={showTable} onToggle={() => setShowTable(!showTable)} />
        </div>
      </div>

      {/* Commentary */}
      <CommentaryPanel spec={spec} commentary={commentary} setCommentary={setCommentary} />

      {/* Export row */}
      <div className="mt-3 flex items-center justify-between glass rounded-lg px-4 py-3">
        <div className="text-[11.5px] text-text-tertiary flex items-center gap-2">
          <Icon.Check className="w-3.5 h-3.5 text-[#7FC29B]" />
          Query resolved against 3 indicators, 42 observations. Last re-ingest 09:14 GYT today.
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.Download className="w-3.5 h-3.5" /> Chart as PNG
          </button>
          <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:border-white/20 hover:text-text-primary text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.File className="w-3.5 h-3.5" /> Export as Word
          </button>
          <button className="h-8 px-3 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12px] flex items-center gap-1.5 transition-colors">
            <Icon.Pin className="w-3.5 h-3.5" /> Save this view
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ title, count, children }) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <SectionLabel right={<span className="num text-text-quat">{count}</span>}>{title}</SectionLabel>
      {children}
    </div>
  );
}

function CaveatsPanel({ caveats }) {
  return (
    <div className="glass rounded-lg overflow-hidden border-l-2 border-l-[#E0A050]/40">
      <div className="px-4 pt-2 pb-1.5 flex items-center gap-2">
        <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050]" />
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">Caveats</span>
        <span className="num text-text-quat text-[10.5px] ml-auto">{caveats.length}</span>
      </div>
      {caveats.map((c, i) => (
        <div key={i} className="px-4 py-2 border-t border-white/5 flex gap-2">
          <span className={`w-1 mt-1 shrink-0 self-stretch rounded-sm ${c.level === 'warn' ? 'bg-[#E0A050]/60' : 'bg-white/15'}`} />
          <span className="text-[11.5px] text-text-secondary leading-snug">{c.text}</span>
        </div>
      ))}
    </div>
  );
}

function DataTableToggle({ spec, open, onToggle }) {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon.Table className="w-3.5 h-3.5 text-text-tertiary" />
          <span className="text-[12px] text-text-secondary">Data table</span>
          <span className="num text-text-quat text-[10.5px]">{spec.data.length} rows</span>
        </div>
        <Icon.Chev className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-white/5 max-h-56 overflow-y-auto scroll-thin">
          <table className="w-full text-[11px] num">
            <thead className="bg-white/[0.02] text-text-tertiary">
              <tr>
                {spec.table.map((k) => <th key={k} className="text-right font-medium px-3 py-1.5 first:text-left uppercase tracking-[0.1em] text-[10px]">{spec.tableLabels[k]}</th>)}
              </tr>
            </thead>
            <tbody>
              {spec.data.map((row, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                  {spec.table.map((k) => (
                    <td key={k} className={`px-3 py-1.5 text-right first:text-left ${k === spec.table[0] ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {row[k] === null || row[k] === undefined ? <span className="text-text-quat">—</span> : (typeof row[k] === 'number' ? fmt.n(row[k], k === 'npl' || k.includes('nonoil') || k.includes('overall') ? 1 : 0) : row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ResultsTable({ spec }) {
  return (
    <div className="h-full overflow-auto scroll-thin">
      <table className="w-full text-[12px] num">
        <thead className="bg-white/[0.02] text-text-tertiary sticky top-0">
          <tr>
            {spec.table.map((k) => <th key={k} className="text-right font-medium px-4 py-2 first:text-left uppercase tracking-[0.1em] text-[10.5px]">{spec.tableLabels[k]}</th>)}
          </tr>
        </thead>
        <tbody>
          {spec.data.map((row, i) => (
            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
              {spec.table.map((k) => (
                <td key={k} className={`px-4 py-2 text-right first:text-left ${k === spec.table[0] ? 'text-text-secondary' : 'text-text-primary'}`}>
                  {row[k] === null || row[k] === undefined ? <span className="text-text-quat">—</span> : (typeof row[k] === 'number' ? fmt.n(row[k], (k === 'npl' || k === 'nonoil' || k === 'overall') ? 1 : 0) : row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommentaryPanel({ spec, commentary, setCommentary }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setGenerating(true);
    setCommentary(null);
    setTimeout(() => {
      setCommentary(spec.commentary);
      setGenerating(false);
    }, 1200);
  };

  const copy = () => {
    if (commentary) {
      navigator.clipboard?.writeText(commentary).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="mt-3">
      {!commentary && !generating ? (
        <div className="glass rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Commentary</span>
            </div>
            <div className="text-[13px] text-text-secondary">Draft a 150-word paragraph in EPAU house style, grounded in these observations.</div>
          </div>
          <button onClick={generate} className="h-9 px-4 rounded-md bg-gold-300/10 border border-gold-300/30 text-gold-200 hover:bg-gold-300/20 text-[12.5px] font-medium flex items-center gap-1.5 transition-colors">
            <Icon.Sparkle className="w-3.5 h-3.5" />
            Draft commentary
          </button>
        </div>
      ) : generating ? (
        <div className="glass-strong rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Drafting commentary</span>
          </div>
          <div className="space-y-2">
            {[100, 95, 92, 80].map((w, i) => (
              <div key={i} className="skeleton-bar h-2.5 bg-white/6 rounded" style={{ width: `${w}%`, animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-strong rounded-lg p-5 gold-ring">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon.Sparkle className="w-3.5 h-3.5 text-gold-300" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-gold-300 font-medium">Commentary</span>
              <span className="text-text-quat">·</span>
              <span className="text-[11px] text-text-tertiary num">{commentary.split(/\s+/).length} words · EPAU house style</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={generate} className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                <Icon.Refresh className="w-3 h-3" /> Regenerate
              </button>
              <button onClick={copy} className="h-7 px-2.5 rounded bg-white/[0.04] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[11.5px] flex items-center gap-1.5 transition-colors">
                {copied ? <><Icon.Check className="w-3 h-3 text-[#7FC29B]" /> Copied</> : <><Icon.Copy className="w-3 h-3" /> Copy to clipboard</>}
              </button>
            </div>
          </div>
          <p className="text-[14px] leading-[1.65] text-text-primary max-w-[86ch]" style={{ textWrap: 'pretty' }}>{commentary}</p>
        </div>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="mt-6 fade-up">
      <div className="text-center mb-5">
        <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Start with a question</div>
        <div className="font-serif text-[22px] text-text-secondary mt-1">What do you want to brief on?</div>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-[780px] mx-auto">
        {EXAMPLE_QUERIES.map((q) => (
          <button key={q} className="text-left glass rounded-md px-4 py-3 hover:border-gold-300/40 group transition-colors">
            <div className="text-[12.5px] text-text-secondary group-hover:text-text-primary leading-snug">{q}</div>
            <div className="text-[10.5px] text-text-quat mt-1 uppercase tracking-[0.12em] flex items-center gap-2">
              <KeyCap>↵</KeyCap> Run
            </div>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center text-[11.5px] text-text-tertiary">
        or press <KeyCap>⌘</KeyCap> <KeyCap>K</KeyCap> to search indicators by name.
      </div>
    </div>
  );
}

function Workbench({ initialState = 'empty', initialQuery = '' }) {
  const [state, setState] = useState(initialState); // 'empty' | 'running' | 'results' | 'ambiguous'
  const [query, setQuery] = useState(initialQuery);
  const [manualMode, setManualMode] = useState(false);
  const [selected, setSelected] = useState(['psc_business', 'psc_mortgages', 'psc_households']);
  const [view, setView] = useState({ kind: 'psc', chart: 'area' });
  const [commentary, setCommentary] = useState(null);

  // Jump on prop change (used when navigating from saved views)
  useEffect(() => {
    setState(initialState);
    setQuery(initialQuery);
    if (initialState === 'results') {
      const kind = resolveQuery(initialQuery);
      if (kind !== 'ambiguous') setView({ kind, chart: kind === 'nrf' ? 'bar' : kind === 'gdp' ? 'line' : 'area' });
      setCommentary(null);
    }
  }, [initialState, initialQuery]);

  const run = () => {
    if (!query.trim()) return;
    const kind = resolveQuery(query);
    if (kind === 'ambiguous') {
      setState('ambiguous');
      return;
    }
    setState('running');
    setCommentary(null);
    setTimeout(() => {
      setView({ kind, chart: kind === 'nrf' ? 'bar' : kind === 'gdp' ? 'line' : 'area' });
      setState('results');
    }, 1400);
  };

  const pickDisambiguation = (id) => {
    setState('running');
    setCommentary(null);
    setTimeout(() => {
      setView({ kind: id === 'both' ? 'gdp' : id === 'fx' ? 'gdp' : 'npl', chart: 'line' });
      setState('results');
    }, 1000);
  };

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Query Workbench</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Ask the workbook a question.</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2">
          <Icon.Dot className="w-2 h-2 text-[#7FC29B]" />
          <span>Catalog up to date · <span className="num">1,384 indicators · 94,726 observations</span></span>
        </div>
      </div>

      <QueryBar value={query} onChange={setQuery} onRun={run} manualMode={manualMode} onToggleManual={() => setManualMode((x) => !x)} disabled={state === 'running'} />
      {manualMode ? <ManualPicker selected={selected} onToggle={(id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])} /> : null}

      {/* State-specific body */}
      {state === 'empty' ? <EmptyHint /> : null}
      {state === 'ambiguous' ? <Disambiguation onPick={pickDisambiguation} /> : null}
      {state === 'running' ? <RunningState /> : null}
      {state === 'results' ? <ResultsPanel view={view} setView={setView} commentary={commentary} setCommentary={setCommentary} /> : null}

      {/* Footer: state switcher for demo purposes */}
      <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-quat">Prototype state demo</div>
        <div className="flex items-center gap-1.5">
          {[
            { id: 'empty', label: 'Empty' },
            { id: 'running', label: 'Running' },
            { id: 'ambiguous', label: 'Disambiguation' },
            { id: 'results', label: 'Results' },
          ].map((s) => (
            <button key={s.id} onClick={() => { setState(s.id); if (s.id === 'results') { setCommentary(null); setView({ kind: 'psc', chart: 'area' }); setQuery('private sector credit by sector since 2015'); } }}
              className={`h-7 px-3 rounded text-[11px] border transition-colors ${state === s.id ? 'bg-gold-300/10 border-gold-300/30 text-gold-200' : 'bg-white/[0.02] border-white/8 text-text-tertiary hover:text-text-secondary hover:border-white/15'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Workbench });


// ---- next file ----

// Catalog, Saved Views, Comparisons, Admin surfaces.

// ------------------ CATALOG ------------------

function Catalog({ onOpenInWorkbench }) {
  const all = window.EPAU_DATA.INDICATORS;
  const [q, setQ] = useState('');
  const [cats, setCats] = useState(new Set());
  const [freqs, setFreqs] = useState(new Set());
  const [sources, setSources] = useState(new Set());
  const [caveatOnly, setCaveatOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const categoryList = ['Macro', 'Fiscal', 'Monetary', 'External', 'Debt', 'Social'];
  const frequencyList = ['Annual', 'Quarterly', 'Monthly'];
  const sourceList = [...new Set(all.map((i) => i.source.split(',')[0]))];

  const filtered = all.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cats.size && !cats.has(i.category)) return false;
    if (freqs.size && !freqs.has(i.frequency)) return false;
    if (sources.size && !sources.has(i.source.split(',')[0])) return false;
    if (caveatOnly && !i.caveat) return false;
    return true;
  });

  const toggleSet = (s, v) => {
    const next = new Set(s);
    if (next.has(v)) next.delete(v); else next.add(v);
    return next;
  };

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Indicator Catalog</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Every series the workbook has ingested.</h1>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-tertiary pt-2 num">
          <span>Showing <span className="text-text-primary">{filtered.length}</span> of <span className="text-text-primary">{all.length}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Filter sidebar */}
        <div className="glass rounded-lg self-start sticky top-20 overflow-hidden">
          <SectionLabel>Filters</SectionLabel>
          <FilterGroup label="Category">
            {categoryList.map((c) => (
              <FilterCheck key={c} on={cats.has(c)} onToggle={() => setCats(toggleSet(cats, c))} label={c} right={<CategoryPill category={c} />} />
            ))}
          </FilterGroup>
          <Divider />
          <FilterGroup label="Frequency">
            {frequencyList.map((f) => (
              <FilterCheck key={f} on={freqs.has(f)} onToggle={() => setFreqs(toggleSet(freqs, f))} label={f} />
            ))}
          </FilterGroup>
          <Divider />
          <FilterGroup label="Source">
            {sourceList.map((s) => (
              <FilterCheck key={s} on={sources.has(s)} onToggle={() => setSources(toggleSet(sources, s))} label={s} />
            ))}
          </FilterGroup>
          <Divider />
          <div className="px-4 py-3">
            <button onClick={() => setCaveatOnly(!caveatOnly)} className={`w-full h-8 rounded-md flex items-center justify-between px-3 text-[12px] border transition-colors ${caveatOnly ? 'bg-[#E0A050]/10 border-[#E0A050]/30 text-[#E0A050]' : 'bg-white/[0.02] border-white/8 text-text-secondary hover:border-white/15'}`}>
              <span className="flex items-center gap-2"><Icon.Warn className="w-3.5 h-3.5" /> Has caveat</span>
              <span className={`w-6 h-3.5 rounded-full relative ${caveatOnly ? 'bg-[#E0A050]/40' : 'bg-white/10'}`}>
                <span className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-white/80 transition-all ${caveatOnly ? 'left-[10px]' : 'left-0'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* List */}
        <div>
          <div className="glass rounded-t-lg p-1.5 flex items-center gap-2">
            <Icon.Search className="w-4 h-4 text-text-tertiary ml-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter indicators by name"
              className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1" />
            <KeyCap>/</KeyCap>
          </div>
          <div className="bg-white/[0.01] border border-white/6 border-t-0 rounded-b-lg overflow-hidden">
            {/* header */}
            <div className="grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-text-tertiary bg-white/[0.02]">
              <div>Indicator</div>
              <div>Category</div>
              <div>Frequency</div>
              <div>Latest</div>
              <div>Source</div>
              <div></div>
            </div>
            <div className="max-h-[640px] overflow-y-auto scroll-thin">
              {filtered.map((ind, i) => (
                <button key={ind.id} onClick={() => setSelected(ind)}
                  className="w-full grid grid-cols-[1fr_110px_110px_120px_170px_28px] gap-3 px-4 py-2 border-t border-white/5 hover:bg-white/[0.025] transition-colors text-left items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    {ind.caveat ? <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050] shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0"/>}
                    <span className="text-[12.5px] text-text-primary truncate">{ind.name}</span>
                  </div>
                  <div><CategoryPill category={ind.category} /></div>
                  <div><FreqPill frequency={ind.frequency} /></div>
                  <div className="text-[11.5px] num text-text-secondary">{ind.latest}</div>
                  <div className="text-[11px] text-text-tertiary truncate">{ind.source.split(',')[0]}</div>
                  <Icon.Chev className="w-4 h-4 text-text-quat -rotate-90" />
                </button>
              ))}
              {filtered.length === 0 ? <div className="px-4 py-6 text-[12px] text-text-tertiary">No indicators match those filters.</div> : null}
            </div>
          </div>
        </div>
      </div>

      {selected ? <IndicatorDetail ind={selected} onClose={() => setSelected(null)} onOpenInWorkbench={onOpenInWorkbench} /> : null}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="px-1 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary px-3 pb-1.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
function FilterCheck({ on, onToggle, label, right }) {
  return (
    <button onClick={onToggle} className="w-full h-7 px-3 flex items-center gap-2 hover:bg-white/[0.03] text-left">
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-gold-300 bg-gold-300' : 'border-white/20'}`}>
        {on ? <Icon.Check className="w-3 h-3 text-ink-950"/> : null}
      </span>
      <span className="text-[12px] text-text-secondary flex-1">{label}</span>
      {right}
    </button>
  );
}

function IndicatorDetail({ ind, onClose, onOpenInWorkbench }) {
  // Tiny time series preview
  const preview = useMemo(() => {
    const out = [];
    let base = 100;
    for (let y = 2015; y <= 2026; y++) {
      base *= 1 + (0.04 + Math.sin(y * 1.3) * 0.05);
      out.push({ year: String(y), v: Math.round(base) });
    }
    return out;
  }, [ind.id]);
  const R = window.Recharts;
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute top-0 right-0 bottom-0 w-[520px] slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="h-full glass-strong border-l border-white/10 flex flex-col">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CategoryPill category={ind.category} />
                <FreqPill frequency={ind.frequency} />
                {ind.caveat ? <Pill tone="warn"><Icon.Warn className="w-3 h-3" /> caveat</Pill> : null}
              </div>
              <h2 className="font-serif text-[24px] leading-[1.15] text-text-primary mt-2">{ind.name}</h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">{ind.source}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/10 text-text-tertiary hover:text-text-primary flex items-center justify-center">
              <Icon.Close className="w-3.5 h-3.5" />
            </button>
          </div>
          <Divider />
          <div className="flex-1 overflow-y-auto scroll-thin">
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Preview</div>
              <div className="h-36">
                <R.ResponsiveContainer width="100%" height="100%">
                  <R.AreaChart data={preview} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g_prev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <R.XAxis dataKey="year" tick={{ fill: '#8A8778', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                    <R.YAxis tick={{ fill: '#8A8778', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} tickFormatter={(v) => fmt.nc(v)} width={40}/>
                    <R.Area type="monotone" dataKey="v" stroke="#D4AF37" strokeWidth={1.4} fill="url(#g_prev)" />
                  </R.AreaChart>
                </R.ResponsiveContainer>
              </div>
            </div>
            <Divider />
            <div className="px-5 py-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Metadata</div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 gap-x-4 text-[12px]">
                <dt className="text-text-tertiary">Unit</dt><dd className="text-text-primary">{ind.unit}</dd>
                <dt className="text-text-tertiary">Frequency</dt><dd className="text-text-primary">{ind.frequency}</dd>
                <dt className="text-text-tertiary">Source</dt><dd className="text-text-primary">{ind.source}</dd>
                <dt className="text-text-tertiary">Sheet</dt><dd className="text-text-primary font-mono text-[11.5px]">{ind.sheet}</dd>
                <dt className="text-text-tertiary">Latest obs</dt><dd className="text-text-primary num">{ind.latest}</dd>
                <dt className="text-text-tertiary">Ingested</dt><dd className="text-text-primary num">Mar 17, 2026 at 09:14 GYT</dd>
              </dl>
            </div>
            {ind.caveat ? (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon.Warn className="w-3.5 h-3.5 text-[#E0A050]" />
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-[#E0A050] font-medium">Caveat</span>
                  </div>
                  <p className="text-[12.5px] text-text-secondary leading-snug">{ind.caveat}</p>
                </div>
              </>
            ) : null}
          </div>
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between">
            <div className="text-[11px] text-text-tertiary">Press <KeyCap>Esc</KeyCap> to close</div>
            <button onClick={() => onOpenInWorkbench(ind)}
              className="h-9 px-4 rounded-md bg-gold-300 hover:bg-gold-200 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors">
              Open in Workbench
              <Icon.Chev className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------ SAVED VIEWS ------------------

function SavedViews({ onOpen }) {
  const views = window.EPAU_DATA.SAVED_VIEWS;
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Saved Views</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Queries you re-run.</h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 text-[12.5px] flex items-center gap-1.5 transition-colors">
          <Icon.Refresh className="w-3.5 h-3.5" /> Re-run all
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {views.map((v) => <SavedCard key={v.id} view={v} onOpen={() => onOpen(v.query)} />)}
      </div>
    </div>
  );
}

function SavedCard({ view, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="glass rounded-lg p-4 flex flex-col gap-3 hover:border-gold-300/30 transition-colors relative group cursor-pointer"
      onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[18px] leading-[1.2] text-text-primary flex-1">{view.name}</h3>
        <button onClick={(e) => { e.stopPropagation(); }} className="w-7 h-7 rounded-md border border-white/8 bg-white/[0.02] text-text-tertiary hover:text-text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Icon.Chev className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-[11px] text-text-tertiary font-mono leading-snug">{view.query}</div>
      <ThumbChart kind={view.chart} />
      <div className="flex items-center flex-wrap gap-1.5">
        {view.indicators.map((i) => (
          <span key={i} className="text-[10.5px] px-1.5 h-5 rounded-sm bg-white/[0.04] border border-white/8 text-text-secondary flex items-center">{i}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-auto">
        <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.12em] num">Last run {view.last_run}</div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10.5px]">
          <button onClick={(e) => e.stopPropagation()} className="text-text-tertiary hover:text-text-primary px-1.5">Rename</button>
          <span className="text-text-quat">·</span>
          <button onClick={(e) => e.stopPropagation()} className="text-text-tertiary hover:text-[#E06C6C] px-1.5">Delete</button>
        </div>
      </div>
    </div>
  );
}

function ThumbChart({ kind }) {
  const points = {
    area: 'M0,40 L0,22 Q20,20 40,18 T80,14 T120,10 T160,8 T200,6 L200,40 Z',
    line: 'M0,32 Q20,26 40,30 T80,16 T120,20 T160,8 T200,12',
    'line-fall': 'M0,8 Q20,10 40,12 T80,16 T120,20 T160,24 T200,22',
    'bar-paired': null,
    dual: 'M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6',
  }[kind];
  return (
    <div className="h-20 rounded-md bg-white/[0.02] border border-white/5 relative overflow-hidden">
      <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`thumb_${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        {kind === 'bar-paired' ? (
          <g>
            {[0,1,2,3,4,5,6].map((i) => (
              <g key={i}>
                <rect x={i*28+8}  y={20 + (i%2===0?0:2)} width="8" height={20 - (i%2===0?0:2)} fill="#D4AF37"/>
                <rect x={i*28+18} y={16 + (i%3===0?2:0)} width="8" height={24 - (i%3===0?2:0)} fill="#7AA7D9"/>
              </g>
            ))}
          </g>
        ) : kind === 'dual' ? (
          <g>
            <path d="M0,28 Q20,26 40,24 T80,20 T120,18 T160,14 T200,10" stroke="#7AA7D9" strokeWidth="1.5" fill="none"/>
            <path d="M0,20 Q20,18 40,16 T80,12 T120,10 T160,8 T200,6" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
          </g>
        ) : kind === 'area' ? (
          <path d={points} stroke="#D4AF37" strokeWidth="1.5" fill={`url(#thumb_${kind})`} />
        ) : (
          <path d={points} stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
        )}
      </svg>
    </div>
  );
}

// ------------------ COMPARISONS ------------------

function Comparisons() {
  const tables = window.EPAU_DATA.COMPARISON_TABLES;
  const [selected, setSelected] = useState(tables[0].id);
  const [q, setQ] = useState('');
  const current = tables.find((t) => t.id === selected);
  const list = tables.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-8 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Comparisons</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Side-by-side reference tables.</h1>
        </div>
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="glass rounded-lg overflow-hidden self-start">
          <div className="p-1.5 flex items-center gap-2 border-b border-white/5">
            <Icon.Search className="w-4 h-4 text-text-tertiary ml-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tables"
              className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-tertiary py-1.5 px-1"/>
          </div>
          {list.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`w-full text-left px-4 py-3 border-t border-white/5 first:border-t-0 flex flex-col gap-0.5 transition-colors ${selected === t.id ? 'bg-gold-300/5 border-l-2 border-l-gold-300' : 'hover:bg-white/[0.02]'}`}>
              <div className="flex items-center gap-1.5">
                <Icon.Columns className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-[12.5px] text-text-primary">{t.name}</span>
              </div>
              <span className="text-[10.5px] text-text-tertiary pl-5 num">{t.rows.length} rows · {t.groups.reduce((n, g) => n + g.span, 0)} cols</span>
            </button>
          ))}
        </div>

        <div className="glass rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-serif text-[22px] text-text-primary leading-tight">{current.name}</h2>
              <div className="text-[11.5px] text-text-tertiary mt-1">{current.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <Icon.Download className="w-3.5 h-3.5" /> PNG
              </button>
              <button className="h-8 px-3 rounded-md bg-white/[0.03] border border-white/10 text-text-secondary hover:text-text-primary text-[12px] flex items-center gap-1.5">
                <Icon.File className="w-3.5 h-3.5" /> Word
              </button>
            </div>
          </div>

          <ComparisonTable table={current} />
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ table }) {
  const totalCols = table.groups.reduce((n, g) => n + g.span, 0);
  // Palette for group header accents
  const groupColors = ['#C8A87F', '#7AA7D9', '#B099D4'];
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-[12.5px] num border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium px-4 py-2 border-b border-white/10 align-bottom">Indicator</th>
            {table.groups.map((g, i) => (
              <th key={i} colSpan={g.span} className="text-center text-[11px] uppercase tracking-[0.14em] font-medium px-2 py-2 border-b border-white/10"
                style={{ color: groupColors[i % groupColors.length] }}>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border" style={{ borderColor: `${groupColors[i % groupColors.length]}40`, background: `${groupColors[i % groupColors.length]}0d` }}>
                  {g.label}
                </span>
              </th>
            ))}
            <th className="w-0 border-b border-white/10"></th>
          </tr>
          <tr>
            <th className="px-4 py-1.5 border-b border-white/5"></th>
            {table.groups.flatMap((g) => g.sub).map((s, i) => (
              <th key={i} className="text-right text-[10.5px] font-normal text-text-tertiary px-3 py-1.5 border-b border-white/5">{s}</th>
            ))}
            <th className="border-b border-white/5"></th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-[12.5px] text-text-primary border-b border-white/5">
                <span>{row.label.split(',')[0]}</span>
                <span className="text-text-tertiary text-[11px] ml-1.5">{row.label.includes(',') ? row.label.slice(row.label.indexOf(',')+1) : ''}</span>
              </td>
              {row.cells.map((c, ci) => (
                <td key={ci} className={`text-right px-3 py-2.5 border-b border-white/5 ${c === null || c === undefined ? 'text-text-quat' : (c < 0 ? 'text-[#E06C6C]' : 'text-text-primary')}`}>
                  {c === null || c === undefined ? '—' : (typeof c === 'number' ? fmt.n(c, Math.abs(c) < 100 ? 1 : 0) : c)}
                </td>
              ))}
              <td className="border-b border-white/5"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[10.5px] uppercase tracking-[0.12em] text-text-tertiary">
        Values in parentheses are negative. Bureau of Statistics and Ministry of Finance compilations.
      </div>
    </div>
  );
}

// ------------------ ADMIN ------------------

function Admin() {
  const run = window.EPAU_DATA.INGESTION_RUN;
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[11.5px] uppercase tracking-[0.18em] text-text-tertiary">Admin · Ingestion</div>
          <h1 className="font-serif text-[34px] leading-[1.1] text-text-primary mt-1">Last workbook re-ingest.</h1>
        </div>
        <button className="h-9 px-4 rounded-md bg-gold-300 text-ink-950 text-[12.5px] font-semibold flex items-center gap-1.5">
          <Icon.Refresh className="w-3.5 h-3.5" /> Re-ingest now
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        <StatCard label="Run started" value={run.timestamp} span={2}/>
        <StatCard label="Sheets parsed" value={run.sheets_parsed.toString()} />
        <StatCard label="Indicators upserted" value={run.indicators_upserted.toLocaleString()} />
        <StatCard label="Observations upserted" value={run.observations_upserted.toLocaleString()} />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-3">
        <div className="glass rounded-lg overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <Icon.Terminal className="w-4 h-4 text-gold-300"/>
              <span className="text-[12.5px] text-text-primary font-medium">Quarantined cells</span>
              <Pill tone="warn">{run.issues_count} issues</Pill>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-[11.5px] text-text-tertiary hover:text-text-primary flex items-center gap-1">
              {expanded ? 'Collapse' : 'Expand'} <Icon.Chev className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
            </button>
          </div>
          {expanded ? (
            <div className="font-mono text-[11.5px]">
              <div className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-text-tertiary bg-white/[0.02] border-b border-white/5">
                <div>Sheet</div><div>Cell</div><div>Reason</div><div>Severity</div>
              </div>
              {run.quarantine.map((q, i) => (
                <div key={i} className="grid grid-cols-[100px_72px_1fr_88px] gap-3 px-4 py-2 border-b border-white/4 hover:bg-white/[0.02]">
                  <div className="text-gold-200">{q.sheet}</div>
                  <div className="text-text-secondary num">{q.cell}</div>
                  <div className="text-text-primary font-sans text-[12px]">{q.reason}</div>
                  <div>
                    <SeverityPill s={q.severity}/>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Source workbook</div>
            <div className="flex items-center gap-2">
              <Icon.File className="w-4 h-4 text-text-tertiary" />
              <span className="text-[12.5px] text-text-primary font-mono truncate">{run.workbook}</span>
            </div>
            <div className="text-[11px] text-text-tertiary mt-1 num">{run.workbook_size} · 61 sheets · {run.duration} to parse</div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-3">Severity breakdown</div>
            <div className="space-y-2">
              {[
                { s: 'high', n: 4, c: '#E06C6C' },
                { s: 'medium', n: 5, c: '#E0A050' },
                { s: 'low', n: 5, c: '#7AA7D9' },
              ].map((x) => (
                <div key={x.s} className="flex items-center gap-2">
                  <span className="text-[11px] capitalize text-text-secondary w-16">{x.s}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(x.n/14)*100}%`, background: x.c }}/>
                  </div>
                  <span className="num text-[11px] text-text-primary w-5 text-right">{x.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-lg p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Previous runs</div>
            <div className="space-y-1.5 text-[11px] num">
              {['Mar 10, 2026','Mar 03, 2026','Feb 24, 2026','Feb 17, 2026'].map((d, i) => (
                <div key={d} className="flex items-center justify-between text-text-secondary">
                  <span>{d}</span>
                  <span className="text-text-tertiary">{[12,8,11,9][i]} issues</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, span = 1 }) {
  return (
    <div className={`glass rounded-lg p-4 ${span === 2 ? 'col-span-2' : ''}`}>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{label}</div>
      <div className="font-serif text-[22px] text-text-primary mt-1 leading-tight num">{value}</div>
    </div>
  );
}

function SeverityPill({ s }) {
  const tone = { high: 'danger', medium: 'warn', low: 'cool' }[s];
  return <Pill tone={tone}>{s}</Pill>;
}

Object.assign(window, { Catalog, SavedViews, Comparisons, Admin });


// ---- next file ----

// Main app shell: top nav, command palette, view routing.

function App() {
  const [route, setRoute] = useState('workbench');
  const [wbState, setWbState] = useState('results');
  const [wbQuery, setWbQuery] = useState('private sector credit by sector since 2015');
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Keyboard: Cmd+K, Escape
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((x) => !x); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openInWorkbench = (indOrQuery) => {
    const query = typeof indOrQuery === 'string'
      ? indOrQuery
      : (indOrQuery.id === 'nrf_inflows_actual'
         ? 'NRF inflows actual vs budget 2020 to 2026'
         : indOrQuery.id.startsWith('psc_')
         ? 'private sector credit by sector since 2015'
         : indOrQuery.id === 'gdp_real_growth' || indOrQuery.id === 'gdp_nonoil_growth'
         ? 'real GDP overall vs non-oil since 2017'
         : indOrQuery.id === 'npl_ratio'
         ? 'NPL ratio quarterly since 2017'
         : indOrQuery.name.toLowerCase());
    setWbQuery(query);
    setWbState('results');
    setRoute('workbench');
    setPaletteOpen(false);
  };

  return (
    <div className="min-h-screen">
      <TopNav route={route} setRoute={setRoute} onOpenPalette={() => setPaletteOpen(true)} />
      <main>
        {route === 'catalog'     ? <Catalog onOpenInWorkbench={openInWorkbench} /> : null}
        {route === 'workbench'   ? <Workbench initialState={wbState} initialQuery={wbQuery} /> : null}
        {route === 'saved'       ? <SavedViews onOpen={openInWorkbench} /> : null}
        {route === 'comparisons' ? <Comparisons /> : null}
        {route === 'admin'       ? <Admin /> : null}
      </main>
      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} onPick={openInWorkbench} onNav={(r) => { setRoute(r); setPaletteOpen(false); }} /> : null}
      <BottomStatus route={route}/>
    </div>
  );
}

function TopNav({ route, setRoute, onOpenPalette }) {
  const items = [
    { id: 'workbench',   label: 'Workbench', icon: 'Sparkle' },
    { id: 'catalog',     label: 'Catalog',   icon: 'Search' },
    { id: 'saved',       label: 'Saved Views', icon: 'Pin' },
    { id: 'comparisons', label: 'Comparisons', icon: 'Columns' },
    { id: 'admin',       label: 'Admin', icon: 'Terminal' },
  ];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/75 border-b border-white/5">
      <div className="max-w-[1500px] mx-auto px-8 h-[52px] flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold-300 to-gold-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-ink-950 text-[16px] leading-none">E</span>
            </div>
            <div className="absolute inset-0 border border-gold-200/50" />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-medium text-text-primary tracking-wide">EPAU</div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">Analyst Workbench</div>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 ml-4">
          {items.map((it) => {
            const I = Icon[it.icon];
            const on = route === it.id;
            return (
              <button key={it.id} onClick={() => setRoute(it.id)}
                className={`h-8 px-3 rounded-md flex items-center gap-1.5 text-[12.5px] transition-colors ${on ? 'bg-gold-300/10 text-gold-200 border border-gold-300/25' : 'text-text-secondary hover:text-text-primary border border-transparent'}`}>
                <I className="w-3.5 h-3.5" />
                {it.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onOpenPalette} className="h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/8 hover:border-white/15 text-text-tertiary hover:text-text-secondary flex items-center gap-2 text-[11.5px] min-w-[260px]">
            <Icon.Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search indicators, views, comparisons</span>
            <span className="flex items-center gap-0.5">
              <KeyCap>⌘</KeyCap><KeyCap>K</KeyCap>
            </span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span className="num">v2026.03.17</span>
            <span className="w-1 h-1 rounded-full bg-[#7FC29B]"/>
            <span>Sabina, EPAU</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CommandPalette({ onClose, onPick, onNav }) {
  const [q, setQ] = useState('');
  const all = window.EPAU_DATA.INDICATORS;
  const views = window.EPAU_DATA.SAVED_VIEWS;
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const inds = all.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const savedMatches = views.filter((v) => !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.query.toLowerCase().includes(q.toLowerCase())).slice(0, 3);

  const navItems = [
    { id: 'workbench', label: 'Go to Workbench', icon: 'Sparkle' },
    { id: 'catalog', label: 'Go to Catalog', icon: 'Search' },
    { id: 'saved', label: 'Go to Saved Views', icon: 'Pin' },
    { id: 'comparisons', label: 'Go to Comparisons', icon: 'Columns' },
    { id: 'admin', label: 'Go to Admin', icon: 'Terminal' },
  ].filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[640px] glass-strong rounded-xl gold-ring overflow-hidden fade-up">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/8">
          <Icon.Search className="w-4 h-4 text-gold-300" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search indicators, views, or navigate…"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary" />
          <KeyCap>Esc</KeyCap>
        </div>
        <div className="max-h-[50vh] overflow-y-auto scroll-thin py-1">
          {inds.length ? (
            <>
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Indicators</SectionLabel>
              {inds.map((i) => (
                <button key={i.id} onClick={() => onPick(i)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                  <Icon.Chart className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1">{i.name}</span>
                  <CategoryPill category={i.category} />
                  <span className="text-[10.5px] text-text-tertiary num min-w-[48px] text-right">{i.latest}</span>
                </button>
              ))}
            </>
          ) : null}
          {savedMatches.length ? (
            <>
              <Divider className="my-1" />
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Saved views</SectionLabel>
              {savedMatches.map((v) => (
                <button key={v.id} onClick={() => onPick(v.query)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                  <Icon.Pin className="w-3.5 h-3.5 text-text-tertiary" />
                  <span className="text-[12.5px] text-text-primary flex-1 truncate">{v.name}</span>
                  <span className="text-[10.5px] text-text-tertiary num">{v.last_run}</span>
                </button>
              ))}
            </>
          ) : null}
          {navItems.length ? (
            <>
              <Divider className="my-1"/>
              <SectionLabel className="!px-4 !py-1.5 !text-[10px]">Navigate</SectionLabel>
              {navItems.map((n) => {
                const I = Icon[n.icon];
                return (
                  <button key={n.id} onClick={() => onNav(n.id)} className="w-full flex items-center gap-3 px-4 h-9 hover:bg-white/[0.04] text-left">
                    <I className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-[12.5px] text-text-secondary flex-1">{n.label}</span>
                    <Icon.Chev className="w-3.5 h-3.5 -rotate-90 text-text-quat"/>
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
        <div className="flex items-center justify-between px-4 h-9 border-t border-white/8 bg-white/[0.02] text-[10.5px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><KeyCap>↵</KeyCap> open</span>
            <span className="flex items-center gap-1"><KeyCap>↑</KeyCap><KeyCap>↓</KeyCap> navigate</span>
          </div>
          <div className="flex items-center gap-1"><Icon.Keyboard className="w-3.5 h-3.5"/> Cmd palette</div>
        </div>
      </div>
    </div>
  );
}

function BottomStatus({ route }) {
  const labels = {
    workbench: 'Workbench',
    catalog: 'Indicator Catalog',
    saved: 'Saved Views',
    comparisons: 'Comparisons',
    admin: 'Ingestion Admin',
  };
  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-ink-950/85 backdrop-blur border-t border-white/5 z-20">
      <div className="max-w-[1500px] mx-auto h-full px-8 flex items-center justify-between text-[10.5px] text-text-tertiary font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#7FC29B]"/> connected</span>
          <span>{labels[route]}</span>
          <span>workbook rev 2026.03.17</span>
        </div>
        <div className="flex items-center gap-4">
          <span>1,384 indicators · 94,726 observations</span>
          <span>GYT 14:22</span>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
