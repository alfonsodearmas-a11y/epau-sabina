import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { read } from 'xlsx';
import type { WorkBook } from 'xlsx';
import type { IngestContext, Issue } from './types';

export interface LoadedWorkbook {
  book: WorkBook;
  filename: string;
  path: string;
  sizeBytes: number;
}

export function loadWorkbook(path: string): LoadedWorkbook {
  const buf = readFileSync(path);
  const stat = statSync(path);
  const book = read(buf, { cellDates: false, cellNF: false, cellText: false });
  return { book, filename: basename(path), path, sizeBytes: stat.size };
}

export function makeContext(lb: LoadedWorkbook): IngestContext {
  const issues: Issue[] = [];
  const ctx: IngestContext = {
    workbookPath: lb.path,
    workbookFilename: lb.filename,
    caveats: new Map(),
    pushIssue(i) { issues.push(i); },
    indicators: new Map(),
    observations: [],
    comparisonTables: [],
    snapshots: [],
  };
  // Attach internal issue store so run.ts can flush
  (ctx as unknown as { issues: Issue[] }).issues = issues;
  return ctx;
}
