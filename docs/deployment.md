# Deployment (Vercel)

EPAU v1 runs locally. When Sabina's team is ready to move off her laptop,
this is the path — it matches the DG Work OS deployment pattern.

## Prerequisites

- A Vercel team and project (create via `npx vercel` the first time).
- A Supabase project already in use for local dev (same DB can be shared, or
  clone the schema to a new "prod" project — recommended).
- An Anthropic API key with headroom for interpret + narrate calls.

## One-time setup

```bash
cd "/Users/alfonsodearmas/EPAU Sabina"
npx vercel link        # pick the team and project
```

## Environment variables

Copy each value from `.env.local` into the Vercel project's Environment
Variables panel. **Do not** paste `SUPABASE_SERVICE_ROLE_KEY` or
`ANTHROPIC_API_KEY` into Preview/Development scopes — mark them
Production-only.

| Variable | Scope | Notes |
|---|---|---|
| `DATABASE_URL` | Production + Preview | pooled connection, port 6543 |
| `DIRECT_URL` | Production + Preview | direct 5432 for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | All | public, can appear in client bundles |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | server-only, never expose |
| `ANTHROPIC_API_KEY` | Production | mark "Sensitive" |
| `ANTHROPIC_MODEL` | All | default `claude-sonnet-4-5` |
| `EPAU_EMAIL_ALLOWLIST` | All | comma-separated emails |
| `EPAU_SUPERADMIN_EMAIL` | All | `alfonso.dearmas@mpua.gov.gy` |
| `EPAU_ALLOW_LOCAL` | Development only | unset in production |

You can bulk-import from `.env.local` with:

```bash
npx vercel env pull .env.production.local   # pull remote state
npx vercel env add DATABASE_URL production  # push one at a time
```

## Identity & middleware

The middleware in `middleware.ts` reads `x-epau-user` (header) or
`epau_user` (cookie) and rejects anything not on the allowlist.
Production needs to put a real email into one of those before the user hits
any page.

Two pragmatic options:

1. **Vercel Access or Cloudflare Access** in front of the deployment, which
   can inject an `x-epau-user` header from the SSO assertion. If you go this
   route, restrict the access policy to the same email allowlist.
2. **A tiny `/api/whoami` cookie-setter** that reads a Supabase session on
   first visit and sets an `epau_user` cookie. Not shipped; add in a
   follow-up PR if #1 isn't available.

Until one of those is wired, set `EPAU_ALLOW_LOCAL=true` is **not** an
acceptable production shortcut — leave it unset and the middleware will
redirect everything to `/denied` until identity is wired.

## Database migrations

`prisma/migrations/0001_init.sql` must be run once against the production
Supabase project before the first deploy. Paste it into Supabase Dashboard
→ SQL Editor → New query. Subsequent schema changes should:

1. Edit `prisma/schema.prisma`
2. `npm run prisma:migrate:emit` (writes an overwrite SQL file)
3. Commit + open a PR; reviewer runs the SQL manually in the Dashboard
   before merging.

Vercel builds call `prisma generate` (see `vercel.json`); they do NOT run
migrations. That's intentional — destructive changes should never be
silent.

## Initial data load

After the first successful deploy, run the ingest from your laptop
pointed at the production database:

```bash
EPAU_WORKBOOK_PATH="/path/to/prod-workbook.xlsx" \
DATABASE_URL="<prod-pooled>" \
DIRECT_URL="<prod-direct>" \
npm run ingest -- --live
```

Then reconcile:

```bash
DATABASE_URL="<prod-pooled>" npm run reconcile -- --live --verbose
```

If reconcile fails, **do not promote** the deploy; fix the adapter first.

## Deploy

```bash
npx vercel                 # preview deploy
npx vercel --prod          # production deploy
```

Auto-deploys from `main` are fine once the repo is wired; mark preview
deploys as password-protected in the project settings if it holds
government data.

## Regions

`vercel.json` pins `regions: ["iad1"]` (US East). If Supabase's project
is in Europe or South America, change this to minimize latency.

## Cost notes

- Ingest runs locally, not on Vercel — zero inbound bandwidth cost.
- LLM calls (interpret + narrate) stream through Vercel Functions but
  forward to Anthropic, so latency is bounded by Anthropic rather than
  the edge. `maxDuration: 30` handles slow narrator responses.
- `@resvg/resvg-js` has a ~10MB native binary per architecture. Vercel
  includes it in the function bundle; not a concern for 15-second PNG
  exports but keep an eye on cold-start.

## Rollback

Vercel's dashboard offers one-click rollback to any previous successful
deploy. Always rollback (don't redeploy) if ingest data becomes
corrupted; fix + re-ingest before pushing a new build.
