# Perf audit — slow demo queries (Q3, Q4)

Focused measurement of where wall time goes on the two benchmark queries that dragged the demo pass: Q3 (NRF note) and Q4 (PSC shifts). Based on `/tmp/epau-bench/q3_report_note.json` and `q4_structural.json` from pass 11.

## Wall-time decomposition

| Query | Wall | LLM total | Tool total | LLM calls | Tool calls | Notes |
|-------|------|-----------|------------|-----------|------------|-------|
| Q3    | 76.2s | 62.2s (82%) | 13.2s (17%) | 13 | 17 | 11s of tool time is 2× `render_commentary` composer calls |
| Q4    | 83.7s | 81.0s (97%) | 1.8s (2%)   | 13 | 13 | Pure LLM-bound; compute/get_observations all sub-second |

## Per-call LLM latency (Q3)

```
 2.7s in=357     out=81
 3.9s in=783     out=170
 4.4s in=3175    out=275
11.9s in=3657    out=615   ← heavy output
 1.4s in=4471    out=2
 2.3s in=4694    out=81
 3.2s in=5120    out=170
 3.5s in=7512    out=185
 4.7s in=7816    out=355
 7.0s in=8264    out=603
 4.7s in=9174    out=242
11.0s in=9546    out=507
 1.5s in=10315   out=2
```

Every call is a cache hit (cache_read_input_tokens > 0). Latency scales mainly with output tokens. The minimum cache-hit roundtrip is ~1.5s even when the model emits almost nothing; the median is ~4s; tool-use turns with 500+ output tokens run 7-12s.

## Bottleneck

LLM round-trips. At 3-10s each and 13 rounds per Q3/Q4 turn, the floor is ~40s and the ceiling is >80s. Compute, Postgres queries, search are all sub-second and already parallelised where the loop emits multiple tool_use blocks. Prompt caching is already on and hitting on every call.

## Tried: Haiku for the commentary composer

`COMMENTARY_MODEL=claude-haiku-4-5-20251001` was evaluated on Q3. Results:

- Wall time: 76s → 55s (28% faster).
- Composer latency: 5-6s → ~6.5s (no meaningful speedup on this call; 2024 Haiku 4.5 is ~same TTFT as Sonnet here).
- Quality: Haiku's paragraph invented derived figures ("US$1.1 billion" from 2.6 + 0.14 − 1.6), which the audit flagged. The terminal retry also failed. A correctness regression.

Reverted to the main model as default. Env var stays so we can retry when Haiku follow-the-brief reliability improves.

## Levers considered and not pulled

- **Trim the cached system prompt** (~15 KB, ~3K tokens). Already cached per-session; incremental gain would be single-digit ms per call. Not worth the regression risk against the five passes of prompt tightening.
- **Truncate `get_observations` output when ranges are long.** Currently returns all observations in range. On long series the output runs ~5-10 KB. An optional `max_points` parameter could halve some inputs. Structural change; skipped.
- **Decompose multi-step answers into parallel subagents.** The current loop has a single agent doing every step sequentially; a "research planner + multiple workers" split could turn two serial compute calls into one parallel batch. Real gains possible but invasive — out of scope for the v1 pass.

## Recommendation

Accept current latency for v1. Q1/Q5 (simple factual, unavailable) are ~10s; Q2 (comparative) is ~45s; Q3/Q4 (report / structural) are 55-85s. The slowest are the hardest and already produce correctly-grounded output on retry. Revisit with the subagent split after admin dashboard data comes in on real session latencies.
