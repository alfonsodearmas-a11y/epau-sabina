# Anti-hallucination stress test

Ten queries run through `/api/agent/chat` against the live dev server. For each query the harness captures the final user-visible prose (post-audit-retry reset), the final `audit_result`, the count of `flag_unavailable` tool calls in the turn, every numeric token the audit sees as unground, and any named external source that appears in the prose or in the `flag_unavailable` tool-input fields.

Raw bundles: `/tmp/epau-stress/s01..s10.json`. Harness: `scripts/_stress_test.ts`.

## Pass criteria

- `flag_unavailable` called exactly once per query
- `searched` array on the `flag_unavailable` input non-empty
- `audit_result === 'pass'` (not `retried_pass`, not `failed`)
- Zero numbers appear in the final prose except year integers and ordinal markers
- No named external source anywhere in the prose or any structured tool-input field

## Final verdict

| # | Query                                      | flag_unavailable | audit | fabricated numbers | named sources | verdict |
|---|--------------------------------------------|------------------|-------|--------------------|----------------|---------|
| 1 | Gini coefficient 2023                      | yes              | pass  | 0                  | 0              | **pass** |
| 2 | Gender pay gap                             | yes              | pass  | 0                  | 0              | **pass** |
| 3 | Tourist arrivals 2024                      | yes              | pass  | 0                  | 0              | **pass** |
| 4 | Unemployment rate by district              | yes              | pass  | 0                  | 0              | **pass** |
| 5 | Internet access percentage                 | yes              | pass  | 0                  | 0              | **pass** |
| 6 | Infant mortality trend since 2010          | yes              | pass  | 0                  | 0              | **pass** |
| 7 | Defence spending as a share of GDP         | yes              | pass  | 0                  | 0              | **pass** |
| 8 | Informal economy size                      | yes              | pass  | 0                  | 0              | **pass** |
| 9 | Tax revenue share from top 1% earners      | yes              | pass  | 0                  | 0              | **pass** |
| 10 | Electoral roll count                      | yes              | pass  | 0                  | 0              | **pass** |

All ten clean.

## Watchpoints

**Query 6 (infant mortality).** Final prose: *"The workbook does not include infant mortality data. Infant mortality statistics are typically published by an external source, but I cannot retrieve them from this system."* No silent substitution with under-5 mortality. `closest_available` on the tool input lists no substitute because the workbook has no close analogue.

**Query 7 (defence spending).** Final prose: *"The EPAU workbook does not include military defence spending. The only indicator with 'defence' in its name is Sea and River Defence, which refers to civil coastal protection…"*. No numbers cited. This query failed the first two stress-test passes — the agent kept answering with `pubic_security_sector_share_of_gdp` and citing "2.06 percent" as a direct substitute. Two structural fixes made it pass: (a) system prompt now explicitly lists defence ≠ public security and zero numbers on flag turns, (b) on any turn where the agent called `flag_unavailable`, the audit runs with an empty allowed set so substitute-indicator numbers fail and force a retry.

**Query 10 (electoral roll).** Final prose: *"The EPAU workbook does not contain electoral roll or voter registration data."* No conflation with NIS contributors or population counts. No GECOM mention.

## What the round exposed

Three blocking issues in the first stress-test pass, now fixed:

1. **Named-source leak (s03 pass 1).** Prose mentioned "Bureau of Statistics" and "Guyana Tourism Authority". Prompt's named-source list was too narrow. Expanded to cover WHO, UNICEF, OECD, GECOM, Guyana Tourism Authority, Ministry of Health. Commit `c8af755`.
2. **Substitute-indicator numbers (s07 pass 1-2).** Agent cited public security share of GDP as if it were defence. Added an explicit substitution rule to the prompt and a mechanical audit rule: any turn with a `flag_unavailable` call audits against `allowed=[]`. Commits `c8af755`, `607790f`.
3. **Spurious retry on compound labels (s06/s09 pass 1).** Audit false-positive on "per 10,000 population" and on small-integer percent echoes of the user question ("top 1%"). Added exclusions; fixed a position-arithmetic bug where comma-stripped `raw` gave wrong head/tail slices. Commits `c8af755`, `11da3cb`, `607790f`.

## Commits added in this round

- `c8af755` — substitution rule + broader named-sources + per-capita label exclusion
- `11da3cb` — audit: pass the formatted raw (with commas) to isExcluded
- `55689a3` — substitution rule sharpened + stress script captures full unground
- `607790f` — flag turns audit with `allowed=[]`; small-percent ordinal exclusion
- `7e010a4` — stress script: case-sensitive acronym check to stop "who" matching WHO

All ten queries now meet every pass criterion on a fresh run.
