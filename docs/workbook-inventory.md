# Workbook inventory

Source: `/Users/alfonsodearmas/EPAU Sabina/Guyana Key Statistics_06022026 for Donald.xlsx`
Sheets: **61** (confirmed)
Probed: 2026-04-18

Dimensions are the bounding range reported by the file (includes empty cells), not dense row counts. Use this as the seed for `docs/archetypes.md`.

| #  | Sheet                          | Rows × Cols  |
|----|--------------------------------|--------------|
|  1 | List of Sheets                 | 83 × 16383   |
|  2 | GDP                            | 203 × 26     |
|  3 | Global Growth                  | 29 × 56      |
|  4 | GDP Growth by Sector           | 52 × 38      |
|  5 | Nominal GDP by Sector          | 52 × 18      |
|  6 | Production                     | 73 × 22      |
|  7 | Oil Trajectory                 | 78 × 30      |
|  8 | Discoveries                    | 65 × 23      |
|  9 | Oil Reserves Rank              | 76 × 22      |
| 10 | NRF                            | 145 × 35     |
| 11 | Exports                        | 195 × 35     |
| 12 | Merchandise Trade              | 280 × 39     |
| 13 | BOP                            | 391 × 13     |
| 14 | Current Transfers              | 143 × 74     |
| 15 | FDI                            | 133 × 31     |
| 16 | FDI 2                          | 47 × 22      |
| 17 | Inflation_Historical           | 72 × 15      |
| 18 | Inflation_Contribution         | 95 × 27      |
| 19 | Global Inflation               | 27 × 26      |
| 20 | Private Sector Credit          | 58 × 14      |
| 21 | Private Sector Credit 2        | 130 × 56     |
| 22 | Mortgages_CB                   | 30 × 29      |
| 23 | NPL                            | 38 × 40      |
| 24 | Central Gov Ops                | 95 × 64      |
| 25 | Revenue & Expenditure          | 113 × 119    |
| 26 | Sector Share                   | 198 × 15     |
| 27 | Sector Expenditure             | 42 × 17      |
| 28 | Capital Expenditure_Sector     | 143 × 70     |
| 29 | Wage Bill                      | 18 × 19      |
| 30 | GOG Investment                 | 120 × 29     |
| 31 | GOG Measures                   | 112 × 21     |
| 32 | Measures_GOAL_old              | 16 × 4       |
| 33 | Debt                           | 117 × 59     |
| 34 | Debt Service to Revenue        | 44 × 15      |
| 35 | Debt-to-GDP                    | 314 × 369    |
| 36 | External Financing             | 32 × 16      |
| 37 | Exchange Rate                  | 79 × 59      |
| 38 | Debt by Type                   | 157 × 15     |
| 39 | Minimum Wage                   | 64 × 8       |
| 40 | Public Service                 | 109 × 13     |
| 41 | Employment                     | 20 × 17      |
| 42 | OAP and Pub Assistance         | 64 × 28      |
| 43 | Measures_MIR                   | 39 × 21      |
| 44 | Measures_GOAL                  | 97 × 25      |
| 45 | Measures_BWC                   | 99 × 32      |
| 46 | Measures_Cost of Living        | 35 × 21      |
| 47 | Measures_APNU Losses           | 32 × 25      |
| 48 | Measures_Low Income Ceiling    | 11 × 25      |
| 49 | Measures_Medical Insurance     | 8 × 25       |
| 50 | Measures_Tax Threshold         | 8 × 27       |
| 51 | Vehicle Registration           | 62 × 26      |
| 52 | Vehicle Imports                | 25 × 15      |
| 53 | Housing                        | 183 × 26     |
| 54 | Water                          | 21 × 7       |
| 55 | Health_Physicians              | 44 × 13      |
| 56 | 2023 Price Indices             | 53 × 24      |
| 57 | CPI_Key Food_Breakouts         | 161 × 125    |
| 58 | Prices_Summary                 | 85 × 66      |
| 59 | Price of Pumpkin               | 31 × 8       |
| 60 | NIS Contributors               | 90 × 5       |
| 61 | APNU_Fuel Prices               | 61 × 11      |

## Notes
- Sheet 1 "List of Sheets" is MoF's own index and holds the caveats text we must preserve verbatim on matching indicators. Parse this first in every ingest run.
- Sheets with very wide column counts (Debt-to-GDP 369c, Revenue & Expenditure 119c, CPI_Key Food_Breakouts 125c, Current Transfers 74c, Capital Expenditure_Sector 70c, Prices_Summary 66c, Central Gov Ops 64c) are Archetype E candidates — multi-block hybrid with likely sub-tables.
- Ingested adapters listed in the spec map cleanly onto the above; no missing or extra sheets.
- `Measures_GOAL_old` is present alongside `Measures_GOAL` — treat `_old` as superseded, ingest current only (flag in archetypes doc).
