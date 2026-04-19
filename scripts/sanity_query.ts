#!/usr/bin/env -S tsx
/**
 * Offline sanity-check runner: exercises the workbench interpreter pipeline
 * using the dry-run JSON catalog. Simulates app/api/query/interpret without
 * touching the DB — same prompt builder, same parser, same Anthropic call.
 *
 *   npm run sanity -- "NRF petroleum revenue deposits 2020 to 2024"
 *
 * Exits 0 if the interpreter returns a resolved InterpretedQuery (ok path),
 * 1 if disambiguation is required, 2 on any error.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import type { IndicatorRecord } from './ingest/lib/types';
import { buildInterpreterMessages, parseInterpretation, type CatalogEntry } from '../lib/prompts/interpreter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT = join(__dirname, 'ingest', 'output');

const query = process.argv.slice(2).join(' ').trim();
if (!query) { console.error('usage: sanity "<query>"'); process.exit(2); }

const inds = JSON.parse(readFileSync(join(OUTPUT, 'indicators.json'), 'utf8')) as IndicatorRecord[];
const catalog: CatalogEntry[] = inds.map((i) => ({
  id: i.id, name: i.name, category: i.category, frequency: i.frequency, unit: i.unit, caveat: i.caveat ?? undefined,
}));
const catalogIds = new Set(catalog.map((c) => c.id));

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { system, messages } = buildInterpreterMessages(query, catalog);
  const resp = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
    max_tokens: 1200,
    temperature: 0,
    system,
    messages,
  });
  const raw = resp.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('');

  console.log(`Query: ${JSON.stringify(query)}`);
  console.log('-'.repeat(72));
  try {
    const result = parseInterpretation(raw, catalogIds);
    if ('needs_clarification' in result && result.needs_clarification) {
      console.log('DISAMBIGUATE');
      console.log(`  message: ${result.message}`);
      for (const c of result.candidates) {
        const ind = inds.find((i) => i.id === c.id);
        console.log(`  candidate: ${c.id}  (${ind?.name ?? '?'} — ${c.reason})`);
      }
      process.exit(1);
    }
    const ok = result;
    console.log('RESOLVED');
    console.log(`  indicators: ${ok.indicators.join(', ')}`);
    for (const id of ok.indicators) {
      const ind = inds.find((i) => i.id === id);
      console.log(`    ${id} → "${ind?.name}" (${ind?.sourceTab}, ${ind?.unit})`);
    }
    console.log(`  date_range: ${JSON.stringify(ok.date_range)}`);
    console.log(`  chart_type: ${ok.chart_type}`);
    if (ok.comparison_mode) console.log(`  comparison: ${ok.comparison_mode}`);
    if (ok.notes) console.log(`  notes: ${ok.notes}`);
  } catch (e) {
    console.error('PARSE ERROR:', (e as Error).message);
    console.error('raw:', raw);
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
