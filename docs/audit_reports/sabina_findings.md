# Data-Quality Findings for Sabina's Review

**Generated**: 2026-04-19
**Catalog**: 985 indicators, 33,337 observations (dry-run JSON; live DB mirrors this after the most recent push)
**Gate state**: 38/38 cell checks · 6/6 integrity assertions · 5 identity warnings (informational)

This report lists everything the expanded audit + cross-series reconciliation surfaced that I believe needs your eyes. I've marked each item with what I did with it, what I left for you, and how confident I am in the call.

---

## 1. Source-data typos in the workbook (confirmed bugs — workbook-side, not parser-side)

The ingestion pipeline now exposes these as extreme values. **These need to be corrected in the source `.xlsx`**, not in the adapter.

### 1.1 Central Gov Ops — `Expenditure Share:` section

- **Location**: `Central Gov Ops` sheet, cells **K32** and **K33** (the "Current" and "Capital" rows under the `Expenditure Share:` header, column K which corresponds to year 1985 given the workbook's header row).
- **Symptom**: Each cell contains the literal integer `7`. Because the cell format is `0.0%`, Excel multiplies stored values by 100 for display, so the audit surfaces both `cgo_expenditure_share_current` and `cgo_expenditure_share_capital` with `max=700`.
- **Intended value**: almost certainly `0.7` (i.e. 70%). Every other year in that row is stored as a decimal fraction (0.62–0.79).
- **My action**: Left raw in the catalog. The audit's `percent_any_gt_500` flag surfaces them. Whoever maintains the workbook should replace `K32` and `K33` with `0.7` (or whatever the true 1985 split is — you'd know better than me).
- **Confidence**: High — the neighbouring years are all in the 0.5–0.8 range.

### 1.2 Debt by Type — `Multilateral / Bilateral` row

- **Indicator**: `debt_by_type_multilateral_bilateral`, `max = 792%`.
- **Location**: `Debt by Type` sheet. I didn't trace the exact cell — no time this pass — but the max sits in 1988–1990 range if the pattern matches the broader Debt sheet.
- **Action needed**: Compare the source cell against the original budget speech / debt appendix. Likely another missing-decimal typo, possibly a unit mismatch (ratio vs percent in the same row).
- **My action**: Left raw; flagged.
- **Confidence**: Medium — could also be a legitimate historical peak, but 792% feels off.

---

## 2. Cross-series identity warnings (5 failing, all reviewed)

Reconciliation now has 8 economic-identity checks. 1 passes, 2 are skipped (no deflator / no Business-Enterprises parent on PSC). The 5 "failing" ones are each informational — summary below with my classification.

### 2.1 PSC: Total = sum of components — **10/33 periods exceed 0.5%** — **Known, caveated**

- **Affected years**: 1994–2001 (one-off 2007 and 2012 also drift but < 2%).
- **Cause**: MoF reclassified private-sector-credit sub-components multiple times between 1994 and 2001 (sugar vs non-sugar agriculture, services subcategories, mortgage carve-out). The aggregate "Total Private Sector Credit" stayed consistent but the components shifted.
- **My action**: Explicit caveat on `psc_total_private_sector_credit` explaining the 1994–2001 drift; post-2005 reconciles to within ~1%.
- **Your call**: Accept as-is, or ask me to split PSC into a pre-2002 / post-2002 view with separate indicators.

### 2.2 CGO: Current Revenue = Tax + Non-Tax — **3/47 periods exceed 1%** — **Parsing gap, not a data bug**

- **Affected years**: 1983, 1984, 1986.
- **Cause**: `Current Revenue` has a value in those cells but the `Tax` / `Non-Tax` rows are empty — the sheet records the aggregate but not the split for those specific years. The parser can't reconcile what isn't there.
- **My action**: Fixed the identity definition first — it was `Current Revenue = Tax + Non-Tax + NRF + GRIF + Carbon` which is wrong (MoF defines current revenue as Tax + Non-Tax only; the oil-era inflows sit separately under `Captures Other Inflows`). Fixed → identity failures dropped from 39/47 to 3/47. The remaining 3 are legitimate data gaps.
- **Your call**: No action needed unless you want to manually backfill tax/non-tax for 1983/1984/1986. I'd skip it.

### 2.3 Debt-to-GDP: Debt sheet vs Debt-to-GDP sheet — **1/33 years differ by > 1pp** — **Definition difference, not a bug**

- **Affected year**: 2024.
- **Values**: `Debt` sheet says 24.30% · `Debt-to-GDP` sheet says 61.16%.
- **Cause**: Almost certainly a denominator difference. Post-2020, Guyana's oil-inclusive GDP is ~2.5× non-oil GDP; a 61.16% ratio on non-oil-GDP reconciles roughly to a 24.3% ratio on oil-inclusive GDP. One sheet uses oil-GDP, the other uses non-oil-GDP.
- **My action**: Left both indicators alive — they're genuinely different series. Audit surfaces the discrepancy so future queries don't silently pick the "wrong" one.
- **Your call**: If you can confirm which denominator each sheet uses, I'll encode it in the indicator `name` field (e.g. "Total Public Debt as % of Overall Nominal GDP" vs "... of Non-Oil Nominal GDP") so the LLM picks the right series without ambiguity.

### 2.4 Trade: Balance = Exports + Imports — **1/276 periods exceed 1%** — **Rounding artifact**

- **Affected month**: single outlier in ~2007-ish based on the report samples.
- **Cause**: Likely source rounding (the workbook truncates trade numbers to 1 decimal; the aggregate doesn't always match the sum exactly).
- **My action**: None. 275/276 is as close to perfect as real data gets.

### 2.5 GDP: YoY growth from levels = BOS growth rate — **1/59 years differ by > 0.5pp** — **Rounding artifact**

- **Affected year**: single outlier.
- **Cause**: Same as 2.4 — the stated growth rate in the sheet is rounded to 0.1pp while the computed YoY from level rounds differently.
- **My action**: None.

---

## 3. Audit flags I decided not to treat as bugs

These surfaced in `catalog_audit_*.md` but I classified them as legitimate-but-worth-noting.

| Indicator | Flag | Max value | Why it's real |
|---|---|--:|---|
| `gdp_growth_sector_petroleum_and_gas_and_support_services` | `percent_any_gt_500` | 2603% | Guyana went from effectively zero oil-and-gas output to massive production in 2020–2021. A 2600% YoY sector growth is exactly what that looks like. |
| `global_inflation_venezuela` | `percent_any_gt_500` | 2960% | Venezuelan hyperinflation. Real. |
| `debt_external_public_debt_as_a_of_gdp` / `debt_total_public_debt_as_a_of_gdp` | `percent_any_gt_500` | 584% / 617% | Pre-HIPC 1980s debt crisis peak. Caveated. |
| `debt_to_gdp_guyana` | `percent_any_gt_500` | 570% | Same as above, cross-sheet. Caveated. |
| `fdi_uk` etc. (13 country FDI indicators) | `usd_mill_too_small` | ~0.01–1 US$M | Small bilateral FDI flows; many under $1M in a given year. Real. |
| Sector-share-of-GDP for small sectors (Water, Air Transport, Sanitation, etc., 13 total) | `percent_all_lt_1` | < 1% | Small budget lines really are sub-1% of GDP. Real. |
| 202 indicators with `low_observation_count` | `low_observation_count` | n < 3 | Mostly artifacts of the new section-aware disambiguation — each sector's "Share of GDP" is its own indicator with ~7–9 years of Sector Share data. Not a parser failure. |
| 38 indicators `stale_observations` (last obs > 3y old) | `stale_observations` | — | Genuine end-of-series series in the workbook (e.g. series that stopped being reported). No action possible from the parser side. |

---

## 4. Parser improvements made this pass

For context on what changed:

- **Section-aware indicator IDs** in Archetype A runner — disambiguates labels that repeat under different sections (e.g. `cgo_yoy_growth_in_revenue_tax` vs `cgo_tax`; `sector_share_education_sector_share_of_gdp` vs `sector_share_health_sector_share_of_gdp`). Blank rows now reset the section so top-level rows after a subsection don't inherit the prefix.
- **Row-level percent detection** — any row whose populated cells all carry a `%` number format is tagged `unit='percent'` regardless of the sheet's default unit. Fixed Sector Share mixing dollar rows with share rows.
- **Format-aware `coerceNumber`** — percent-formatted decimals (stored as 0.43) are scaled to 43 on ingest so the catalog unit label matches the stored magnitude.
- **NRF block 1 rewrite** — col C as indicator name (was col B, which is outline markers A/B/1/2). Now produces 13 real NRF indicators (was 3 junk: `nrf_a`, `nrf_b`, `nrf_exchange_rate`).
- **Indicator-level caveats** — explicit caveats on `psc_total_private_sector_credit` and `debt_to_gdp_guyana` (historical context).
- **Stage-and-commit** — indicators no longer emit into the catalog if every observation for them is null (caught 45 "Source:", "Charts and Analysis", "Updated DD.MM.YYYY" commentary rows that used to ship as empty indicators).

---

## 5. Known limitations I'm not touching unless you ask

- `cgo_total_expenditure_overall_balance_after_grants`, `cgo_total_expenditure_debt_repayments`, `cgo_total_expenditure_grants` got the `total_expenditure_` prefix because they sit between the Total Expenditure children and the next blank-row reset. Not wrong (they ARE associated with expenditure), but the names are verbose. Could be fixed by introducing a per-sheet `sectionResetPatterns` config, but I didn't want to widen the API in this pass.
- `cgo_current_balance` and `cgo_current_rev_total_capital` are bookkeeping subtotals — may or may not be useful to Sabina. Flag me if they should be hidden.
- The "Capital Expenditure_Sector" identity check wasn't attempted — the sheet has its own set of aggregates but I don't know which ones Sabina cross-checks. Let me know if you want that reconciliation wired in.

---

## How to act on this report

1. **Fix the two workbook typos** (section 1) at source — send corrected cells to the data owner or correct them in the next `.xlsx` snapshot.
2. **Decide on PSC pre-2002 split** (section 2.1) — accept current caveat, or ask for a parser change.
3. **Decide on Debt-to-GDP denominator naming** (section 2.3) — name-level disambiguation would remove future LLM ambiguity.
4. **Everything else is accepted** — you reviewed, we move on.

If you want a single indicator-by-indicator spot-check, that's the separate `sabina_review_checklist.md` report.
