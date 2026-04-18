// Client-side API helpers. Convert DB shapes (snake_case enum values) into
// the UI shapes ported from the prototype (Title-cased values).
'use client';

import type { Indicator, IndicatorCategory, Frequency, ComparisonTable, SavedView, IngestionRun } from './types';

// ---------- Shape conversion ----------

const CATEGORY_DB_TO_UI: Record<string, IndicatorCategory> = {
  real_economy: 'Macro',
  prices: 'Prices',
  external: 'External',
  monetary: 'Monetary',
  fiscal: 'Fiscal',
  debt: 'Debt',
  social: 'Social',
};

const FREQUENCY_DB_TO_UI: Record<string, Frequency> = {
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
};

interface DbIndicator {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  unit: string;
  frequency: string;
  source: string;
  sourceTab: string;
  caveat?: string | null;
  latestObservationDate?: string | null;
  earliestObservationDate?: string | null;
}

function mapIndicator(raw: DbIndicator): Indicator {
  return {
    id: raw.id,
    name: raw.name,
    category: CATEGORY_DB_TO_UI[raw.category] ?? 'Macro',
    frequency: FREQUENCY_DB_TO_UI[raw.frequency] ?? 'Annual',
    latest: raw.latestObservationDate ? formatLatest(raw.latestObservationDate, raw.frequency) : '',
    source: raw.source,
    unit: raw.unit,
    caveat: raw.caveat ?? null,
    sheet: raw.sourceTab,
  };
}

function formatLatest(iso: string, freq: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  if (freq === 'annual') return String(d.getUTCFullYear());
  if (freq === 'quarterly') {
    const q = Math.ceil((d.getUTCMonth() + 1) / 3);
    return `Q${q} ${d.getUTCFullYear()}`;
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------- Fetch functions ----------

export async function fetchIndicators(): Promise<Indicator[]> {
  const res = await fetch('/api/indicators?limit=2000', { cache: 'no-store' });
  if (!res.ok) throw new Error(`indicators fetch failed: ${res.status}`);
  const body = await res.json() as { indicators: DbIndicator[] };
  return body.indicators.map(mapIndicator);
}

export interface Observation {
  indicatorId: string;
  periodDate: string;
  periodLabel: string;
  value: number | null;
  isEstimate?: boolean;
  scenario?: string;
}

export async function fetchObservations(ids: string[], opts?: { start?: string; end?: string; scenario?: string }): Promise<Observation[]> {
  if (!ids.length) return [];
  const p = new URLSearchParams();
  for (const id of ids) p.append('indicator_id', id);
  if (opts?.start) p.set('start', opts.start);
  if (opts?.end) p.set('end', opts.end);
  if (opts?.scenario) p.set('scenario', opts.scenario);
  const res = await fetch(`/api/observations?${p.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`observations fetch failed: ${res.status}`);
  const body = await res.json() as { observations: Observation[] };
  return body.observations;
}

interface DbComparisonRow {
  rowLabel: string;
  groupLabel?: string | null;
  columnLabel: string;
  value: number | null;
  valueText?: string | null;
  unit?: string | null;
  orderIndex: number;
}
interface DbComparisonTable {
  id: string; name: string; sourceTab: string;
  category?: string | null; source?: string | null; description?: string | null;
  metadata?: { columns?: string[] } | null;
  rows: DbComparisonRow[];
}

export async function fetchComparisons(): Promise<ComparisonTable[]> {
  const res = await fetch('/api/comparisons', { cache: 'no-store' });
  if (!res.ok) throw new Error(`comparisons fetch failed: ${res.status}`);
  const body = await res.json() as { tables: DbComparisonTable[] };
  return body.tables.map((t) => {
    const cols = t.metadata?.columns ?? Array.from(new Set(t.rows.map((r) => r.columnLabel)));
    // Group rows by rowLabel, pivoting columns into the cells array
    const rowsByLabel = new Map<string, { label: string; unit: string; cells: (number | null)[] }>();
    for (const r of t.rows) {
      const key = r.rowLabel;
      let acc = rowsByLabel.get(key);
      if (!acc) {
        acc = { label: r.rowLabel, unit: r.unit ?? '', cells: cols.map(() => null as number | null) };
        rowsByLabel.set(key, acc);
      }
      const colIdx = cols.indexOf(r.columnLabel);
      if (colIdx >= 0) acc.cells[colIdx] = r.value;
    }
    return {
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      groups: [{ label: 'Period', span: cols.length, sub: cols }],
      rows: Array.from(rowsByLabel.values()),
    };
  });
}

interface DbSavedView {
  id: string;
  name: string;
  queryText: string;
  indicatorIds: string[];
  lastRunAt: string | null;
}

export async function fetchSavedViews(): Promise<SavedView[]> {
  const res = await fetch('/api/saved', { cache: 'no-store' });
  if (!res.ok) throw new Error(`saved views fetch failed: ${res.status}`);
  const body = await res.json() as { views: DbSavedView[] };
  return body.views.map((v) => ({
    id: v.id,
    name: v.name,
    query: v.queryText,
    indicators: v.indicatorIds.slice(0, 5),
    last_run: v.lastRunAt ? new Date(v.lastRunAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
    chart: 'area',
  }));
}

interface DbIngestionRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  workbookFilename: string;
  workbookSizeBytes: number | null;
  indicatorsUpserted: number;
  observationsUpserted: number;
  comparisonTablesUpserted: number;
  issuesCount: number;
  status: string;
}

export async function fetchIngestionLatest(): Promise<IngestionRun | null> {
  const res = await fetch('/api/admin/ingestion/runs', { cache: 'no-store' });
  if (!res.ok) return null;
  const body = await res.json() as { runs: DbIngestionRun[] };
  const latest = body.runs[0];
  if (!latest) return null;
  const [issuesRes] = await Promise.all([
    fetch(`/api/admin/ingestion/issues?run_id=${encodeURIComponent(latest.id)}`, { cache: 'no-store' }),
  ]);
  const issues = issuesRes.ok ? ((await issuesRes.json()) as { issues: Array<{ sheet: string; cellRef: string | null; reason: string; severity: string }> }).issues : [];
  const sizeMb = latest.workbookSizeBytes ? `${(latest.workbookSizeBytes / 1024 / 1024).toFixed(2)} MB` : '—';
  const durationSec = latest.finishedAt
    ? ((new Date(latest.finishedAt).getTime() - new Date(latest.startedAt).getTime()) / 1000).toFixed(1) + ' seconds'
    : '—';
  return {
    timestamp: new Date(latest.startedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    workbook: latest.workbookFilename,
    workbook_size: sizeMb,
    sheets_parsed: 61,
    indicators_upserted: latest.indicatorsUpserted,
    observations_upserted: latest.observationsUpserted,
    duration: durationSec,
    issues_count: latest.issuesCount,
    quarantine: issues.map((i) => ({
      sheet: i.sheet,
      cell: i.cellRef ?? '',
      reason: i.reason,
      severity: (i.severity === 'error' ? 'high' : i.severity === 'warning' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
    })),
  };
}

// ---------- Mock fallback ----------
// The UI already imports mock data directly. These wrappers return live data
// if the API is reachable, otherwise fall back to mock (useful in dev without
// Supabase wired yet).
export async function indicatorsWithFallback(): Promise<Indicator[]> {
  try { return await fetchIndicators(); } catch { const { INDICATORS } = await import('./mock'); return INDICATORS; }
}
export async function comparisonsWithFallback(): Promise<ComparisonTable[]> {
  try { return await fetchComparisons(); } catch { const { COMPARISON_TABLES } = await import('./mock'); return COMPARISON_TABLES; }
}
export async function savedViewsWithFallback(): Promise<SavedView[]> {
  try { return await fetchSavedViews(); } catch { const { SAVED_VIEWS } = await import('./mock'); return SAVED_VIEWS; }
}
export async function ingestionWithFallback(): Promise<IngestionRun> {
  const live = await fetchIngestionLatest();
  if (live) return live;
  const { INGESTION_RUN } = await import('./mock');
  return INGESTION_RUN;
}
