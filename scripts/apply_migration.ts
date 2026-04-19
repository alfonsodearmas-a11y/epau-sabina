#!/usr/bin/env -S tsx
// Apply a raw-SQL migration file to the live Prisma-connected database.
// Used for migrations under prisma/migrations/ that this repo opts to apply
// programmatically rather than via the Supabase SQL-editor paste flow.
//
//   npm run migrate -- prisma/migrations/0002_bug_reports.sql
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const path = process.argv[2];
if (!path) { console.error('usage: tsx scripts/apply_migration.ts <sql-file>'); process.exit(2); }

const sql = readFileSync(path, 'utf8');
const prisma = new PrismaClient();

async function main() {
  const stmts = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
  for (const stmt of stmts) {
    console.log(`[migrate] ${stmt.slice(0, 80).replace(/\s+/g, ' ')}…`);
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`[migrate] ${stmts.length} statement(s) applied from ${path}`);
}

main()
  .catch((e) => { console.error('[migrate] failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
