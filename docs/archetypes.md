# Workbook archetype classification

Based on a header-region probe of every sheet in `Guyana Key Statistics_06022026 for Donald.xlsx` (61 sheets). Each row below records the shape signals that drove the classification; the adapter and config work follows this grid.

## Cross-cutting findings (apply to every adapter)

1. **Navigation hyperlinks on row 0.** Every sheet's col A row 0 contains `"Click here to go back to first page"` — a hyperlink back to `List of Sheets`. Skip row 0 in every adapter.
2. **`List of Sheets` reports `16383` columns.** That's Excel max — formatting artifact. Never iterate full width; clamp to the last non-empty column per row.
3. **Excel date serials in header rows.** Several sheets use numeric serials (e.g. `41791` = 2014-06-30, `45231` = 2023-10-01) as column or row headers. Primitives must coerce these with `XLSX.SSF.parse_date_code` (or a custom epoch-1900 converter with the Lotus leap-year bug handled) rather than treating as year integers.
4. **Composite/grouped headers.** Several sheets (Mortgages_CB, Vehicle Imports, Revenue & Expenditure, GOG Investment) have two-row headers where row N is a group label and row N+1 is a sub-column. Primitives need a two-row-header mode.
5. **Unit-declaration rows.** Many sheets carry units in row 1 or 2 (e.g. `"G$ Millions"`, `"US$ Millions"`, `"$US'000s"`). Parse these into the indicator's `unit` metadata and propagate to every indicator in that sheet unless a row overrides it.
6. **Subtotals vs. base indicators.** `Total Revenue`, `Total Government Expenditure`, `Total Earnings`, etc. often appear alongside components. Ingest both; flag totals with an `is_total` convention in the indicator id (e.g. `..._total`) so narrator can avoid double-counting.
7. **Scenario propagation.** Archetype D sheets (and some E sheets) put `ACTUAL|BUDGET|REVISED|PROJECTED` in a header row above the year row. The scenario in observations must default to `actual` when absent and carry the labeled value when present.
8. **Staleness caveats from the sheet itself.** Several sheets include `"To be updated to include 2024"`, `"Last updated: …"`, `"Date Added: …"`. Capture these as sheet-level caveats and attach to every indicator ingested from that sheet.

## Classification

Archetype legend matches the ingestion spec: A (years-as-cols), B (years-as-rows), C (dates-as-rows sub-annual), D (scenario-header), E (multi-block hybrid), F (Measures_*/political → `comparison_tables`), G (oddball singleton). Plus `SPECIAL` for the index tab and `SKIP` for the superseded copy.

| # | Sheet | Archetype | Notes |
|---|-------|-----------|-------|
| 1 | List of Sheets | SPECIAL | MoF's own index with caveat text. Parse first every run; attach caveats to matching indicators by sheet name. |
| 2 | GDP | B | Years in col B (1970→). Columns: Series, Overall, Non-Oil, IMF-WEO, growth rates, backcast. |
| 3 | Global Growth | A | Years across row 3 (1980→). Countries/regions as rows. |
| 4 | GDP Growth by Sector | A | Years across row 3 (2006→). Sectors as rows. Scenario hints in row 4. |
| 5 | Nominal GDP by Sector | A | Years across row 3 (2012→). |
| 6 | Production | B | Years in col B (1970→). Commodity columns (Sugar, Rice, Bauxite, Gold, Diamonds, Timber, Oil). |
| 7 | Oil Trajectory | A | IMF-style: `Subject Descriptor | Units | <years>`. Unit column per row — ingest `unit` per indicator. |
| 8 | Discoveries | G | Non-time-series reference table: block / discovery / date of notice. Land as `comparison_tables` (alongside Measures_*) or as a narrow indicator set keyed by discovery id. **Open question for step review.** |
| 9 | Oil Reserves Rank | G | Non-time-series ranking of countries. Treat as a single snapshot `comparison_table`. |
| 10 | NRF | D | "ACTUAL / PROJECTED" scenario headers. Unit row `$US'000s`. Multi-block (inflows, outflows, balances) — actually Archetype D+E. Bespoke adapter. |
| 11 | Exports | B | Years in col B (multi-decade). Commodity columns + Total Earnings block. Some block structure within — verify in adapter. |
| 12 | Merchandise Trade | C | Monthly, dates as Excel serials in col B (`45261` = Dec 2023, so monthly). `Month | Total Exports | Total Non-Oil Exports | Total Imports | Balance`. Header warns **"To be updated to include 2024"** → staleness caveat. |
| 13 | BOP | E | `Year | Period | Current | Capital | Errors | Overall`. 346/391 rows blank — sparse multi-block structure. Bespoke. |
| 14 | Current Transfers | E | Remittance flows. `Year | Credit | Debit | Net`. Multiple stacked tables (by transfer type). Bespoke. |
| 15 | FDI | E | Multi-block by source country and year. "Last updated: March-27-2024" → staleness caveat. Bespoke. |
| 16 | FDI 2 | A | `FDI inflows by country`. "Date Added: May-20-2024". Countries-as-rows, years-as-cols. Source: ECLAC. |
| 17 | Inflation_Historical | B | Years in col A (1970→). `12-Month Inflation Rate`, `Annual Average Inflation Rate`. |
| 18 | Inflation_Contribution | A | Years 2014→ across row 3. Contribution components as rows. |
| 19 | Global Inflation | A | Years 2020→ across row 4. Countries/regions as rows. IMF WEO source. |
| 20 | Private Sector Credit | B | Years in col A (1990→). Business / Mining / Manufacturing / Services / Households / Mortgages / Credit Cards. |
| 21 | Private Sector Credit 2 | E | 130×56 with multi-block structure, 65 blank rows. Years 1999→ in row 4. Bespoke adapter. |
| 22 | Mortgages_CB | E | Composite two-row header: row 3 bank (BOB/BNS/CBI/DBL/…), row 4 `No. of Loans / Value of Loans`. Col A year, col B period (`End-Jun` / `End-Dec`). Bespoke. |
| 23 | NPL | A-date | Excel date serials across header row 4 (`41791`=~2014-07-01 through ~2025). Date-header variant of A. |
| 24 | Central Gov Ops | A | Years 1977→ across row 3. Revenue/expenditure lines as rows. |
| 25 | Revenue & Expenditure | E | 119 cols. Row 4 `ACTUAL` scenarios, row 5 years 1964→. Scenario + multi-block. Bespoke. |
| 26 | Sector Share | A | Years 2015→ across row 4. Expenditure share rows. Scenario flag present. |
| 27 | Sector Expenditure | A | Years 2014→ across row 4. |
| 28 | Capital Expenditure_Sector | E | 70 cols. "Medium Term Expenditure — Central Government", multi-block by sector. Bespoke. |
| 29 | Wage Bill | A | Years 2014→ across row 4. Small (18 rows). |
| 30 | GOG Investment | D | Row 4 scenarios `Actual|Actual|Revised|Budget`, row 5 years `2019|2023|2024|2025`. Sectors as rows. |
| 31 | GOG Measures | E | Row 4 YTD-period headers `2021 Dec YTD | 2022 Dec YTD | …`. Multi-block across measures. Bespoke. |
| 32 | Measures_GOAL_old | SKIP | Superseded by `Measures_GOAL`. Log one INFO issue noting skip; do not ingest. |
| 33 | Debt | A | Years 1972→ across row 3. Public debt rows (External US$M, Domestic G$M, etc). |
| 34 | Debt Service to Revenue | B | Years in col A (1991→). Service ratios as columns. |
| 35 | Debt-to-GDP | A-wide | 369 cols. Years 1992→ across row 3. Countries/regions as rows ("Guyana vs Western Hemisphere"). Verify no regional-group subheaders — if present, treat as E. |
| 36 | External Financing | A | Years 2014→ across row 3. Bilateral/multilateral rows. Scenario flag present. |
| 37 | Exchange Rate | B | Years in col A (1960→). Two columns `End of Period`, `Period Average`. |
| 38 | Debt by Type | A | Years 2015→ across row 3. Debt type rows. Scenario flag present. |
| 39 | Minimum Wage | B | Years in col A (1980→). G$ and US$ columns. |
| 40 | Public Service | G | Training statistics with multiple tables and gender breakouts. Idiosyncratic. Needs closer look before adapter — **flagged**. |
| 41 | Employment | C | Col A monthly labels (`August 2020` etc). Sector columns. Monthly time series by sector. |
| 42 | OAP and Pub Assistance | B | Years in col A (2014→). OAP Rate, Public Assistance, Beneficiaries columns. |
| 43 | Measures_MIR | F | `comparison_tables`. Years in col A, Beneficiaries + MIR Refunds cols. |
| 44 | Measures_GOAL | F | `comparison_tables`. Regions as rows × years + `Total to Date`. |
| 45 | Measures_BWC | F | `comparison_tables`. Years in col A × BWC/Uniform/Transport/Total/Beneficiaries. |
| 46 | Measures_Cost of Living | F | `comparison_tables`. **Two side-by-side year blocks (2022, 2023)** — adapter must handle. |
| 47 | Measures_APNU Losses | F | `comparison_tables`. Years across row 4 + `Total` column. |
| 48 | Measures_Low Income Ceiling | F | `comparison_tables`, **text values** (`"Increased from $8 million to $10 million"`). Use `value_text`. |
| 49 | Measures_Medical Insurance | F | `comparison_tables`, text values (`"$30,000/monthly"`). Use `value_text`. |
| 50 | Measures_Tax Threshold | F | `comparison_tables`. Years across row 3 + `Budget 2026` (scenario column). |
| 51 | Vehicle Registration | A | Years 2012→ across row 5. Vehicle types as rows. |
| 52 | Vehicle Imports | E | Grouped 2-row header: `QUANTITY | CIF | Import Duty | Excise Tax` × `2024 | 2025` sub-cols. |
| 53 | Housing | E | Allocations summary, multiple tables. Bespoke. |
| 54 | Water | B | Years in col A (2011→). Hinterland / Coastal / Meters / NRW / Treated Water Coverage columns. |
| 55 | Health_Physicians | B | Years in col A (1985→). `Physicians per 10,000` column. |
| 56 | 2023 Price Indices | C | Monthly Excel serials in col A (`43831`=Jan 2020). IMF Food Index, Guyana Food Index, Crude Oil, Wheat. |
| 57 | CPI_Key Food_Breakouts | A-date | 125 cols. Date serials in header row 3 from col D onward (`43101`=2018-01). Items in col A. |
| 58 | Prices_Summary | E | Multi-block by commodity category. Bespoke. |
| 59 | Price of Pumpkin | C | Col A Excel serial dates, cols B–F markets (Stabroek/Parika/Bourda/VreedEnHoop). Monthly by market. |
| 60 | NIS Contributors | C | Col A monthly Excel serials (`44044`=Aug 2020). Employed/Self-Employed/Voluntary columns. |
| 61 | APNU_Fuel Prices | F | Spec assigns F (`comparison_tables`). Shape is actually monthly time series (dates in col A, Brent & Excise Tax in cols). Keeping it in F per spec; **flagged** to re-confirm at review — could arguably be both (C time series for Brent/Excise + F comparison headline). |

## Counts

| Archetype | Count | Sheets |
|-----------|-------|--------|
| SPECIAL | 1 | List of Sheets |
| A (years-as-cols) | 16 | Global Growth, GDP Growth by Sector, Nominal GDP by Sector, Oil Trajectory, FDI 2, Inflation_Contribution, Global Inflation, Central Gov Ops, Sector Share, Sector Expenditure, Wage Bill, Debt, External Financing, Debt by Type, Vehicle Registration, Debt-to-GDP |
| A-date (date serials as col headers) | 2 | NPL, CPI_Key Food_Breakouts |
| B (years-as-rows) | 11 | GDP, Production, Exports, Inflation_Historical, Private Sector Credit, Debt Service to Revenue, Exchange Rate, Minimum Wage, OAP and Pub Assistance, Water, Health_Physicians |
| C (dates-as-rows, sub-annual) | 5 | Merchandise Trade, Employment, 2023 Price Indices, Price of Pumpkin, NIS Contributors |
| D (scenario-header) | 2 | NRF, GOG Investment |
| E (multi-block hybrid) | 11 | BOP, Current Transfers, FDI, Private Sector Credit 2, Mortgages_CB, Revenue & Expenditure, Capital Expenditure_Sector, GOG Measures, Vehicle Imports, Housing, Prices_Summary |
| F (`comparison_tables`, per spec) | 9 | Measures_MIR, Measures_GOAL, Measures_BWC, Measures_Cost of Living, Measures_APNU Losses, Measures_Low Income Ceiling, Measures_Medical Insurance, Measures_Tax Threshold, APNU_Fuel Prices |
| G (oddball singleton) | 3 | Discoveries, Oil Reserves Rank, Public Service |
| SKIP | 1 | Measures_GOAL_old |
| **Total** | **61** | |

## Divergences from spec-projected counts

The ingestion spec projected ~25 in A, ~15 in B, ~3 in C, ~6–8 in E, ~9 in F, ~5 in G. My counts:

- **A: 16+2 = 18** (vs ~25). Some sheets the spec grouped in A are actually B-shaped in the workbook (GDP, Exports, Exchange Rate, Minimum Wage, etc). Adapter-as-config still works, just under B.
- **B: 11** (vs ~15). Same reason.
- **C: 5** (vs ~3). Monthly/date-serial sheets more common than projected.
- **E: 11** (vs 6–8). Workbook has more multi-block hybrids than projected — BOP, Current Transfers, FDI, GOG Measures, Vehicle Imports, Housing, Prices_Summary are all E-shaped in addition to the ones already flagged (PSC2, R&E, Debt-to-GDP variants, BOP). **Cost implication:** more bespoke adapter work than the spec estimated.
- **F: 9** ✓
- **G: 3** (vs ~5). Public Service, Discoveries, Oil Reserves Rank.
- **D: 2** (spec didn't give a count). NRF + GOG Investment.

## Flagged for review before adapter work starts

1. **Discoveries** — land as `comparison_tables` (snapshot list), or as a narrow indicator set? Default plan: `comparison_tables`.
2. **Oil Reserves Rank** — same question; default plan: `comparison_tables` snapshot.
3. **Public Service** — multi-table training statistics; I want to open it in a browser to finalize the adapter plan before committing to E or G. Treating as G (oddball) for now.
4. **APNU_Fuel Prices** — spec routes to F, but shape is a clean monthly time series with Brent and excise tax. Confirm F is the intended destination or whether it should be ingested as both (observations + a comparison headline).
5. **Debt-to-GDP (369 cols)** — confirm no regional-group subheader rows are hidden. If they exist, move to E.
6. **Measures_Cost of Living** — two side-by-side 2022/2023 comparison blocks in the same sheet; the F adapter needs a "multi-block comparison" mode. Mention so it isn't a surprise at adapter time.

## Adapter work order (proposed)

1. **Primitives + quarantine + snapshot pipeline** (no sheets yet).
2. **Parse `List of Sheets`** for caveat text; stash into an in-memory map keyed by sheet.
3. **A and A-date via config** (18 sheets) — biggest win per line of adapter code.
4. **B via config** (11 sheets).
5. **C via config** (5 sheets) — with the Excel-serial date primitive.
6. **D adapters** (2 sheets) — NRF has the most complex scenario+multi-block structure; GOG Investment is simpler.
7. **E bespoke adapters** (11 sheets) — largest cost. Prioritize by dashboard prominence: Revenue & Expenditure, BOP, Private Sector Credit 2, Capital Expenditure_Sector, Mortgages_CB first; then the rest.
8. **F adapters** (9 sheets) — one per sheet, each to `comparison_tables` + `comparison_table_rows`.
9. **G** (3 sheets) — after review of flagged items.

Raw snapshot pass (`raw_sheet_snapshots`) happens on every run regardless of parse success.
