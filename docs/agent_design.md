# EPAU Agent — design document

Design-on-paper for the agentic Claude layer that replaces the current `interpret` / `narrate` split with a single conversational agent. The agent answers arbitrary analytical questions against the workbook store, chooses its own output shape (chart, table, prose, multi-part report), and lives in a persistent chat panel on every surface.

Status: design only. No code, no scaffolding. For review and redlining before implementation begins.

Primary user: Sabina, head of EPAU at Guyana's Ministry of Finance. Numbers produced here may be cited in Cabinet briefings. A hallucinated figure is a career-grade failure. Design bias throughout: correctness over speed, refusal over confabulation.

---

## 1. Goals and non-goals

**Must do (v1)**

- Answer arbitrary questions about the indicators, observations, and comparison tables already in Postgres, producing whatever output the question warrants (a chart, a table, a paragraph, or any combination).
- Ground every numeric claim in an actual tool call made in the current turn. No number may appear in output that was not retrieved or derived inside this turn from retrieved values.
- Refuse gracefully when the requested data is not in the store, naming what is missing and offering the closest available alternatives rather than guessing.

**Explicitly not (v1)**

- No retrieval from sources outside the workbook store. No web search, no PDF parsing, no Bank of Guyana pulls at runtime. If it is not in `indicators` / `observations` / `comparison_tables`, we flag unavailable.
- No write-back. The agent reads and renders; it does not edit data, save views without an explicit user click elsewhere, or schedule anything.
- No multi-turn memory beyond the current chat session. Each session is its own context; no cross-session personalization or learned preferences in v1.

---

## 2. Architectural overview

```
┌──────────────┐    POST /api/agent/chat      ┌───────────────────────┐
│ Chat panel UI├──────── (SSE stream) ───────▶│ Agent route handler   │
│ (every page) │                              │                       │
└──────────────┘                              │  1. hydrate context:  │
        ▲                                     │     - user email      │
        │ streamed events                     │     - current surface │
        │ (text / tool_use /                  │     - catalog summary │
        │  tool_result / rendered)            │     - session history │
        │                                     │                       │
        │                                     │  2. fast-path classifier
        │                                     │     (separate Claude Haiku
        │                                     │      call, ~150 tokens)
        │                                     │          │
        │                                     │          ▼
        │                            ┌────────┴────────┐
        │                            │                 │
        │                    FAST PATH            SLOW PATH
        │                    (simple lookup)      (analytical / report)
        │                            │                 │
        │                            ▼                 ▼
        │                   ┌─────────────────┐ ┌──────────────────────┐
        │                   │ Single Claude   │ │ Agent loop with      │
        │                   │ Sonnet call with│ │ tool_use (Sonnet)    │
        │                   │ pre-loaded obs  │ │                      │
        │                   │ (no tool loop)  │ │  • search_indicators │
        │                   │                 │ │  • get_observations  │
        │                   │ Target <4s      │ │  • compute           │
        │                   │                 │ │  • render_*          │
        │                   │                 │ │  • list_saved_views  │
        │                   │                 │ │  • list_comparison_… │
        │                   │                 │ │  • flag_unavailable  │
        │                   └────────┬────────┘ │                      │
        │                            │          │ Target <30s          │
        │                            │          └──────────┬───────────┘
        │                            │                     │
        │                            └──────────┬──────────┘
        │                                       ▼
        │                            ┌────────────────────┐
        │                            │ agent_traces write │
        │                            │ (every role/event) │
        │                            └──────────┬─────────┘
        │                                       │
        └───────────────────────────────────────┘
                SSE: text deltas + tool events + render payloads
```

**Fast-path vs. slow-path split**

The fast path exists because a user who types "what was inflation in 2023" should not wait through a 6-step agent loop. The vast majority of Sabina's queries during a briefing session will be simple lookups: one indicator, one period, maybe a year-over-year comparison. The slow path exists because the defining feature of this system is arbitrary analytical reasoning — "draft a 200-word note on NRF performance," "find the three biggest shifts in credit composition" — and those queries genuinely need multiple tool calls, intermediate reasoning, and composition.

The classifier is a separate, small Claude call (Haiku) that reads the user's message, the current surface, and a catalog summary, and emits one token: `fast` or `slow`. A `fast` classification triggers a second-pass Claude Sonnet call where we pre-load the observations we think the user wants (based on keyword-matched indicator ids) and ask Claude to produce the answer directly. No tool loop; the observations are already in the prompt. This trades one extra small call for skipping the agent-loop overhead.

A `slow` classification enters the agent loop with the full tool set. The model plans, calls tools, reasons, calls more tools, and composes. The loop terminates when Claude emits a `stop_reason` of `end_turn` without a pending `tool_use`, or when a hard turn cap (12 tool-use rounds) is reached.

Classification criteria (the classifier's own prompt spells these out in §6):
- **Fast path candidates:** single indicator or small fixed set; explicit year or narrow range; no comparison verbs ("compare", "versus", "against"); no composition verbs ("draft", "summarise", "narrate", "write a note"); no structural verbs ("biggest", "largest", "most", "composition", "breakdown", "shifts"); short (≤ ~15 words). Target budget: 1 Claude Sonnet call, ≤ 4s p50.
- **Slow path:** anything that trips any of the above, plus anything ambiguous. Default on uncertainty is slow. Target budget: ≤ 6 tool calls, ≤ 30s p50.

The cost of being wrong is asymmetric. A fast query misclassified as slow is three seconds slower than it needed to be; a slow query misclassified as fast can produce a confidently wrong number because the agent could not look up what it actually needed. So the classifier leans slow.

---

## 3. Tool specifications

All tools are server-side. Claude invokes them via Anthropic's tool-use protocol; the route handler executes them against Postgres (via Prisma), returns the result, and loops. No tool ever returns fabricated data; on failure it returns a structured error the model is instructed to surface to the user or route to `flag_unavailable`.

Throughout: `IndicatorId` is the catalog id (e.g. `private_sector_credit_total`, `inflation_12month`). `Scenario` mirrors the Prisma enum: `actual | budget | revised | projection`. Dates are ISO `YYYY-MM-DD`.

### 3.1 `search_indicators`

**Purpose.** Resolve a free-text query to a small set of indicator ids the agent can then fetch.

**Signature.**
```ts
type SearchIndicatorsInput = {
  query: string;                       // free text, e.g. "private sector credit mortgages"
  category?: IndicatorCategory;        // optional filter
  limit?: number;                      // default 10, max 25
};

type SearchIndicatorsResult = {
  matches: Array<{
    id: IndicatorId;
    name: string;
    category: IndicatorCategory;
    subcategory: string | null;
    unit: string;
    frequency: 'annual' | 'quarterly' | 'monthly';
    source: string;
    caveat: string | null;
    earliestPeriod: string | null;     // ISO YYYY-MM-DD
    latestPeriod: string | null;
    score: number;                     // rank score, higher is better
  }>;
  truncated: boolean;                  // true if more matches existed
};
```

**Behavior.** Postgres full-text search against an indexed `tsvector` of `name + subcategory + source + caveat + id`, combined with trigram similarity on the id and name. Returns ranked matches with enough metadata for the agent to pick without a second call. Honours `category` filter when provided. If the query looks like a literal id the caller already has, returns that id as the top hit.

**Example.**
```jsonc
// input
{ "query": "private sector credit to mortgages", "limit": 5 }

// result (abbreviated)
{
  "matches": [
    {
      "id": "private_sector_credit_mortgages",
      "name": "Private Sector Credit — Mortgages",
      "category": "monetary",
      "subcategory": "credit by sector",
      "unit": "G$ millions",
      "frequency": "annual",
      "source": "Bank of Guyana",
      "caveat": null,
      "earliestPeriod": "1990-12-31",
      "latestPeriod": "2023-12-31",
      "score": 0.94
    },
    { "id": "mortgages_cb_value_total", "name": "Mortgages (CB) — Value of Loans, Total", ... }
  ],
  "truncated": false
}
```

**Failure modes.**
- No matches → returns `{ matches: [], truncated: false }`. The agent is told in the system prompt to respond by routing to `flag_unavailable` with the query echoed back, rather than guessing an id.
- Invalid `category` → tool returns `{ error: "unknown_category", allowed: [...] }`. Agent retries without the filter.
- DB error → tool returns `{ error: "search_failed", detail: "..." }`. Agent tells the user search is temporarily unavailable and offers no numbers.

### 3.2 `get_observations`

**Purpose.** Fetch actual observation values for one or more indicators over a date range, with the metadata needed to speak about them truthfully (unit, source, caveat, frequency, staleness).

**Signature.**
```ts
type GetObservationsInput = {
  indicator_ids: IndicatorId[];        // 1..20
  start_date?: string;                 // ISO YYYY-MM-DD; inclusive
  end_date?: string;                   // ISO YYYY-MM-DD; inclusive
  scenario?: Scenario;                 // default 'actual'
};

type GetObservationsResult = {
  series: Array<{
    indicator: {
      id: IndicatorId;
      name: string;
      unit: string;
      frequency: 'annual' | 'quarterly' | 'monthly';
      source: string;
      sourceTab: string;
      caveat: string | null;
      latestObservationDate: string | null;
      earliestObservationDate: string | null;
    };
    observations: Array<{
      periodDate: string;              // ISO YYYY-MM-DD
      periodLabel: string;             // human label from the workbook
      value: number | null;            // null means "cell was blank / quarantined"
      isEstimate: boolean;
      scenario: Scenario;
    }>;
    notes: string[];                   // e.g. "3 values in range were null", "stale: last updated 2024-03"
  }>;
  missing: Array<{ id: string; reason: 'unknown_id' | 'no_data_in_range' }>;
};
```

**Behavior.** Joins `indicators` and `observations`, clamps to the requested range, returns ordered ascending by `periodDate`. Nulls are preserved (they tell the agent the source cell was blank). Per-series `notes` surface staleness (latest observation more than 13 months ago for annual, 4 months for monthly), quarantined cells, and scenario mismatches. Unknown ids and ids with no data in range are returned in `missing`, not silently dropped, so the agent can reason about gaps.

**Example.**
```jsonc
// input
{ "indicator_ids": ["inflation_12month"], "start_date": "2023-01-01", "end_date": "2023-12-31" }

// result
{
  "series": [{
    "indicator": {
      "id": "inflation_12month",
      "name": "12-Month Inflation Rate",
      "unit": "percent",
      "frequency": "monthly",
      "source": "Bureau of Statistics",
      "sourceTab": "Inflation_Historical",
      "caveat": null,
      "latestObservationDate": "2023-12-31",
      "earliestObservationDate": "1970-12-31"
    },
    "observations": [
      { "periodDate": "2023-12-31", "periodLabel": "2023", "value": 2.0, "isEstimate": false, "scenario": "actual" }
    ],
    "notes": []
  }],
  "missing": []
}
```

**Failure modes.**
- Unknown indicator id → listed in `missing` with `reason: "unknown_id"`. Agent must not synthesize a value.
- Date range yields no observations → listed in `missing` with `reason: "no_data_in_range"`. Agent reports the gap.
- More than 20 ids → tool returns `{ error: "too_many_indicators", limit: 20 }`. Agent splits into multiple calls.
- DB error → `{ error: "fetch_failed" }`. Agent refuses to cite any number for the affected series.

### 3.3 `compute`

**Purpose.** Deterministic server-side arithmetic. Claude must not do math in its head for any figure that reaches the user.

**Signature.**
```ts
type ComputeOperation =
  | 'yoy_growth'           // period-over-period growth for annual or aligned series
  | 'cagr'                 // compound annual growth rate, start→end
  | 'ratio'                // numerator[i] / denominator[i] per aligned period
  | 'indexed'              // rebase series to a base period = 100
  | 'correlation'          // Pearson correlation of two aligned series
  | 'share'                // part / total per period
  | 'difference';          // a[i] - b[i] per aligned period

type ComputeInput =
  | { operation: 'yoy_growth'; series: Array<{ periodDate: string; value: number | null }>; }
  | { operation: 'cagr'; series: Array<{ periodDate: string; value: number | null }>; start?: string; end?: string; }
  | { operation: 'ratio'; numerator: Array<{ periodDate: string; value: number | null }>;
                          denominator: Array<{ periodDate: string; value: number | null }>; }
  | { operation: 'indexed'; series: Array<{ periodDate: string; value: number | null }>; base_period: string; }
  | { operation: 'correlation'; a: Array<{ periodDate: string; value: number | null }>;
                                b: Array<{ periodDate: string; value: number | null }>; }
  | { operation: 'share'; part: Array<{ periodDate: string; value: number | null }>;
                          total: Array<{ periodDate: string; value: number | null }>; }
  | { operation: 'difference'; a: Array<{ periodDate: string; value: number | null }>;
                               b: Array<{ periodDate: string; value: number | null }>; };

type ComputeResult =
  | { operation: 'yoy_growth' | 'ratio' | 'indexed' | 'share' | 'difference';
      result: Array<{ periodDate: string; value: number | null }>;
      nulls_propagated: number;
    }
  | { operation: 'cagr'; result: { startPeriod: string; endPeriod: string; valueStart: number; valueEnd: number; rate: number } }
  | { operation: 'correlation'; result: { n: number; r: number; pairsDropped: number } };
```

**Behavior.** Each operation validates inputs (aligned periods for paired operations), propagates nulls rather than zeroing them, and returns one structured result. `yoy_growth` assumes the caller already passed the right two-aligned series (annual: prior year; monthly: same month prior year); the tool's job is arithmetic, not alignment heuristics. `cagr` computes `(end/start)^(1/years) − 1` with years from date delta. `correlation` drops null-paired rows and reports `pairsDropped`.

**Example.**
```jsonc
// input
{
  "operation": "yoy_growth",
  "series": [
    { "periodDate": "2022-12-31", "value": 62.3 },
    { "periodDate": "2023-12-31", "value": 33.0 }
  ]
}
// result
{
  "operation": "yoy_growth",
  "result": [
    { "periodDate": "2022-12-31", "value": null },
    { "periodDate": "2023-12-31", "value": -47.03 }
  ],
  "nulls_propagated": 1
}
```

**Failure modes.**
- Misaligned periods on paired ops → `{ error: "series_misaligned", detail: "a has 10 periods, b has 8" }`.
- Division by zero in `ratio` / `share` → that row's result is `null`; `nulls_propagated` increments.
- Base period missing in `indexed` → `{ error: "base_period_missing" }`.
- Fewer than two valid pairs in `correlation` → `{ error: "insufficient_pairs", n: 1 }`.

### 3.4 `render_chart`

**Purpose.** Produce a chart payload the chat panel will render with Recharts, using the existing workbench chart components.

**Signature.**
```ts
type ChartType = 'area' | 'line' | 'bar' | 'bar-paired' | 'dual' | 'indexed';

type RenderChartInput = {
  chart_type: ChartType;
  title: string;
  subtitle?: string;
  series: Array<{
    indicator_id: IndicatorId;
    label?: string;                     // override display name
    axis?: 'left' | 'right';            // for 'dual'
    observations: Array<{ periodDate: string; value: number | null; isEstimate?: boolean; scenario?: Scenario }>;
    unit: string;
  }>;
  caveat?: string;                      // shown below the chart
  x_domain?: { start: string; end: string };
  y_format?: 'number' | 'percent' | 'currency_gyd' | 'currency_usd';
};

type RenderChartResult = {
  render_id: string;                    // referenced in the SSE stream
  chart_type: ChartType;
  series_count: number;
  warnings: string[];                   // e.g. "series 2 has 4 nulls"
};
```

**Behavior.** Validates the spec (e.g. `dual` requires exactly two series with different units; `bar-paired` requires two scenarios on the same indicator). Returns a `render_id` that the streaming layer correlates to an actual JSON payload pushed to the UI. The tool does not inline the whole payload into the Claude message (we don't need Claude to "see" the chart it emitted); only the `render_id` and warnings.

**Example.**
```jsonc
{
  "chart_type": "line",
  "title": "Guyana GDP growth vs global GDP growth, 2014–2023",
  "series": [
    { "indicator_id": "gdp_growth_overall", "observations": [...], "unit": "percent" },
    { "indicator_id": "global_gdp_growth_world", "observations": [...], "unit": "percent" }
  ],
  "y_format": "percent"
}
```

**Failure modes.**
- Invalid spec (e.g. `dual` with one series) → `{ error: "invalid_chart_spec", detail: "..." }`. Agent retries.
- Empty series → `{ error: "no_data_to_render" }`. Agent routes to `flag_unavailable` or responds in prose only.

### 3.5 `render_table`

**Purpose.** Emit a sortable table payload for the UI.

**Signature.**
```ts
type RenderTableInput = {
  title: string;
  subtitle?: string;
  columns: Array<{
    key: string;
    label: string;
    format?: 'text' | 'number' | 'percent' | 'currency_gyd' | 'currency_usd' | 'date';
    align?: 'left' | 'right';
  }>;
  rows: Array<Record<string, string | number | null>>;
  caveat?: string;
};

type RenderTableResult = {
  render_id: string;
  row_count: number;
  warnings: string[];
};
```

**Behavior.** Validates that every `row` key is declared in `columns`. Numeric columns with null values render as the house-style dash; the tool passes nulls through untouched. Tables over 200 rows are rejected with a warning to split; Sabina does not need a 5,000-row scroll.

**Failure modes.**
- Unknown column key in a row → `{ error: "unknown_column_key", key }`.
- More than 200 rows → `{ error: "table_too_long", count }`.

### 3.6 `render_commentary`

**Purpose.** Emit a prose block in EPAU house style as a distinct rendered element, separate from the agent's own chat-text reply. This is the tool that produces the briefing paragraph a user would copy into a minute.

**Signature.**
```ts
type RenderCommentaryInput = {
  text: string;                         // the paragraph itself
  pullquote?: string;                   // optional, one sentence, for visual emphasis
  caveat?: string;                      // rendered beneath the paragraph
  word_count_target?: number;           // default 150, range 80..250
};

type RenderCommentaryResult = {
  render_id: string;
  word_count: number;
  style_warnings: string[];             // e.g. "emdash detected", "not X, it is Y construction detected"
};
```

**Behavior.** Accepts finished prose. The tool runs the existing house-style lint (no emdashes, no "not X, it is Y", years not comma-formatted, numbers carry units and period) and returns `style_warnings` so the agent can self-correct before the paragraph lands in front of Sabina. Lint flags do not block the render in v1; they surface as subtle badges in the UI so we can tune the rules without blocking.

**Failure modes.**
- Empty text → `{ error: "commentary_empty" }`.
- Text over 400 words → `{ error: "commentary_too_long", word_count }`.

### 3.7 `saved_views` (two methods)

**Purpose.** Let the agent find and open saved queries the user has stored.

**Signature.**
```ts
type ListSavedViewsInput = { user_email: string; limit?: number };
type ListSavedViewsResult = {
  views: Array<{
    id: string;
    name: string;
    queryText: string;
    indicatorIds: IndicatorId[];
    lastRunAt: string | null;
    createdAt: string;
  }>;
};

type GetSavedViewInput = { id: string };
type GetSavedViewResult = {
  id: string;
  name: string;
  queryText: string;
  indicatorIds: IndicatorId[];
  config: unknown | null;                // raw config blob saved with the view
  ownerEmail: string;
};
```

**Behavior.** `list_saved_views` returns the current user's saved queries (scoped by email). `get_saved_view` returns the full payload for a specific id so the agent can reconstruct the chart or answer a question about it. The two methods are one logical tool exposed as two schemas so Claude does not accidentally fetch all views when it only needs one.

**Example.** User says "reopen my NRF view." Agent calls `list_saved_views({ user_email })`, finds the `NRF since inception` entry, calls `get_saved_view({ id })`, then `get_observations` for the indicator ids in the saved config, then `render_chart` with the same chart type the user saved it as.

**Failure modes.**
- Unknown id → `{ error: "saved_view_not_found", id }`.
- Email not in allowlist → `{ error: "forbidden" }` (defense in depth; the middleware should have already gated this).

### 3.8 `comparison_tables` (two methods)

**Purpose.** Access the `comparison_tables` store — the `Measures_*` sheets and other non-time-series reference snapshots.

**Signature.**
```ts
type ListComparisonTablesInput = { category?: IndicatorCategory; limit?: number };
type ListComparisonTablesResult = {
  tables: Array<{
    id: string;
    name: string;
    category: IndicatorCategory | null;
    source: string | null;
    sourceTab: string;
    description: string | null;
    rowCount: number;
  }>;
};

type GetComparisonTableInput = { id: string };
type GetComparisonTableResult = {
  id: string;
  name: string;
  sourceTab: string;
  description: string | null;
  rows: Array<{
    rowLabel: string;
    groupLabel: string | null;
    columnLabel: string;
    value: number | null;
    valueText: string | null;        // for qualitative entries like "Increased from $8M to $10M"
    unit: string | null;
    note: string | null;
    orderIndex: number;
  }>;
};
```

**Behavior.** Same `list` / `get` pattern as saved views. Preserves `valueText` for qualitative cells (Measures_Low Income Ceiling, Measures_Medical Insurance); the agent must treat `valueText` as the authoritative string and must not numerically interpret it.

**Failure modes.**
- Unknown table id → `{ error: "comparison_table_not_found", id }`.

### 3.9 `flag_unavailable` — the anti-hallucination guardrail

**Purpose.** The explicit escape valve the agent uses when the data it needs is not in the store. Exercising this tool is the only way the agent is permitted to conclude a turn about a missing figure. If the agent cannot produce a number by grounding it in a `get_observations` or `compute` call in this turn, it must call `flag_unavailable` and stop.

**Signature.**
```ts
type FlagUnavailableInput = {
  reason: string;                         // plain-language reason, aimed at the user
  missing: Array<{
    requested: string;                    // what the user asked for, echoed back
    closest_available: Array<{
      indicator_id?: IndicatorId;
      comparison_table_id?: string;
      why: string;                        // one sentence on why this is a near-miss, not a substitute
    }>;
  }>;
  searched: Array<{
    tool: 'search_indicators' | 'list_comparison_tables';
    query: string;
    top_hits: string[];                   // ids of what came back, so the user sees we looked
  }>;
  suggested_alternatives?: string[];      // optional, free-text, e.g. "Bureau of Statistics publishes this annually; not currently in the workbook."
};

type FlagUnavailableResult = {
  render_id: string;                      // rendered as a distinct "Not available" card in the UI
  acknowledged: true;
};
```

**Behavior.** This tool produces a rendered "Not available" card in the chat — a first-class UI element, not a text apology. The card shows: the user's original ask (`requested`), what the agent searched for (`searched`), the closest partial matches with reasons they are not substitutes (`closest_available`), and the agent's suggested next step. It is visually distinct so Sabina can see at a glance that an answer was refused, not cherry-picked.

**When the agent must call this (stated in the system prompt, reiterated here):**

1. After a `search_indicators` call that returned zero or only weak matches, and the user's question requires a specific number.
2. After a `get_observations` call that returned the series in `missing` rather than in `series` — i.e. the id was unknown or the range had no data — and no fallback series is genuinely equivalent.
3. When the user asks for an indicator that is structurally outside the workbook (Gini coefficient, literacy rate, a country not in Global Growth) and `search_indicators` confirms it.
4. When the user asks for a scenario the store does not carry for that indicator (e.g. a `projection` on a series that has only `actual`).
5. When the user asks for a period outside the indicator's range (before `earliestObservationDate` or after `latestObservationDate`).

**What the agent must NOT do instead of this tool:**

- Estimate from context ("inflation was probably around X"), interpolate, or back-calculate from a totals row.
- Substitute a superficially similar indicator without naming the substitution and asking the user. If the user asked for "headline inflation" and the store has "12-month inflation rate" and "annual average inflation rate", the agent chooses a default *and names it* in prose; that is not a `flag_unavailable` case. But substituting "private sector credit" for an ask about "total bank lending" is.
- Silently return a partial answer. If two of three requested indicators resolved, the agent renders those two and calls `flag_unavailable` for the third in the same turn.
- Answer from general knowledge. Claude's training data about Guyana is not an acceptable source for any figure the user will cite.

**Failure modes.** This tool itself has no real failure modes; it is a render primitive. If the payload is malformed (`missing` array empty), the route handler rejects with `{ error: "flag_unavailable_empty" }` and the agent must retry with a populated payload.

---

## 4. System prompt — full text

Draft v0.1. Expect the grounding rule (§4.2) and the `flag_unavailable` rule (§4.8) to be rewritten in review.

> You are the EPAU Analyst Workbench agent.
>
> You serve the Economic Policy and Analysis Unit of Guyana's Ministry of Finance. Your primary user is the head of EPAU. Your answers are read by economists preparing briefings for the Minister of Finance, and the numbers you cite may appear in Cabinet documents. A fabricated or careless figure is a professional-grade failure for your user. Treat correctness as absolute and speed as secondary.
>
> **Data grounding rule (non-negotiable).**
>
> Every numeric value that appears in your output — in prose, in a chart, in a table, in a commentary block — must come from a `get_observations` call, a `get_comparison_table` call, or a `compute` call made in this turn whose inputs trace back to a `get_observations` or `get_comparison_table` call in this turn. No exceptions. You do not remember figures from prior turns; you retrieve them again. You do not use figures from your training data about Guyana or any other economy. If you cannot ground a number in a tool call in this turn, you call `flag_unavailable` for that number. If you find yourself about to type a digit you did not retrieve in this turn, stop and call the appropriate tool instead.
>
> **Output discipline.**
>
> Match the shape of your response to the shape of the question. A one-number question gets one number, a short sentence of context, and the caveat if relevant. A comparison question gets a chart or a table. A "draft a note" question gets a `render_commentary` call with the prose, plus an underlying chart or table if the numbers in the prose would benefit from visual grounding. A structural question ("what are the biggest shifts") gets a short analytical paragraph with a supporting table or chart, not a lecture. Do not pad; do not add sections the user did not ask for. When in doubt, render less and say less.
>
> **Ambiguity handling.**
>
> When the user's question has an obvious default, pick it and say what you picked. "Inflation" defaults to the 12-month rate on the most recent available period; if the user meant the annual-average series, they will correct you. "GDP" defaults to overall nominal GDP unless the user names non-oil or a growth rate. Do not block on clarification questions the user can resolve themselves by reading your answer. Only ask for clarification when a default would be actively misleading — for example, when the user names an indicator that matches three genuinely different series in the catalog and the wrong choice would change the answer materially.
>
> **House style.**
>
> Write in Guyanese English. Technical but readable; the reader knows fiscal and macro vocabulary. No emdashes anywhere; use commas, semicolons, or a new sentence. Never use "this is not X, it is Y" constructions or any variant. Numbers carry their unit and period ("G$178 billion in 2023", not "178 billion"). Years are plain four-digit numerals with no comma. Negative values in prose are written as words ("a decline of 4.2 percent"), not with a leading minus. Caveats are first-class prose, not footnotes: if a series is stale or a cell is estimated, say so in the sentence that cites the number. End analytical paragraphs with an observation, not a restatement.
>
> **Tool call discipline.**
>
> Every number in your final output must be preceded in this turn by a `get_observations`, `get_comparison_table`, or `compute` call that produced it. Call `search_indicators` before `get_observations` whenever you are not certain of an indicator id; never guess an id. Prefer one `get_observations` call with many ids over many calls with one id each. Do not call `render_chart`, `render_table`, or `render_commentary` before you have the underlying data in hand; no render tool may be called without a corresponding data-fetch in the same turn. Do arithmetic through `compute`, not in your head — this applies even to a single year-over-year growth rate.
>
> **Context awareness.**
>
> You are told which surface of the application the user is on (Workbench, Catalog, Saved Views, Comparisons, Admin). Use this to pick a sensible default when the user's question is deictic. On the Workbench with a chart already open, "show me the same thing for 2015 onwards" means re-fetch the charted indicators with `start_date: 2015-01-01`. On a Saved View page, "open this" and "show me the chart" refer to the view id in context. On the Catalog, "what do we have on X" should call `search_indicators` and render a table of matches, not commentary. Never fabricate surface context you were not told.
>
> **The `flag_unavailable` rule.**
>
> You must call `flag_unavailable` whenever the data needed to answer a user's numeric question is not in the store. Specifically: when `search_indicators` returns nothing useful; when `get_observations` returns the id in `missing`; when the user asks for an indicator the workbook does not carry (Gini coefficient, literacy rate, any country not in Global Growth or FDI 2); when the user asks for a period outside the series range; when the user asks for a scenario the series does not have. You may not substitute a nearby indicator without naming the substitution explicitly; you may not estimate; you may not interpolate; you may not carry a figure over from memory. If you resolved two of three requested indicators, render the two and call `flag_unavailable` for the third in the same turn — do not hide the gap. Calling `flag_unavailable` is not a failure mode; it is the correct behavior. Sabina would rather see a clearly-marked "not available" card than a confidently wrong number.

### 4.a Prompt-prefix cache notes

The system prompt above, the indicator catalog summary (ids + names + units + categories, ~40KB), and the tool schemas are all stable within a deployment and will be marked as `cache_control: ephemeral` so every turn reuses the cached prefix. The per-turn delta is just the user message, chat history tail, and surface context.

---

## 5. Example agent loops

Each loop shows the tool-call sequence. Reasoning text between steps is Claude's internal planning; the user only sees the final rendered output.

### 5.1 Simple factual — "What was inflation in 2023?"

Classifier: **fast**. Single indicator, explicit year, no comparison, no composition verb.

Fast-path pre-load pass:
1. Keyword match on catalog: `inflation_12month` and `inflation_annual_average` both plausible.
2. Route handler pre-loads both via `get_observations({ indicator_ids: ["inflation_12month", "inflation_annual_average"], start_date: "2023-01-01", end_date: "2023-12-31" })`.
3. Single Claude Sonnet call with observations in the prompt. Claude picks 12-month inflation as the default, names it, cites `2.0 percent at end-2023 (12-month rate, Bureau of Statistics)`, and notes that the annual average was higher. No `render_chart`; the answer is one sentence.

Had the classifier tripped into slow path (ambiguous "what was inflation"), the sequence would have been:
1. `search_indicators({ query: "inflation 2023", limit: 5 })` → returns both inflation series.
2. `get_observations({ indicator_ids: ["inflation_12month", "inflation_annual_average"], start_date: "2023-01-01", end_date: "2023-12-31" })`.
3. Reply in prose, naming the default and citing both values.

### 5.2 Comparative — "Compare Guyana's GDP growth to global GDP growth over the past ten years and tell me what's notable."

Classifier: **slow**. Comparison verb, analytical verb ("what's notable"), range.

1. `search_indicators({ query: "Guyana GDP growth", limit: 5 })` → top hit `gdp_growth_overall`.
2. `search_indicators({ query: "global GDP growth world", limit: 5 })` → top hit `global_gdp_growth_world` (or similar, check catalog).
3. `get_observations({ indicator_ids: ["gdp_growth_overall", "global_gdp_growth_world"], start_date: "2014-01-01", end_date: "2023-12-31" })`. Returns both series, annual, ten rows each. Notes may flag oil-era structural break.
4. `compute({ operation: "difference", a: <guyana>, b: <global> })` → per-year gap. Agent inspects and notices the 2022 oil-production spike driving a 60+ percentage point gap.
5. `render_chart({ chart_type: "line", title: "Guyana GDP growth vs global GDP growth, 2014–2023", series: [...], y_format: "percent", caveat: "Guyana series reflects oil-sector impact from 2020 onward." })`.
6. Final chat-text reply: two sentences naming the three structural periods (pre-oil stable single-digit gap; 2020 first oil; 2022 production ramp), grounded in specific values from step 3. The "what's notable" framing justifies prose; no `render_commentary` call is needed — prose in the chat reply is enough.

### 5.3 Report — "Draft a 200-word note on the NRF's performance since inception for the Minister's budget speech."

Classifier: **slow**. Composition verb, target length, briefing context.

1. `search_indicators({ query: "NRF Natural Resource Fund", limit: 10 })` → returns the NRF balance, inflows, outflows, returns series (all archetype D, scenario `actual` and `projection`).
2. `get_observations({ indicator_ids: ["nrf_balance", "nrf_inflows", "nrf_outflows", "nrf_returns"], scenario: "actual" })`. Range omitted to get the full since-inception history. Returns from 2019.
3. `compute({ operation: "cagr", series: <nrf_balance>, start: "2019-12-31", end: <latestObservationDate> })`.
4. `compute({ operation: "yoy_growth", series: <nrf_inflows> })` to identify the ramp pattern.
5. `render_chart({ chart_type: "area", title: "NRF balance since inception", series: [{ indicator_id: "nrf_balance", ... }], y_format: "currency_usd", caveat: <NRF caveat if any> })`.
6. `render_commentary({ text: "<200-word paragraph in EPAU house style, citing the specific USD balances, annual inflow totals, and the balance CAGR from step 3>", word_count_target: 200 })`.
7. Chat-text reply: one short sentence pointing the user at the rendered commentary and chart ("Draft below; chart shows the balance since inception. Figures are actuals through <latest period>.")

If `render_commentary` returns `style_warnings` (e.g. emdash detected), the agent rewrites and re-calls once. Hard cap at two retries.

### 5.4 Structural — "What are the three biggest shifts in private sector credit composition since 2015?"

Classifier: **slow**. Structural verbs ("biggest", "shifts", "composition"), range.

1. `search_indicators({ query: "private sector credit", category: "monetary", limit: 25 })` → returns the component series: `private_sector_credit_business`, `_mining`, `_manufacturing`, `_services`, `_households`, `_mortgages`, `_credit_cards`, plus the `_total`.
2. `get_observations({ indicator_ids: [<components>, "private_sector_credit_total"], start_date: "2015-01-01", end_date: <latestObservationDate> })`.
3. For each component: `compute({ operation: "share", part: <component>, total: <total> })`. (In practice, one share call per component — seven calls, or one batched `compute` call if we choose to support a batch mode; see Open Questions §8.)
4. Compare 2015 share vs latest share per component; rank absolute change in share.
5. `render_table({ title: "Shifts in private sector credit composition, 2015 → <latest year>", columns: [{ key: "sector" }, { key: "share_2015", format: "percent" }, { key: "share_latest", format: "percent" }, { key: "change_pp", format: "number", label: "Δ (pp)" }], rows: <all seven, sorted by |change_pp| desc>, caveat: "Shares computed against PSC total; may not sum to 100 because of rounding and excluded unclassified lending." })`.
6. Chat-text reply: two sentences naming the top three shifts (e.g. mortgages up, mining down, households up), each grounded in the share values from step 3. No `render_commentary` — this is analytical dialogue, not a briefing paragraph.

### 5.5 Graceful unavailable — "What's the Gini coefficient for Guyana?"

Classifier: **slow** (single-indicator asks for something not in the store still route slow; the classifier does not know the catalog well enough to be sure).

1. `search_indicators({ query: "Gini coefficient inequality", limit: 10 })` → zero matches, or only unrelated `social`-category hits with low scores.
2. `search_indicators({ query: "income inequality distribution", limit: 10 })` → still no good match.
3. `flag_unavailable({ reason: "The workbook does not carry a Gini coefficient or any direct income-inequality series for Guyana.", missing: [{ requested: "Gini coefficient for Guyana", closest_available: [{ indicator_id: "minimum_wage_gyd", why: "Minimum wage is in the store, but it is a policy rate, not a distributional measure." }, { indicator_id: "oap_rate", why: "Old-Age Pension rate is distributional-policy, not inequality." }] }], searched: [{ tool: "search_indicators", query: "Gini coefficient inequality", top_hits: [] }, { tool: "search_indicators", query: "income inequality distribution", top_hits: [] }], suggested_alternatives: ["The Bureau of Statistics publishes household-budget-survey-based distributional indicators periodically; those are not currently ingested into the workbench."] })`.
4. No chat-text reply beyond a one-line pointer to the card.

If the tool set does not let an example loop complete, the tool set is wrong. All five loops above pass with the nine tools as specified.

---

## 6. Fast-path classifier design

**Model.** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Small, fast, cheap; this call gates every user turn.

**Interface.** Takes the user's latest message, the three previous messages in the session (for deictic context like "do it again for 2020"), the current surface name, and the catalog summary. Returns exactly one of two tokens: `fast` or `slow`. Nothing else. We parse by exact string match; any deviation routes to slow.

**Classifier system prompt (full text):**

> You are a routing classifier for the EPAU Analyst Workbench agent. You will read one user message and its short recent context, and you will output exactly one token: `fast` or `slow`. Nothing else — no punctuation, no explanation, no quotes.
>
> Output `fast` when all of these are true:
>
> - The message is under about 15 words.
> - It asks for one indicator, or a small named set of indicators.
> - It names or clearly implies a narrow time window (a specific year, a quarter, "latest", "this year", "last year").
> - It does not use comparison verbs: compare, versus, vs, against, relative to, benchmark.
> - It does not use composition or briefing verbs: draft, summarise, summarize, narrate, write a note, report, brief, paragraph, commentary.
> - It does not use structural verbs: biggest, largest, smallest, most, composition, breakdown, shifts, decomposition, attribution, driver, contribution.
> - It does not ask "why" or "what's notable" or "what changed".
>
> Output `slow` in every other case, and in every case where you are uncertain. When in doubt, output `slow`. A slow answer that is correct is always better than a fast answer that is wrong.
>
> Context you will be given: the user's message, up to three prior turns of the same chat, and the surface name (Workbench / Catalog / Saved Views / Comparisons / Admin). A deictic message ("do that for 2020") inherits its complexity from the turn it refers to; if the referenced turn would have been slow, this one is slow.
>
> Output only the token.

**Signals cheat-sheet (for review; not part of the prompt the classifier sees).** Query length; presence of the forbidden verb lists; presence of a single indicator keyword vs multiple; presence of an explicit period; presence of analytical question words; surface context (Admin → always slow, Catalog → fast-eligible for "what do we have on X" pattern).

**Default on uncertainty.** `slow`. The prompt says this twice for a reason.

**Latency and cost estimates.**

| Path | Steps | p50 latency | p95 latency | Claude cost per turn |
|---|---|---|---|---|
| Fast | 1× Haiku classifier + 1× Sonnet with pre-loaded obs | ~2.5s | ~4s | ~$0.005 |
| Slow (3 tool calls) | 1× Haiku classifier + agent loop | ~10s | ~20s | ~$0.03 |
| Slow (6 tool calls, with `render_commentary`) | 1× Haiku classifier + agent loop | ~20s | ~30s | ~$0.07 |

Figures are order-of-magnitude; validate during implementation. Streaming means the user sees first tokens much earlier than the totals above.

---

## 7. Trace logging schema

Every user turn, every tool call, every tool result, every assistant text span, and the classifier decision are persisted. Traces are how we debug a bad answer after the fact, and how we build the eval set over time. Sabina's career rides on these numbers; the audit trail has to be complete.

```prisma
enum AgentTraceRole {
  user
  assistant
  tool_call
  tool_result
  classifier
  system_event
}

enum AgentPath {
  fast
  slow
}

model AgentSession {
  id             String        @id @default(uuid())
  userEmail      String        @map("user_email")
  surface        String        // 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin'
  startedAt      DateTime      @default(now()) @map("started_at")
  endedAt        DateTime?     @map("ended_at")
  turnCount      Int           @default(0) @map("turn_count")
  traces         AgentTrace[]

  @@index([userEmail])
  @@index([startedAt])
  @@map("agent_sessions")
}

model AgentTrace {
  id                 BigInt          @id @default(autoincrement())
  sessionId          String          @map("session_id")
  userEmail          String          @map("user_email")
  turnIndex          Int             @map("turn_index")     // 0-based per session
  stepIndex          Int             @map("step_index")     // 0-based within a turn
  createdAt          DateTime        @default(now()) @map("created_at")
  role               AgentTraceRole
  path               AgentPath?                              // null for classifier/system_event
  toolName           String?         @map("tool_name")       // populated on tool_call / tool_result
  toolCallId         String?         @map("tool_call_id")    // correlates call → result
  content            Json                                     // role-shaped payload
  latencyMs          Int?            @map("latency_ms")
  tokenCountInput    Int?            @map("token_count_input")
  tokenCountOutput   Int?            @map("token_count_output")
  modelId            String?         @map("model_id")         // e.g. 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'
  promptCacheHit     Boolean?        @map("prompt_cache_hit")
  stopReason         String?         @map("stop_reason")      // 'end_turn' | 'tool_use' | 'max_tokens' | etc.
  errorCode          String?         @map("error_code")       // tool errors, not Claude errors
  errorDetail        String?         @map("error_detail")
  session            AgentSession    @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, turnIndex, stepIndex])
  @@index([userEmail, createdAt])
  @@index([toolName])
  @@index([role])
  @@map("agent_traces")
}
```

Fields beyond the brief spec and why they earn their place:

- `AgentSession` separate from traces — gives us a per-session row for cheap listing in `/admin/agent`, and the `surface` at session start without scanning traces.
- `step_index` — a turn can have 10+ tool calls; `(turn_index, step_index)` is the ordering key. `turn_index` alone collapses the loop.
- `path` on the turn's first assistant trace — lets us group latency and cost by path without re-classifying offline.
- `tool_call_id` — correlates `tool_call` with its matching `tool_result`. Without this, debugging a tool that mis-returns is a join on timestamp.
- `model_id` and `prompt_cache_hit` — per-step, because fast and slow paths hit different models and cache lines and we'll want to spot when the cache drops.
- `stop_reason` — distinguishes `end_turn`, `tool_use`, and `max_tokens`. A `max_tokens` stop is a silent truncation we need to surface.
- `error_code` / `error_detail` — tool-level errors live here. We do not overload `content` for errors because querying for all tool failures should be `WHERE error_code IS NOT NULL`, not a JSON path.

What goes in `content` by role: `user` → `{ text }`; `assistant` → `{ text, contentBlocks }` preserving the Anthropic message shape; `tool_call` → `{ name, input }`; `tool_result` → `{ output }` (serialized tool return, minus any render-only payloads we stream separately); `classifier` → `{ input, decision: 'fast' | 'slow' }`; `system_event` → `{ kind, detail }` for things like "turn cap reached" or "agent self-aborted after flag_unavailable".

Retention: traces are not PII-clean (they contain Sabina's briefing questions). Hold for 180 days on the laptop, purge from prod when we get there. Not a schema concern; flagging here so we remember.

---

## 8. Open questions

1. **Classifier: LLM or rules?** I've proposed a Claude Haiku call, ~150 tokens, sub-second. A keyword-rules classifier would be free and faster but will miss the long tail (Sabina writing in a way the regex did not anticipate) and lean the wrong way when it misses. My recommendation: LLM classifier, because the cost of a fast-path misclassification on a slow-path query is a wrong number in a Cabinet briefing, and that asymmetry justifies the extra ~$0.002/turn. **Want your call on this before I wire the Haiku path.**

2. **Should `compute` support batch operations?** Example 5.4 has seven `compute({ operation: "share" })` calls in a row — same total, different parts. A batch mode (`{ operation: "share", parts: [...], total: ... }`) would collapse that to one call and cut three seconds off the slow path. The cost is a more complex tool schema and a second code path to keep correct. My recommendation: **defer** — land v1 with single-op `compute` and add batch after we see how often the pattern actually appears in real logs. **Your call on whether to take the hit upfront.**

3. **Fast-path pre-load strategy: keyword-matched, or second Haiku call?** The fast path currently needs *some* way to decide which indicators to pre-load before the Sonnet call. Two options: (a) keyword-match the user's message against the catalog (fast, dumb, will miss "inflation" → `inflation_12month` vs `inflation_annual_average` distinctions), or (b) another Haiku call to pick the ids (slower, better). My recommendation: **(a) with a generous top-k (say, top 5 matches)** and let the Sonnet prompt disambiguate in-context. Keep (b) in our back pocket if quality is bad. **Flagging for you — if you disagree, we do (b) from day one.**

4. **Where does `render_commentary` get its prompt?** The current `narrator.ts` prompt is good; the question is whether the agent composes commentary inline and passes finished prose to `render_commentary`, or whether `render_commentary` itself makes a second Claude call with the narrator prompt. My recommendation: **agent composes inline** — one Claude call in the loop, the agent-prompt house-style rules are already in the system prompt, and a second call is latency and surface area we do not need. The `render_commentary` tool then runs its style lint and surfaces warnings. **This is the cleaner architecture but means the agent's main system prompt carries the narrator style rules verbatim; I've done that in §4. Confirm you're happy before we bake it.**

5. **Does `flag_unavailable` block on a required `searched` array?** Currently the schema has `searched` as a non-empty array (the agent must have actually looked before flagging). The risk: agent tries to skip the search step and flags unavailable immediately, which is worse than calling `flag_unavailable` with an honest "I did not search" field. My recommendation: **require `searched` to be non-empty and reject the tool call otherwise**, forcing the agent to actually do the search before it gives up. But some unavailable cases are obvious enough (Gini for Guyana) that the search is ritual. **Your call — enforce strictly, or trust the prompt?**

6. **Session boundary: per page or persistent?** A "persistent chat panel on every surface" could mean (a) one session that follows the user across surfaces and survives reloads, or (b) a new session per surface, per reload. Option (a) is more like a real assistant; option (b) is simpler and has cleaner trace boundaries for eval. My recommendation: **(b) for v1** — simpler, easier to debug, and Sabina rarely needs cross-surface continuity in a single conversation. Revisit after week one of real use. **Flagging in case you have a stronger view.**

7. **How do we handle the `comparison_tables` + `observations` split in the agent's mental model?** Indicators and comparison tables are different shapes (time series vs snapshot), and the same user question ("how much has the GOAL programme paid out") might want a comparison-table row, not an indicator series. The agent's system prompt currently trusts the agent to pick the right tool based on the user's phrasing; my worry is that `list_comparison_tables` is discoverable only if the agent thinks to list. **Consider: should the system prompt explicitly enumerate the Measures_* families, or do we trust `search_indicators` to surface them via FTS that also indexes comparison_table names?** My recommendation: **index comparison tables into the same `search_indicators` FTS and have it return a unified result with a `kind: 'indicator' | 'comparison_table'` field** — one resolver, no cognitive split for the agent. That changes §3.1; flagging for your input before I wire the schema change.
