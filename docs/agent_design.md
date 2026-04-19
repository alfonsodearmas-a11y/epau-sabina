# EPAU Agent — design document

Design-on-paper for the agentic Claude layer that replaces the current `interpret` / `narrate` split with a single conversational agent. The agent answers arbitrary analytical questions against the workbook store, chooses its own output shape (chart, table, prose, multi-part report), and lives in a persistent chat panel on every surface.

Status: design v0.2 after review. Implementation of tools follows.

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
- No cross-session personalization. A single session spans surfaces within one browser (see §7), but the agent does not learn from prior sessions in v1.

---

## 2. Architectural overview

```
┌──────────────┐    POST /api/agent/chat      ┌───────────────────────┐
│ Chat panel UI├──────── (SSE stream) ───────▶│ Agent route handler   │
│ (every page) │                              │                       │
└──────────────┘                              │  hydrate context:     │
        ▲                                     │   - user email        │
        │ streamed events                     │   - session id (cookie)
        │ (text / tool_use /                  │   - current surface   │
        │  tool_result / rendered)            │   - catalog summary   │
        │                                     │   - recent turn tail  │
        │                                     │                       │
        │                                     │           │           │
        │                                     │           ▼           │
        │                                     │  ┌─────────────────┐  │
        │                                     │  │ Agent loop      │  │
        │                                     │  │ (Claude Sonnet  │  │
        │                                     │  │  + tool_use)    │  │
        │                                     │  │                 │  │
        │                                     │  │ Tools:          │  │
        │                                     │  │  • search_catalog
        │                                     │  │  • get_observations
        │                                     │  │  • compute      │  │
        │                                     │  │  • render_chart │  │
        │                                     │  │  • render_table │  │
        │                                     │  │  • render_commentary
        │                                     │  │  • list_saved_views
        │                                     │  │  • get_saved_view
        │                                     │  │  • list_comparison_tables
        │                                     │  │  • get_comparison_table
        │                                     │  │  • flag_unavailable
        │                                     │  │                 │  │
        │                                     │  │ Budget: 12 tool │  │
        │                                     │  │ calls per turn. │  │
        │                                     │  └────────┬────────┘  │
        │                                     │           │           │
        │                                     │           ▼           │
        │                                     │  ┌────────────────┐   │
        │                                     │  │ agent_traces   │   │
        │                                     │  │ write-through  │   │
        │                                     │  └────────────────┘   │
        │                                     └───────────────────────┘
        │
        └── SSE: text deltas + tool events + render payloads
```

Single path. Every query enters the agent loop with the same tool set and the same 12-call budget. No classifier, no pre-loaded observations, no fast/slow split.

This is a deliberate simplification. The earlier draft proposed a Haiku classifier and a fast-path branch that pre-loaded observations before a single Sonnet call. We dropped both for v1 because:

- For a simple query like "what was inflation in 2023?" the agent will issue one `search_catalog` call and one `get_observations` call and then `end_turn`. The loop's own overhead (two tool round-trips) is modest; the classifier would have added its own Haiku call on every turn without changing the shape of that simple flow.
- The grounding rule and the `flag_unavailable` contract depend on the agent having actually called its tools. The fast path violated that contract by handing pre-fetched numbers to the model, which is exactly the kind of shortcut that produces confidently wrong answers.
- One architecture is cheaper to build, instrument, and debug than two. Correctness and auditability are worth the few seconds a fast-path would have saved on trivial queries.

Budget: the loop runs at most 12 tool-use rounds per turn. On the 13th, the route handler injects a `system_event` trace ("turn cap reached") and the assistant must reply from what it already has or call `flag_unavailable`. 12 is generous for every shape of query we've modeled in §5; the cap exists to bound cost and latency on pathological turns, not to shape behavior. We revisit the budget only if real logs show turns consistently hitting it.

Streaming: responses are SSE. Text, tool calls, tool results, and render payloads are emitted as distinct events so the UI can render partial state (a chart appearing before the paragraph that discusses it).

---

## 3. Tool specifications

All tools are server-side. Claude invokes them via Anthropic's tool-use protocol; the route handler executes them against Postgres (via Prisma), returns the result, and loops. No tool ever returns fabricated data; on failure it returns a structured error the model is instructed to surface to the user or route to `flag_unavailable`.

Throughout: `IndicatorId` is the catalog id (e.g. `private_sector_credit_total`, `inflation_12month`). `Scenario` mirrors the Prisma enum: `actual | budget | revised | projection`. Dates are ISO `YYYY-MM-DD`.

### 3.1 `search_catalog`

**Purpose.** Resolve a free-text query to a small set of **indicators and/or comparison tables** the agent can then fetch. This is the only search tool; there is no separate `search_indicators`.

**Signature.**
```ts
type CatalogKind = 'indicator' | 'comparison_table';

type SearchCatalogInput = {
  query: string;                              // free text, e.g. "private sector credit mortgages"
  category?: IndicatorCategory;               // optional filter; applies to both kinds
  kinds?: CatalogKind[];                      // optional restrict; default both
  limit?: number;                             // default 10, max 25
};

type SearchCatalogMatch =
  | {
      kind: 'indicator';
      id: IndicatorId;
      name: string;
      category: IndicatorCategory;
      subcategory: string | null;
      unit: string;
      frequency: 'annual' | 'quarterly' | 'monthly';
      source: string;
      caveat: string | null;
      earliestPeriod: string | null;          // ISO YYYY-MM-DD
      latestPeriod: string | null;
      score: number;                          // rank score, higher is better
    }
  | {
      kind: 'comparison_table';
      id: string;
      name: string;
      category: IndicatorCategory | null;
      source: string | null;
      sourceTab: string;
      description: string | null;
      rowCount: number;
      score: number;
    };

type SearchCatalogResult = {
  matches: SearchCatalogMatch[];              // ranked, mixed kinds
  truncated: boolean;                         // true if more matches existed
};
```

**Behavior.** Queries two Postgres FTS indexes (one on `indicators`, one on `comparison_tables`), combines scores, and returns a merged ranked list. Each index uses `to_tsvector('english', …)` over `name + subcategory/description + source + caveat + id` plus a trigram similarity component on id and name for prefix/misspelled matches. Results carry a `kind` discriminator so the agent picks the right follow-up (`get_observations` for indicators, `get_comparison_table` for comparison tables). Honours `category` and `kinds` filters. If the query looks like a literal id the caller already knows, returns that id as the top hit.

**Example.**
```jsonc
// input
{ "query": "GOAL programme payouts", "limit": 5 }

// result (abbreviated)
{
  "matches": [
    {
      "kind": "comparison_table",
      "id": "measures_goal",
      "name": "Measures — GOAL scholarship payouts",
      "category": "social",
      "source": "Ministry of Education",
      "sourceTab": "Measures_GOAL",
      "description": "Regional breakdown of GOAL scholarships awarded and total payouts by year.",
      "rowCount": 66,
      "score": 0.91
    },
    {
      "kind": "indicator",
      "id": "sector_expenditure_education",
      "name": "Sector Expenditure — Education",
      "category": "fiscal",
      "subcategory": "sector expenditure",
      "unit": "G$ millions",
      "frequency": "annual",
      "source": "Ministry of Finance",
      "caveat": null,
      "earliestPeriod": "2014-12-31",
      "latestPeriod": "2024-12-31",
      "score": 0.62
    }
  ],
  "truncated": false
}
```

**Failure modes.**
- No matches → returns `{ matches: [], truncated: false }`. The agent is told in the system prompt to route to `flag_unavailable` with the query echoed back, rather than guessing an id.
- Invalid `category` → `{ error: "unknown_category", allowed: [...] }`. Agent retries without the filter.
- DB error → `{ error: "search_failed", detail: "..." }`. Agent tells the user search is temporarily unavailable and offers no numbers.

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
      periodLabel: string;
      value: number | null;            // null means the source cell was blank / quarantined
      isEstimate: boolean;
      scenario: Scenario;
    }>;
    notes: string[];                   // e.g. "3 values in range were null", "stale: last updated 2024-03"
  }>;
  missing: Array<{ id: string; reason: 'unknown_id' | 'no_data_in_range' }>;
};
```

**Behavior.** Joins `indicators` and `observations`, clamps to the requested range, returns ordered ascending by `periodDate`. Nulls are preserved. Per-series `notes` surface staleness (latest observation more than 13 months ago for annual, 4 months for monthly), quarantined cells, and scenario mismatches. Unknown ids and ids with no data in range are returned in `missing`, not silently dropped, so the agent can reason about gaps.

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
- Date range yields no observations → listed in `missing` with `reason: "no_data_in_range"`.
- More than 20 ids → `{ error: "too_many_indicators", limit: 20 }`. Agent splits.
- DB error → `{ error: "fetch_failed" }`. Agent refuses to cite any number for the affected series.

### 3.3 `compute`

**Purpose.** Deterministic server-side arithmetic. Claude must not do math in its head for any figure that reaches the user.

**Single-op vs. batched.** Three operations — `ratio`, `share`, `difference` — accept a batched variant where the varying side is an array of series. Given an array input these ops return an array of per-series results in the same order. The other four operations (`yoy_growth`, `indexed`, `cagr`, `correlation`) are single-op only; each takes exactly one series or one pair.

**Signature.**
```ts
type Point = { periodDate: string; value: number | null };

type ComputeInput =
  | { operation: 'yoy_growth'; series: Point[]; }
  | { operation: 'cagr'; series: Point[]; start?: string; end?: string; }
  | { operation: 'indexed'; series: Point[]; base_period: string; }
  | { operation: 'correlation'; a: Point[]; b: Point[]; }

  // ratio / share / difference: single OR batched
  | { operation: 'ratio';
      numerator: Point[] | Array<{ id: string; series: Point[] }>;
      denominator: Point[];
    }
  | { operation: 'share';
      part: Point[] | Array<{ id: string; series: Point[] }>;
      total: Point[];
    }
  | { operation: 'difference';
      a: Point[] | Array<{ id: string; series: Point[] }>;
      b: Point[];
    };

type ComputeResult =
  | { operation: 'yoy_growth' | 'indexed'; result: Point[]; nulls_propagated: number }
  | { operation: 'cagr'; result: { startPeriod: string; endPeriod: string; valueStart: number; valueEnd: number; rate: number } }
  | { operation: 'correlation'; result: { n: number; r: number; pairsDropped: number } }

  // ratio / share / difference return either shape based on input
  | { operation: 'ratio' | 'share' | 'difference';
      result: Point[];                       // single
      nulls_propagated: number;
    }
  | { operation: 'ratio' | 'share' | 'difference';
      results: Array<{ id: string; result: Point[]; nulls_propagated: number }>;
    };
```

**Behavior.** Validates inputs (aligned periods for paired operations), propagates nulls rather than zeroing them, and returns structured results. `yoy_growth` assumes the caller passed the right two-aligned series (annual: prior year; monthly: same month prior year); the tool's job is arithmetic, not alignment heuristics. `cagr` computes `(end/start)^(1/years) − 1` with years from date delta. `correlation` drops null-paired rows and reports `pairsDropped`. Batched ops align each varying-side series independently to the shared side and return per-series null counts.

**Example (batched share).**
```jsonc
// input
{
  "operation": "share",
  "part": [
    { "id": "households",  "series": [{"periodDate":"2015-12-31","value":120000},{"periodDate":"2023-12-31","value":260000}] },
    { "id": "mortgages",   "series": [{"periodDate":"2015-12-31","value":80000},{"periodDate":"2023-12-31","value":210000}] },
    { "id": "mining",      "series": [{"periodDate":"2015-12-31","value":70000},{"periodDate":"2023-12-31","value":40000}] }
  ],
  "total": [{"periodDate":"2015-12-31","value":500000},{"periodDate":"2023-12-31","value":900000}]
}
// result
{
  "operation": "share",
  "results": [
    { "id": "households", "result": [{"periodDate":"2015-12-31","value":0.24},{"periodDate":"2023-12-31","value":0.289}], "nulls_propagated": 0 },
    { "id": "mortgages",  "result": [{"periodDate":"2015-12-31","value":0.16},{"periodDate":"2023-12-31","value":0.233}], "nulls_propagated": 0 },
    { "id": "mining",     "result": [{"periodDate":"2015-12-31","value":0.14},{"periodDate":"2023-12-31","value":0.044}], "nulls_propagated": 0 }
  ]
}
```

**Failure modes.**
- Misaligned periods on paired ops → `{ error: "series_misaligned", detail: "a has 10 periods, b has 8" }`.
- Division by zero in `ratio` / `share` → that row's result is `null`; `nulls_propagated` increments.
- Base period missing in `indexed` → `{ error: "base_period_missing" }`.
- Fewer than two valid pairs in `correlation` → `{ error: "insufficient_pairs", n: 1 }`.
- Empty input series → `{ error: "empty_series" }`.

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
    label?: string;
    axis?: 'left' | 'right';            // for 'dual'
    observations: Array<{ periodDate: string; value: number | null; isEstimate?: boolean; scenario?: Scenario }>;
    unit: string;
  }>;
  caveat?: string;                      // shown below the chart
  x_domain?: { start: string; end: string };
  y_format?: 'number' | 'percent' | 'currency_gyd' | 'currency_usd';
};

type RenderChartResult = {
  render_id: string;
  chart_type: ChartType;
  series_count: number;
  warnings: string[];                   // e.g. "series 2 has 4 nulls"
};
```

**Behavior.** Validates the spec (`dual` requires exactly two series with different units; `bar-paired` requires two scenarios on the same indicator). Returns a `render_id` that the streaming layer correlates to an actual JSON payload pushed to the UI. The tool does not inline the whole payload into the Claude message — only `render_id` and warnings.

**Example.** See §5.2.

**Failure modes.**
- Invalid spec → `{ error: "invalid_chart_spec", detail: "..." }`.
- Empty series → `{ error: "no_data_to_render" }`.

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

**Behavior.** Validates that every `row` key is declared in `columns`. Numeric columns with null values render as the house-style dash; the tool passes nulls through untouched. Tables over 200 rows are rejected with a warning to split.

**Failure modes.**
- Unknown column key in a row → `{ error: "unknown_column_key", key }`.
- More than 200 rows → `{ error: "table_too_long", count }`.

### 3.6 `render_commentary`

**Purpose.** Emit a prose block in EPAU house style as a distinct rendered element, separate from the agent's own chat-text reply. This is the tool that produces the briefing paragraph a user copies into a minute.

**Signature.**
```ts
type RenderCommentaryInput = {
  text: string;                         // finished prose
  pullquote?: string;                   // optional, one sentence
  caveat?: string;                      // rendered beneath the paragraph
  word_count_target?: number;           // default 150, range 80..250
};

type RenderCommentaryResult = {
  render_id: string;
  word_count: number;
  style_warnings: string[];             // e.g. "emdash detected", "not X, it is Y detected", "GY$ seen; house style is G$"
};
```

**Behavior.** Accepts finished prose. Runs the house-style lint (no emdashes; no "not X, it is Y"; years not comma-formatted; numbers carry units and period; currency symbol is `G$` not `GY$` or `Gy$`) and returns `style_warnings` so the agent can self-correct. Lint flags do not block the render; they surface as subtle badges in the UI so we can tune the rules.

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
  config: unknown | null;
  ownerEmail: string;
};
```

**Behavior.** `list_saved_views` returns the current user's saved queries (scoped by email). `get_saved_view` returns the full payload for a specific id so the agent can reconstruct the chart. Two methods, one tool category.

**Failure modes.**
- Unknown id → `{ error: "saved_view_not_found", id }`.
- Email not in allowlist → `{ error: "forbidden" }`.

### 3.8 `comparison_tables` (two methods)

**Purpose.** List or fetch a full comparison table. **There is no `search_comparison_tables`** — comparison tables are discoverable through `search_catalog` (§3.1). This tool exists for the "give me everything in category X" and "load this table by id" cases.

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
    valueText: string | null;
    unit: string | null;
    note: string | null;
    orderIndex: number;
  }>;
};
```

**Behavior.** Preserves `valueText` for qualitative cells (Measures_Low Income Ceiling, Measures_Medical Insurance); the agent must treat `valueText` as the authoritative string and not numerically interpret it.

**Failure modes.**
- Unknown table id → `{ error: "comparison_table_not_found", id }`.

### 3.9 `flag_unavailable` — the anti-hallucination guardrail

**Purpose.** The explicit escape valve the agent uses when the data it needs is not in the store. Exercising this tool is the only way the agent is permitted to conclude a turn about a missing figure. If the agent cannot produce a number by grounding it in a `get_observations`, `get_comparison_table`, or `compute` call in this turn, it must call `flag_unavailable` and stop.

**Signature.**
```ts
type FlagUnavailableInput = {
  reason: string;                         // plain-language, aimed at the user
  missing: Array<{                         // must be non-empty
    requested: string;                    // what the user asked for, echoed back
    closest_available: Array<{
      indicator_id?: IndicatorId;
      comparison_table_id?: string;
      why: string;                        // one sentence on why this is near-miss, not substitute
    }>;
  }>;
  searched: Array<{                       // must be non-empty
    tool: 'search_catalog' | 'list_comparison_tables';
    query: string;
    top_hits: string[];                   // ids of what came back, so the user sees we looked
  }>;
  suggested_alternatives?: string[];
};

type FlagUnavailableResult = {
  render_id: string;                      // rendered as a distinct "Not available" card in the UI
  acknowledged: true;
};
```

**Strict enforcement of `searched`.** The route handler rejects any call with an empty `searched` array, returning `{ error: "flag_unavailable_without_search", hint: "Call search_catalog or list_comparison_tables before flagging unavailable." }`. The agent must have actually looked before it gives up. This is enforced by the tool itself, not just the prompt; a prompt-only rule would be soft-failable.

**Behavior.** Produces a rendered "Not available" card in the chat — a first-class UI element, not a text apology. Shows: the user's ask (`requested`), what the agent searched for (`searched`), the closest partial matches and why they are not substitutes (`closest_available`), and the agent's suggested next step. Visually distinct so Sabina can see at a glance that an answer was refused rather than cherry-picked.

**When the agent must call this (stated in the system prompt, reiterated here):**

1. After a `search_catalog` call that returned zero or only weak matches, and the user's question requires a specific number.
2. After a `get_observations` call that returned the series in `missing` rather than in `series` — id was unknown or range had no data — and no fallback series is genuinely equivalent.
3. When the user asks for an indicator structurally outside the workbook (Gini coefficient, literacy rate, a country not in Global Growth or FDI 2) and `search_catalog` confirms it.
4. When the user asks for a scenario the store does not carry for that indicator (e.g. a `projection` on an `actual`-only series).
5. When the user asks for a period outside the indicator's range.

**What the agent must NOT do instead of this tool:**

- Estimate from context, interpolate, or back-calculate from a totals row.
- Substitute a superficially similar indicator without naming the substitution. If the user asked for "headline inflation" and the store has "12-month" and "annual average", the agent chooses a default *and names it* in prose; that is not a `flag_unavailable` case. Substituting "private sector credit" for "total bank lending" is.
- Silently return a partial answer. If two of three requested indicators resolved, the agent renders those two and calls `flag_unavailable` for the third in the same turn.
- Answer from general knowledge. Claude's training data about Guyana is not an acceptable source for any figure the user will cite.

**Failure modes.**
- Empty `searched` array → `{ error: "flag_unavailable_without_search", hint }`. Agent must search and retry.
- Empty `missing` array → `{ error: "flag_unavailable_empty" }`. Agent populates and retries.

---

## 4. System prompt — full text

Draft v0.2. The grounding rule (§4.2) and the `flag_unavailable` rule (§4.8) are the load-bearing rules; redlines welcome.

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
> Write in Guyanese English. Technical but readable; the reader knows fiscal and macro vocabulary. No emdashes anywhere; use commas, semicolons, or a new sentence. Never use "this is not X, it is Y" constructions or any variant. Numbers carry their unit and period ("G$178 billion in 2023", not "178 billion"). The Guyanese dollar symbol is `G$`, never `GY$` or `Gy$`. Years are plain four-digit numerals with no comma. Negative values in prose are written as words ("a decline of 4.2 percent"), not with a leading minus. Caveats are first-class prose, not footnotes: if a series is stale or a cell is estimated, say so in the sentence that cites the number. End analytical paragraphs with an observation, not a restatement.
>
> **Tool call discipline.**
>
> Every number in your final output must be preceded in this turn by a `get_observations`, `get_comparison_table`, or `compute` call that produced it. Call `search_catalog` before `get_observations` whenever you are not certain of an indicator id; never guess an id. `search_catalog` is the single search tool and it returns both indicators and comparison tables — use its `kind` field to pick the right follow-up. Prefer one `get_observations` call with many ids over many calls with one id each. When you need the same `ratio`, `share`, or `difference` across several components against the same total, use a single batched `compute` call rather than one call per component. Do not call `render_chart`, `render_table`, or `render_commentary` before you have the underlying data in hand; no render tool may be called without a corresponding data fetch in the same turn. Do arithmetic through `compute`, not in your head — this applies even to a single year-over-year growth rate.
>
> **Context awareness.**
>
> You are told which surface of the application the user is on (Workbench, Catalog, Saved Views, Comparisons, Admin). Use this to pick a sensible default when the user's question is deictic. On the Workbench with a chart already open, "show me the same thing for 2015 onwards" means re-fetch the charted indicators with `start_date: 2015-01-01`. On a Saved View page, "open this" and "show me the chart" refer to the view id in context. On the Catalog, "what do we have on X" should call `search_catalog` and render a table of matches, not commentary. Never fabricate surface context you were not told.
>
> **The `flag_unavailable` rule.**
>
> You must call `flag_unavailable` whenever the data needed to answer a user's numeric question is not in the store. Specifically: when `search_catalog` returns nothing useful; when `get_observations` returns the id in `missing`; when the user asks for an indicator the workbook does not carry (Gini coefficient, literacy rate, any country not in Global Growth or FDI 2); when the user asks for a period outside the series range; when the user asks for a scenario the series does not have. You must call `search_catalog` at least once before calling `flag_unavailable`. This is enforced by the tool itself — the call will be rejected if `searched` is empty, and you will have to retry after actually searching. You may not substitute a nearby indicator without naming the substitution explicitly; you may not estimate; you may not interpolate; you may not carry a figure over from memory. If you resolved two of three requested indicators, render the two and call `flag_unavailable` for the third in the same turn — do not hide the gap. Calling `flag_unavailable` is not a failure mode; it is the correct behavior. Sabina would rather see a clearly-marked "not available" card than a confidently wrong number.

### 4.a Prompt-prefix cache notes

The system prompt, the catalog summary (ids + names + units + categories, ~40KB), and the tool schemas are stable within a deployment and will be marked `cache_control: ephemeral` so every turn reuses the cached prefix. The per-turn delta is the user message, chat history tail, and surface context.

---

## 5. Example agent loops

Each loop shows the tool-call sequence. All loops use the single agent path; there is no fast/slow split. Reasoning between steps is Claude's internal planning; the user only sees the final rendered output.

### 5.1 Simple factual — "What was inflation in 2023?"

1. `search_catalog({ query: "inflation 2023", limit: 5 })` → returns `inflation_12month` (top) and `inflation_annual_average`, both `kind: "indicator"`.
2. `get_observations({ indicator_ids: ["inflation_12month", "inflation_annual_average"], start_date: "2023-01-01", end_date: "2023-12-31" })`. Returns both series for the year.
3. Chat-text reply: one sentence naming the 12-month rate as the default and citing it ("G$ figures unaffected; 12-month inflation was 2.0 percent at end-2023, Bureau of Statistics"), plus a one-line aside noting the annual-average was higher. No `render_*` call — a one-number answer does not warrant a chart.

Two tool calls, well under the 12-call budget. This is the shape simple queries naturally take; no classifier needed to shortcut them.

### 5.2 Comparative — "Compare Guyana's GDP growth to global GDP growth over the past ten years and tell me what's notable."

1. `search_catalog({ query: "Guyana GDP growth", limit: 5 })` → top hit `gdp_growth_overall`.
2. `search_catalog({ query: "global GDP growth world", limit: 5 })` → top hit `global_gdp_growth_world`.
3. `get_observations({ indicator_ids: ["gdp_growth_overall", "global_gdp_growth_world"], start_date: "2014-01-01", end_date: "2023-12-31" })`. Returns both annual series, ten rows each.
4. `compute({ operation: "difference", a: <guyana>, b: <global> })` → per-year gap. Agent inspects and notices the 2022 oil-production spike driving a 60+ percentage point gap.
5. `render_chart({ chart_type: "line", title: "Guyana GDP growth vs global GDP growth, 2014–2023", series: [...], y_format: "percent", caveat: "Both series are in percent; the visible gap is in percentage points. Guyana series reflects oil-sector impact from 2020 onward." })`. The caveat explicitly names the y-axis as percentage points because mixing "percent" series in a single chart invites misreading the gap as a percent rather than a pp difference.
6. Final chat-text reply: two sentences naming the three structural periods (pre-oil stable single-digit gap; 2020 first oil; 2022 production ramp), each grounded in specific values from step 3. "What's notable" framing justifies prose; no `render_commentary` call is needed.

### 5.3 Report — "Draft a 200-word note on the NRF's performance since inception for the Minister's budget speech."

1. `search_catalog({ query: "NRF Natural Resource Fund", limit: 10 })` → returns NRF balance, inflows, outflows, returns indicators.
2. `get_observations({ indicator_ids: ["nrf_balance", "nrf_inflows", "nrf_outflows", "nrf_returns"], scenario: "actual" })`. Range omitted to get the full since-inception history. Returns from 2019.
3. `compute({ operation: "cagr", series: <nrf_balance>, start: "2019-12-31", end: <latest> })`.
4. `compute({ operation: "yoy_growth", series: <nrf_inflows> })` to identify the ramp pattern.
5. `render_chart({ chart_type: "area", title: "NRF balance since inception", series: [{ indicator_id: "nrf_balance", ... }], y_format: "currency_usd", caveat: <NRF caveat if any> })`.
6. `render_commentary({ text: "<200-word paragraph citing the specific USD balances, annual inflow totals, and balance CAGR>", word_count_target: 200 })`.
7. Chat-text reply: one short sentence pointing the user at the commentary and chart.

If `render_commentary` returns `style_warnings` (e.g. emdash detected), agent rewrites and re-calls once. Hard cap at two retries.

### 5.4 Structural — "What are the three biggest shifts in private sector credit composition since 2015?"

1. `search_catalog({ query: "private sector credit", category: "monetary", limit: 25 })` → returns the component indicators (`_business`, `_mining`, `_manufacturing`, `_services`, `_households`, `_mortgages`, `_credit_cards`) plus `_total`.
2. `get_observations({ indicator_ids: [<seven components>, "private_sector_credit_total"], start_date: "2015-01-01", end_date: <latest> })`.
3. **One batched `compute` call:**
   ```jsonc
   {
     "operation": "share",
     "part": [
       { "id": "business",      "series": <business_obs> },
       { "id": "mining",        "series": <mining_obs> },
       { "id": "manufacturing", "series": <manufacturing_obs> },
       { "id": "services",      "series": <services_obs> },
       { "id": "households",    "series": <households_obs> },
       { "id": "mortgages",     "series": <mortgages_obs> },
       { "id": "credit_cards",  "series": <credit_cards_obs> }
     ],
     "total": <total_obs>
   }
   ```
   Returns `results: [{ id, result, nulls_propagated }, …]` with one share series per component.
4. Agent compares 2015 share vs latest share per component, ranks absolute change in share.
5. `render_table({ title: "Shifts in private sector credit composition, 2015 → <latest>", columns: [{ key: "sector" }, { key: "share_2015", format: "percent" }, { key: "share_latest", format: "percent" }, { key: "change_pp", format: "number", label: "Δ (pp)" }], rows: <all seven, sorted by |change_pp| desc>, caveat: "Shares computed against PSC total; may not sum to 100 because of rounding and excluded unclassified lending." })`.
6. Chat-text reply: two sentences naming the top three shifts, each grounded in the share values from step 3.

Three tool calls worth of data work; the batched `compute` collapses what would otherwise be seven sequential calls.

### 5.5 Graceful unavailable — "What's the Gini coefficient for Guyana?"

1. `search_catalog({ query: "Gini coefficient inequality", limit: 10 })` → zero matches, or only unrelated `social`-category hits with low scores.
2. `search_catalog({ query: "income inequality distribution", limit: 10 })` → still no good match.
3. `flag_unavailable({ reason: "The workbook does not carry a Gini coefficient or any direct income-inequality series for Guyana.", missing: [{ requested: "Gini coefficient for Guyana", closest_available: [{ indicator_id: "minimum_wage_gyd", why: "Minimum wage is a policy rate, not a distributional measure." }, { indicator_id: "oap_rate", why: "Old-Age Pension rate is distributional-policy, not inequality." }] }], searched: [{ tool: "search_catalog", query: "Gini coefficient inequality", top_hits: [] }, { tool: "search_catalog", query: "income inequality distribution", top_hits: [] }], suggested_alternatives: ["The Bureau of Statistics publishes household-budget-survey-based distributional indicators periodically; those are not currently ingested into the workbench."] })`.
4. No chat-text reply beyond a one-line pointer to the card.

Note step 2: the agent searches twice before flagging, satisfying the `searched` non-empty requirement with honest effort. If it had tried `flag_unavailable` after step 1 with an empty `searched`, the tool would have rejected with `flag_unavailable_without_search` and forced the retry.

---

## 6. (Removed)

Classifier design dropped in v0.2. Single agent path; see §2.

---

## 7. Trace logging schema

Every user turn, every tool call, every tool result, every assistant text span, and any system events are persisted. Traces are how we debug a bad answer after the fact, and how we build the eval set over time. The audit trail has to be complete.

### Session model

Sessions span surfaces within one browser, not per-surface. One session id follows the user as they navigate between Workbench, Catalog, Saved Views, Comparisons, and Admin. The id is stored in an HTTP-only cookie (`epau_agent_session`, SameSite=Lax), persists across page loads and across surface navigation, and rotates on:

- an explicit "New chat" click in the chat panel, or
- 24 hours of inactivity (no turns written to the session), or
- a change in the authenticated user email.

The `surface` field on `AgentSession` records the starting surface — useful for grouping ("what's the most common entry point to the agent?"). Individual traces carry a `content.surface` value noting the user's current surface at the time of the turn, so mid-session navigation is visible.

### Schema

```prisma
enum AgentTraceRole {
  user
  assistant
  tool_call
  tool_result
  system_event
}

model AgentSession {
  id             String        @id @default(uuid())
  userEmail      String        @map("user_email")
  surface        String        // starting surface: 'workbench' | 'catalog' | 'saved' | 'comparisons' | 'admin'
  startedAt      DateTime      @default(now()) @map("started_at")
  endedAt        DateTime?     @map("ended_at")
  lastTurnAt     DateTime?     @map("last_turn_at")
  turnCount      Int           @default(0) @map("turn_count")
  traces         AgentTrace[]

  @@index([userEmail])
  @@index([startedAt])
  @@index([lastTurnAt])
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
  toolName           String?         @map("tool_name")
  toolCallId         String?         @map("tool_call_id")
  content            Json                                     // role-shaped payload; includes current surface for user/assistant
  latencyMs          Int?            @map("latency_ms")
  tokenCountInput    Int?            @map("token_count_input")
  tokenCountOutput   Int?            @map("token_count_output")
  modelId            String?         @map("model_id")
  promptCacheHit     Boolean?        @map("prompt_cache_hit")
  stopReason         String?         @map("stop_reason")
  errorCode          String?         @map("error_code")
  errorDetail        String?         @map("error_detail")
  session            AgentSession    @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, turnIndex, stepIndex])
  @@index([userEmail, createdAt])
  @@index([toolName])
  @@index([role])
  @@map("agent_traces")
}
```

Field notes:

- `AgentSession` separate from traces — per-session row for cheap listing in `/admin/agent` without scanning traces.
- `step_index` — `(turn_index, step_index)` is the ordering key within a session.
- `tool_call_id` — correlates `tool_call` with its matching `tool_result`.
- `model_id` + `prompt_cache_hit` — per-step; spots when the cache drops.
- `stop_reason` — distinguishes `end_turn`, `tool_use`, `max_tokens` truncations.
- `error_code` / `error_detail` — tool-level errors live here. `WHERE error_code IS NOT NULL` finds all tool failures.
- `lastTurnAt` on the session — needed for the 24h idle rotation check and for the daily cleanup predicate.

`content` payloads by role:
- `user` → `{ text, surface }`
- `assistant` → `{ text?, contentBlocks, surface }` preserving the Anthropic message shape
- `tool_call` → `{ name, input }`
- `tool_result` → `{ output }` (serialized tool return, minus render-only payloads streamed separately)
- `system_event` → `{ kind, detail }` for `turn_cap_reached`, `session_rotated`, `flag_unavailable_rejected`, etc.

### Retention

Traces are not PII-clean (they contain Sabina's briefing questions). Retention is 180 days. A daily cleanup function deletes `agent_traces` older than 180 days and cascades to any `agent_sessions` whose last remaining traces were in the deleted window. Not for implementation in this prompt, but documented here so it lands in a follow-up: we'll implement this as either a `pg_cron` job on Supabase or a scheduled Vercel cron posting to an admin endpoint; picking the mechanism is part of the production phase, not local dev v1.

---

## 8. Open questions

Most of v0.1's questions were resolved in the review (classifier dropped, batched compute added, searched strictly enforced, unified search, cross-surface sessions). The ones below remain.

1. **Where does `render_commentary` get its prompt?** Two options: (a) the agent composes commentary inline and passes finished prose to `render_commentary`, which then lints — one Claude call in the loop, with the narrator style rules baked into the agent's system prompt (as drafted in §4); or (b) `render_commentary` itself makes a second Claude call with the dedicated narrator prompt from `lib/prompts/narrator.ts`. My recommendation: **(a)** — one model call, fewer moving parts, the style rules are already in the agent prompt. Option (b) is a safety net we can turn on if real commentary drafts start drifting. **Want your call here before we either delete `lib/prompts/narrator.ts` or keep it around as a hot standby.**

2. **What happens on the 13th tool call?** The budget is 12; on the 13th the route handler must end the turn. Options: (a) inject a `system_event` into the conversation and let Claude emit a final text reply from what it already has; (b) force a `flag_unavailable` with a "budget exhausted" reason; (c) stream an error to the UI and stop. My recommendation: **(a)** — the agent usually has enough by turn 12 to say something useful, and a forced `flag_unavailable` on a non-missing-data case misuses the guardrail. We add a `system_event` trace so we can see how often it trips. **Flagging for your input; this is a low-stakes choice but easy to get wrong silently.**

3. **Render-id correlation across SSE.** Render tools return a `render_id`; the UI needs to map that id to an actual JSON payload emitted on the same SSE stream. The cleanest shape is one SSE event per render (`event: render`, `data: { render_id, payload }`), sent before the tool_result that contains the `render_id`. I don't think this needs your input to design, but flagging so it's not a surprise when I wire the endpoint in prompt 3. **No action needed unless you want a different shape.**

4. **Cookie rotation on email change.** If the middleware email changes mid-session (shared laptop, Sabina hands it to a colleague), we rotate the session. But the rotation needs to happen on the *next* chat request, not retroactively; traces already written stay attached to the old session. Flagging in case you want a stricter policy (e.g. kill the cookie outright). **My recommendation: rotate-on-next-request; retain the old session's traces intact.**

5. **Trace cleanup mechanism (deferred).** Supabase `pg_cron` vs. Vercel scheduled function vs. a manual admin button. Not a v1 decision — production phase. Flagging here so the retention policy isn't a surprise when we get there.
