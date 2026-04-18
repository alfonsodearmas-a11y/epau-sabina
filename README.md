# EPAU Analyst Workbench

Internal tool for the Economic Policy and Analysis Unit (EPAU) at Guyana's Ministry of Finance. Ingests the 61-sheet **Guyana Key Statistics** workbook into a typed indicator store and provides a query-driven workbench for pulling charts, tables, and LLM-drafted narrative commentary.

> **Status**: local-dev v1. Production deployment is a separate phase after Sabina has used the local build for at least a week.

---

## Quick start (for Sabina)

If you've never run a Node project before, that's fine — follow these steps once and you'll be set.

### 1. One-time machine setup

Open **Terminal** (⌘+space, type "Terminal"). Paste each command and press Enter.

```bash
# Check if Node is installed:
node --version
# If you see v20.x or higher, skip the next two lines.
# Otherwise install via Homebrew (the standard Mac package manager):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

### 2. Get the code

The repo lives at `/Users/alfonsodearmas/EPAU Sabina/`. If it's already there, skip this step. Otherwise clone it from wherever Alfonso has hosted it, into that exact path (the ingest script references it by absolute path).

### 3. Put the workbook in place

The ingest script expects the source workbook at:

```
/Users/alfonsodearmas/EPAU Sabina/Guyana Key Statistics_06022026 for Donald.xlsx
```

If MoF sends a newer version, just drop it at that same path (the filename with the `_06022026` date does not need to change, but you can run a custom file with `npm run ingest -- --file /path/to/newer.xlsx`). The workbook is gitignored so it never ends up in the repo.

### 4. Install dependencies

```bash
cd "/Users/alfonsodearmas/EPAU Sabina"
npm install
```

That takes ~30 seconds. You'll see a lot of lines; ignore them unless there's a red "error".

### 5. Fill in credentials

```bash
cp .env.example .env.local
open -e .env.local
```

Edit the file in TextEdit. The fields you need:

| Variable | What | Where to get it |
|----|----|----|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Supabase dashboard → Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key | Supabase → Settings → API → "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin server-only key | Supabase → Settings → API → "service_role". **Never commit this, never paste it into a frontend.** |
| `DATABASE_URL` | Postgres pooled connection | Supabase → Settings → Database → Connection String → **Transaction pooler** (`aws-…pooler.supabase.com:6543`). URL-encode any special char in your password (`@` → `%40`). Append `?sslmode=require`. The **Direct connection** (`db.<ref>.supabase.co`) is IPv6-only on the free tier and won't work from most dev machines — use the pooler. |
| `DIRECT_URL` | Session pooler for migrations | Same page, **Session pooler** (`aws-…pooler.supabase.com:5432`) with `?sslmode=require`. |
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com → API keys. Used by `/api/query/interpret` and `/api/query/narrate`. |
| `ANTHROPIC_MODEL` | Model name | Default is `claude-sonnet-4-5`. Leave as is unless we change it. |
| `EPAU_EMAIL_ALLOWLIST` | Comma-separated emails permitted to use the workbench | The EPAU team's addresses. Alfonso's is preconfigured. |
| `EPAU_SUPERADMIN_EMAIL` | Your immutable superadmin email | Do not change; it is defended from any modification logic. |
| `EPAU_ALLOW_LOCAL` | Set to `true` on Sabina's laptop | Bypasses the allowlist middleware so you don't need a login for local dev. |
| `EPAU_WORKBOOK_PATH` | Absolute path to the xlsx | Already defaulted; override only if you move the file. |

Save and close the file.

### 6. Create the database tables

The migration SQL is at `prisma/migrations/0001_init.sql`. Copy its contents into the **Supabase Dashboard → SQL Editor → New query**, paste, and press **Run**. That creates every table: `indicators`, `observations`, `comparison_tables`, `comparison_table_rows`, `ingestion_runs`, `ingestion_issues`, `raw_sheet_snapshots`, `saved_queries`. You only do this once.

We never auto-run migrations; pasting them keeps you in full control.

After it runs successfully, regenerate the Prisma client:

```bash
npx prisma generate
```

### 7. Ingest the workbook into Supabase

```bash
npm run ingest -- --live
```

This parses all 61 sheets and upserts **~900 indicators and ~35,000 observations** into your Supabase database. It takes ~30-60 seconds. You can re-run it any time you get a fresh workbook from MoF — it's idempotent (updates in place on the unique key `(indicator_id, period_date, scenario)`).

### 8. Verify the numbers match the workbook

```bash
npm run reconcile -- --live
```

This spot-checks 30 values against the source xlsx. If any check fails, the script exits non-zero and prints the diff. If Sabina sees a `FAIL`, don't trust the workbench until we fix the adapter — integrity matters more than availability here.

### 9. Run the app

```bash
npm run dev
```

Open http://localhost:3000 in Chrome or Safari. You should land on the **Workbench** surface.

### 10. Usage notes

- **Cmd+K** anywhere opens the indicator search palette.
- **Escape** closes slide-outs and the palette.
- **Enter** in the query bar runs the query.
- The NL query bar talks to Claude via `/api/query/interpret`. If your Anthropic key is missing or the endpoint fails, the workbench silently falls back to a tiny local keyword router for the four canned demo views (PSC, NRF, GDP, NPL).
- The **Draft commentary** button on results calls `/api/query/narrate` and returns a ~150-word paragraph in EPAU house style.

---

## What's where

```
.
├── app/                    # Next.js App Router: pages + API routes
│   ├── api/                #   all server endpoints
│   │   ├── indicators/     #   GET list, GET [id]
│   │   ├── observations/   #   GET by indicator_id + start/end/scenario
│   │   ├── comparisons/    #   GET list, GET [id]
│   │   ├── query/          #   interpret + narrate (LLM)
│   │   ├── saved/          #   GET/POST/DELETE
│   │   ├── admin/          #   ingestion runs + issues
│   │   ├── export/         #   PNG + DOCX
│   │   └── _health/
│   ├── workbench/          # the hero surface
│   ├── catalog/
│   ├── saved/
│   ├── comparisons/
│   ├── admin/
│   └── denied/             # shown when allowlist rejects a user
├── components/             # React components ported from the prototype
│   ├── workbench/          #   charts, QueryBar, Results, Commentary, etc
│   ├── catalog/
│   ├── saved/
│   ├── comparisons/
│   ├── admin/
│   ├── layout/             #   TopNav, CommandPalette, BottomStatus
│   ├── app/                #   AppFrame (keyboard bindings)
│   ├── icons.tsx
│   └── ui/                 #   Pill, KeyCap, Divider, SectionLabel
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── auth.ts             # allowlist helpers
│   ├── anthropic.ts        # Claude SDK client
│   ├── api.ts              # client-side fetch helpers with DB↔UI mapping
│   ├── workbench.ts        # interpret + narrate glue
│   ├── prompts/
│   │   ├── interpreter.ts  # NL → structured plan (versioned)
│   │   └── narrator.ts     # commentary prompt (versioned, house-style)
│   ├── types.ts            # UI types
│   ├── fmt.ts              # n / nc / pct formatters
│   └── mock.ts             # illustrative mock data, still used as fallback
├── middleware.ts           # email allowlist gate
├── prisma/
│   ├── schema.prisma
│   └── migrations/0001_init.sql   # paste into Supabase Dashboard
├── scripts/
│   ├── ingest/             # entire ingest engine (see below)
│   └── reconcile.ts        # 30 spot checks against the source workbook
├── docs/
│   ├── design/             # vendored prototype (JSX canonical, HTML reference)
│   ├── archetypes.md       # classification of all 61 sheets
│   └── workbook-inventory.md
└── .env.example
```

### The ingest engine

Everything under `scripts/ingest/`.

- `lib/` — shared primitives: cell access, bounds clamping (the index sheet reports 16 383 columns; we clamp to the last observed non-empty column), Excel date-serial parsing with the 1900 leap-year fix, header detection, scenario parsing, numeric coercion with quarantine, raw-sheet snapshots, sinks (JSON for dry-run, Prisma for live).
- `configs/` — declarative per-sheet configs for archetypes A, B, C. Most sheets are just data shape; they all run through the generic runner.
- `adapters/` — bespoke adapters for archetypes D/E where the shape is genuinely idiosyncratic: `nrf.ts` (scenario-header NRF), `gog_investment.ts`, `bop.ts`, `mortgages_cb.ts`, `capex_sector.ts`, `prices_summary.ts`, `revenue_expenditure.ts`.
- `run.ts` — entry point. Parses the `List of Sheets` tab first to capture MoF's caveats verbatim; then runs each archetype; then captures raw snapshots for every sheet (so no cell is ever lost); finally flushes via the JSON or DB sink.

Re-running is idempotent. Every run also records an `ingestion_runs` row with counts, issues, and timing — surfaced on `/admin`.

Commands:

```bash
npm run ingest             # dry-run, writes JSON to scripts/ingest/output/
npm run ingest -- --live   # writes to Supabase
npm run ingest -- --file /path/to/alternate.xlsx --live
npm run reconcile          # check dry-run JSON against workbook
npm run reconcile -- --live --verbose
```

---

## Design decisions flagged for review

After Sabina's used v1 for a week, revisit these:

1. **Workbench result rendering is still on four canned views** (PSC, NRF, GDP, NPL) inherited from the prototype. The interpret endpoint routes an NL query to one of them; arbitrary indicator selection with a dynamic chart is a v2 refactor of `ResultsPanel`.
2. **Prices_Summary** parses to zero observations at the moment — the stacked commodity-block layout is idiosyncratic enough that the bespoke adapter needs another iteration. Opening an actual briefing that would cite it gets us the requirements faster than speculating now.
3. **APNU_Fuel Prices** is currently routed to `comparison_tables` per the spec, but its shape is a clean monthly time series; we might want to ingest it to both. Flagged in `docs/archetypes.md`.
4. **Measures_Cost of Living** has two side-by-side 2022/2023 blocks in one sheet. The generic F adapter reads them as separate rows, which is adequate but not pretty.
5. **Two workbook rows render with category `Macro`** when the underlying DB enum is `real_economy` or `prices`. That split-to-union is a UI concession; if EPAU wants them split out, add a `Prices` chip to the catalog filters.
6. **Every `Measures_*` sheet** lands in a single comparison_tables row per sheet regardless of internal block structure. Fine for v1; rethink if Sabina wants to chart them separately.
7. **Employment** only produces 6 observations — col A has mixed labels (`August 2020`, `End-2021`, `End-2022`) and our date parser only grabs the `Month Year` format. If Employment becomes important, extend `coerceHeaderToPeriod` to recognise `End-YYYY`.

---

## Deployment

Local v1 is the primary target. When you're ready to put it on Vercel,
follow `docs/deployment.md` (env vars, identity middleware, migration
process, initial data load, rollback plan).

## Still deferred

- Multi-user session management beyond the header-based allowlist (wire
  an SSO proxy like Vercel Access or a `/api/whoami` cookie-setter
  against Supabase Auth; both are documented in `docs/deployment.md`).
- Scheduled ingestion (today the workbook is re-ingested manually by
  running `npm run ingest -- --live` on the laptop with the fresh xlsx).
- Mobile responsive layout (desktop analyst tool by design).
- Write-back / data editing.
- PDF export (DOCX is enough).
- Multi-language.
- Public sharing.
- Settings / onboarding / notifications.

None of these are implemented on purpose.

---

## When something breaks

- **`npm run dev` shows a blank page** → check the browser console. A common cause is an unset `DATABASE_URL` — API fetches will 500 and pages render empty. Make sure `.env.local` has the pooled connection string from Supabase.
- **`npm run ingest -- --live` throws a Prisma error** → run `npx prisma generate` once after editing the schema. The migration SQL must have been applied to Supabase first.
- **Reconcile fails on a check that used to pass** → something regressed in the ingest. Don't "fix" the check; diff the current run's observation for that indicator against the cell the check names. If the cell is genuinely right and the store is wrong, it's an adapter bug.
- **The workbench shows mock data, not real data** → the client-side fetch helpers in `lib/api.ts` silently fall back to `lib/mock.ts` on any error. Open the browser Network tab and look for a red `/api/indicators` request. Usually it's a middleware rejection (see `/denied` redirect) or a 500 from Prisma.
- **LLM endpoints return 502 `interpreter_failed`** → Claude returned text that didn't parse as JSON. The prompt asks for strict JSON; if this happens repeatedly, check `ANTHROPIC_MODEL` is a current Sonnet model and the API key has balance.

---

## Credits

Design: Claude (Opus 4.7, separate session — dark navy + gold palette, Outfit / DM Serif Display / JetBrains Mono).
Build: Claude (Opus 4.7, this session).
Workbook: Ministry of Finance, Economic Policy and Analysis Unit.
