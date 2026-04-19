# Demo query review

Five benchmark queries run live against `/api/agent/chat`. Artifacts in `/tmp/epau-bench/`.

## Environment

- Branch `feat/agent-design`, dev server localhost:3000
- Model: Sonnet 4.6 via Anthropic SDK, prompt-cache on
- Each run fresh session (`start_new_session: true`)

---

### Query 1 — "What was inflation in 2023?"

**Trace summary:** 2 tool calls (search_catalog, get_observations), 3 LLM steps, ~13.9s wall, prompt cache hit on every step.

**Output verdict:** needs-tuning

**What's right:**
- Numbers ground to tool output (2.0%, 2.9%).
- No fabricated content.

**What's off:**
- Returns BOTH 12-month and annual-average rates. The system prompt specifies "Inflation defaults to the 12-month rate". The agent should have returned one number (2.0 percent), not two.
- Trailing sentence "The 12-month rate measures December-on-December change, while the annual average reflects the full-year average" is pedagogical padding. The reader is a macro economist; she knows this.
- Cites "according to the Bureau of Statistics". Data-source citation from the tool metadata is strictly allowed, but in briefing voice it is noise. A head of EPAU knows where Guyana's CPI comes from.

**Tuning proposal:** Prompt-level "for a one-value question with a named default, return one number; do not show the alternate series". Also add "Do not restate widely-understood definitions the reader already holds."

---

### Query 2 — Comparative GDP vs. world

**Trace summary:** 5 tool calls (search_catalog ×2, get_observations, render_chart, render_table), 6 LLM steps, ~38.3s wall.

**Output verdict:** fail

**What's right:**
- Chart renders with eleven years of paired data. Correct chart_type (line, same units, good).
- 2020 inflection and 2022 peak identified correctly. Numbers like 43.5 percent (2020 Guyana) and 63.3 percent (2022) match tool output.

**What's off:**
- **Grounding-rule violation: arithmetic in head.** Table column "Differential" (−1.85, −2.75, …) and prose figures "46 percentage points" and "5-year average 40.9 percent" were computed without a compute call. No compute was invoked in this turn.
- Over-production: the user asked for one comparison. The agent rendered both a chart and a table of the same series, then added four bolded subsections of prose. "What's notable" calls for one visual and a short analytical paragraph, not a treatise.
- Preamble narration streams to the user: "I'll compare Guyana's GDP growth to global GDP growth…". "Now let me create a visual comparison…". The first visible characters in the panel are commentary about what the agent is about to do.
- Minor editorial: "a typical pattern for a developing economy" — outside of tool output.

**Tuning proposal:** Tighten the no-math-in-head rule so it triggers when the agent is about to compute pp gaps, averages, or differentials. Add a "do not emit preparatory narration between tool calls" rule. Add "render once, not twice, per question".

---

### Query 3 — Draft a 200-word NRF note

**Trace summary:** 3 tool calls (search_catalog, get_observations, render_commentary), 3 LLM steps, ~33.7s wall.

**Output verdict:** fail

**What's right:**
- Grounds some numbers: US$198.3 million in 2020, US$141.3 million investment income 2024 — both trace to the get_observations call.
- Commentary renders as a commentary card.

**What's off:**
- **Multiple fabrications, serious.**
  - "overseen by the Bank of Guyana and our international fund managers" — no tool returned either attribution.
  - "transformative infrastructure, social programmes, and economic diversification initiatives" — no tool returned how withdrawals were spent.
  - "cumulative petroleum revenue deposits reached US$6.05 billion" — hand-summed across five years, no compute call.
  - "US$3.20 billion withdrawn since 2022" — hand-summed, no compute.
- **Hype voice incompatible with briefing register.** "Cornerstone of Guyana's fiscal architecture", "testament to prudent petroleum revenue management", "exceptional growth", "safeguard our petroleum wealth, balancing today's urgent needs with tomorrow's prosperity". This is speechwriter hype, not a brief.
- Streams a trailing bullet-list recap ("The commentary highlights: Establishment and growth: …, Cumulative deposits: …") after rendering the commentary card. The card is the output; the recap is duplicate.
- Preamble narration again: "I'll retrieve the NRF data…". "Now I'll draft a 200-word note…".

**Tuning proposal:**
1. Expand the grounding rule: any institutional attribution (who manages, who oversees, where money was spent) is also tool-output-bound, not just numeric values.
2. Ban hype register in commentary: specific adjectives.
3. Forbid streaming a bullet-list summary of a rendered commentary — render_commentary is the terminal output for note-style asks.

---

### Query 4 — Three biggest shifts in PSC composition since 2015

**Trace summary:** **19 tool calls**, 7 LLM steps, ~60.5s wall, one table and one commentary rendered.

**Output verdict:** fail

**What's right:**
- Correct output shape eventually chosen (table with component / 2015 share / 2025 share / change_pp plus a prose summary).
- Numbers in the final table are arithmetically right when cross-checked (services 27.85 → 33.08, etc.).

**What's off:**
- **Compute tool broken end-to-end for this turn.** Every one of the sixteen `compute` calls failed with `series_misaligned`. Root cause: Claude passed the `part` / `numerator` parameter as a JSON string (`"[{...}]"`) instead of an array. The tool saw a 100-plus-character string and treated each character as a period.
- Agent falls back to hand calculation and **says so in the stream**: "I can calculate these shares manually from the data I've retrieved". The user sees the agent admitting to a grounding-rule violation.
- 19 tool calls for a 3-row answer — burns the round budget.
- Preamble / struggle narration throughout: "Let me try a simpler approach…", "Let me create a table…".
- Duplicate output: streams a bullet-list and then a render_commentary card saying the same thing.
- Judgment claim "the near-collapse of other forms of credit is the sharpest proportional shift" is a ranking ("sharpest") that conflicts with the user's ask for "biggest" (by percentage-point change, services wins).

**Tuning proposal:**
1. Tool-description fix: make it explicit that `part`, `numerator`, `a` accept a JSON **array**, never a stringified JSON value.
2. Reinforce batched-compute discipline: when computing shares for many components against the same total, one call with `part` as `BATCHED_SERIES_ARRAY`.
3. General "no visible struggle narration" rule (overlaps with Q1–Q3 tuning).

---

### Query 5 — Gini coefficient for Guyana

**Trace summary:** 3 tool calls (search_catalog ×2, flag_unavailable), 3 LLM steps, ~21.6s wall, one flag_unavailable card rendered.

**Output verdict:** needs-tuning (minor)

**What's right:**
- Flag-unavailable is correctly chosen.
- Addendum discipline holds: no named external sources in `reason`, `suggested_alternatives`, `closest_available.why`, or final prose. Uses the phrase "an external source" generically.
- `searched` array is populated with both queries and their top_hits.

**What's off:**
- Preamble narration streams to the user: "I'll search for the Gini coefficient in the catalog. The search returned no relevant results. Let me try a broader search for inequality or distribution indicators." Visible struggle text.
- "This type of data is typically collected through household income and expenditure surveys" is editorial speculation — not the end of the world, but outside of tool output.
- `closest_available` contains one entry that has only a `why` field and no `indicator_id` or `comparison_table_id`. That is technically schema-conformant (neither is required) but semantically empty; a "no alternative" case should probably present as `closest_available: []` rather than a lone `why`.

**Tuning proposal:** Covered by the no-preamble-narration rule from Q1/Q2/Q3. Tool-description tweak: `closest_available` should either name an indicator/table or be empty — no bare `why`-only entries.

---

## Tuning plan

Cross-query patterns pin most of the damage to three narrow rules:

1. **No preparatory narration.** "I'll…", "Let me…", "Now I'll…" between tool calls is forbidden.
2. **No hand-computed figures or institutional attributions in prose.** Grounding rule applies to institution names, allocation narratives, and derived figures (pp gaps, averages, sums across years).
3. **One output per ask.** Don't stream a bullet-list recap of a rendered card, don't render both a chart and a table unless the question genuinely asked for both.

Plus two tool-description fixes:

4. **compute tool:** `part` / `numerator` / `a` must be JSON arrays, never stringified JSON.
5. **flag_unavailable:** `closest_available` entries must name an indicator or comparison table; drop `why`-only entries.

And one voice fix:

6. **No hype register** in commentary. Banned words list.

Each goes in its own commit. Re-run affected queries after each.
