# Sabina's Indicator Review Checklist

**Date**: 2026-04-19
**Purpose**: Spot-check 33 known-value indicators across every archetype to confirm the ingested catalog matches what Sabina expects from the source `.xlsx` + her domain knowledge.

## How to use this

1. Open the workbench. Log in as yourself (`alfonso.dearmas@mpua.gov.gy` and `sabina@…` are both on the allowlist).
2. For each row, paste the suggested query into the workbench. You should see the ingested value in the row labelled "Ingested value" in the chart or data table.
3. Tick the box on the right if it matches. If the number is different, **file a bug via the "Flag issue" button on the chart** — no email or Slack needed. The bug shows up at `/admin/bug-reports`.
4. Any indicator that fails: leave the bug report open. I'll triage.

Values below are from the **dry-run JSON mirror of the live DB** after the most recent push. Tolerances are intentionally generous (last digit or two) because Excel often rounds the displayed figure differently from the stored one.

---

## Section A — Natural Resource Fund (5)

| # | Query to type | Ingested value | Unit | ✅ |
|--:|---------------|--:|------|:--:|
| 1 | NRF petroleum revenue deposits 2020 | **198,302.30** | US$ thousands | ☐ |
| 2 | NRF petroleum revenue deposits 2023 | **1,617,000.35** | US$ thousands | ☐ |
| 3 | NRF royalties 2023 | **218,090.97** | US$ thousands | ☐ |
| 4 | NRF withdrawal amount 2022 | **607,646.57** | US$ thousands | ☐ |
| 5 | NRF closing balance 2024 | **3,099,803.15** | US$ thousands | ☐ |

## Section B — Private Sector Credit (4)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 6 | Total private sector credit 1990 | **4,159.60** | G$ millions | ☐ |
| 7 | Total private sector credit 2023 | **376,119.40** | G$ millions | ☐ |
| 8 | Credit to agriculture 2022 | **19,081.48** | G$ millions | ☐ |
| 9 | Credit to households 2023 | **38,422.75** | G$ millions | ☐ |

## Section C — Central Government Operations (4)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 10 | Central gov total revenue 2022 | **429,478.83** | G$ millions | ☐ |
| 11 | Central gov tax revenue 2023 | **366,615.01** | G$ millions | ☐ |
| 12 | Total expenditure 2023 | **804,148.85** | G$ millions | ☐ |
| 13 | Overall balance after grants 2023 | **−202,942.53** | G$ millions | ☐ |

## Section D — GDP levels (2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 14 | Nominal GDP 2023 overall | **3,527,508.01** | G$ millions | ☐ |
| 15 | Nominal non-oil GDP 2023 | **1,524,596.55** | G$ millions | ☐ |

## Section E — GDP growth by sector (4, percent sanity)

These are the indicators that most recently had a units bug (decimals rendering as 0.4 instead of 43%). Confirm they display correctly in the workbench.

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 16 | Overall GDP growth 2020 | **43.5 %** | percent | ☐ |
| 17 | Overall GDP growth 2022 | **63.3 %** | percent | ☐ |
| 18 | Sugar sector growth 2020 | **−3.7 %** | percent | ☐ |
| 19 | Gold sector growth 2023 | **−11.2 %** | percent | ☐ |

## Section F — Debt (3)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 20 | External public debt 2020 | **1,320.79** | US$ millions | ☐ |
| 21 | Total public debt 2023 | **4,508.79** | US$ millions | ☐ |
| 22 | Total public debt as % of GDP 2024 | **24.3 %** | percent | ☐ |

**Note on #22**: The `Debt` sheet reports this as 24.3% (oil-GDP denominator). The `Debt-to-GDP` sheet reports 61.2% (non-oil-GDP denominator) for the same year. Both are technically correct; see `sabina_findings.md` §2.3. If the workbench returns 61.2%, the LLM picked the non-oil series — flag it and I'll name-disambiguate.

## Section G — Cross-country Debt-to-GDP (2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 23 | Guyana debt to GDP 2022 | **24.8 %** | percent | ☐ |
| 24 | Trinidad and Tobago debt to GDP 2020 | **60.6 %** | percent | ☐ |

## Section H — Inflation (2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 25 | 12-month inflation rate 2022 | **7.2 %** | percent | ☐ |
| 26 | Annual average inflation rate 2023 | **2.9 %** | percent | ☐ |

## Section I — Financial sector (1)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 27 | NPL ratio Q4 2023 | **2.7 %** | percent | ☐ |

## Section J — Balance of Payments (2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 28 | BOP current account Q4 2022 | **3,805.89** | US$ millions | ☐ |
| 29 | BOP overall balance Q4 2023 | **−36.00** | US$ millions | ☐ |

## Section K — Revenue & Expenditure (historical long series, 2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 30 | Rev & Exp total revenue 2022 | **483,506.58** | G$ millions | ☐ |
| 31 | Overall surplus/deficit 2020 | **−86,045.72** | G$ millions | ☐ |

**Note on #30 vs #10**: Central Gov Ops total revenue 2022 = 429,478.83; Revenue & Expenditure total revenue 2022 = 483,506.58. Different sheets, slightly different definitions (R&E is the historical public-sector statistic; CGO is the operational ledger). Both should be retrievable; the LLM picks by query context.

## Section L — Merchandise Trade (2)

| # | Query | Ingested value | Unit | ✅ |
|--:|-------|--:|------|:--:|
| 32 | Total exports December 2023 | **1,537.36** | US$ millions | ☐ |
| 33 | Total imports December 2023 | **−553.50** | US$ millions | ☐ |

**Note on #33**: Imports are stored as negative so `balance = exports + imports` works naturally. The workbench will likely display them as `−553.50` or flip the sign in a dual-axis chart; both are correct.

---

## Coverage matrix

| Archetype | Checks | Sheets covered |
|---|--:|---|
| A (years across, indicators down) | 11 | Global Growth, GDP Growth by Sector, Central Gov Ops, Debt, Debt-to-GDP, Inflation_Historical, NPL |
| B (years down, indicators across) | 5 | GDP, Private Sector Credit, Revenue & Expenditure |
| C (dated rows, sub-annual) | 4 | NPL (quarterly), Merchandise Trade (monthly), BOP (quarterly) |
| D (scenario headers) | 5 | NRF |
| E (bespoke multi-block) | 8 | CGO, Revenue & Expenditure |

Every source archetype has ≥1 check. Every key-critical tab (the 10 Sabina flagged in the reconciliation minimum-counts) has ≥1 check.

## What to do when you finish

- **All green**: send me a one-line "all green" — I'll clear the open findings in `sabina_findings.md` and we move to deployment prep.
- **One or two reds**: file the bug via the chart's "Flag issue" button. Each report lands at `/admin/bug-reports` with the indicator ID, date range, and your note — nothing else to do on your end.
- **More than two reds**: ping me directly — broader than expected, I'll stop and investigate before we touch deployment.
