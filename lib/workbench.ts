// Workbench helpers bridging the UI's canned view kinds to the real
// /api/query/interpret and /api/query/narrate endpoints.
'use client';

import type { ViewKind } from '@/components/workbench/spec';

export async function interpretQuery(
  query: string,
  fallback: (q: string) => ViewKind | 'ambiguous',
): Promise<{ kind: ViewKind; disambiguate: boolean }> {
  try {
    const res = await fetch('/api/query/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`interpret ${res.status}`);
    const body = await res.json() as
      | { ok: true; result: { needs_clarification?: true; indicators?: string[] } }
      | { ok: false };
    if ('ok' in body && body.ok === true) {
      const result = body.result as { needs_clarification?: true; indicators?: string[] };
      if (result.needs_clarification) return { kind: 'psc', disambiguate: true };
      const indicators = result.indicators ?? [];
      // Map any known indicator back to one of the prototype's canned kinds so
      // the existing ResultsPanel can render. A richer UI (arbitrary indicators
      // + live observations + dynamic chart type) is a v2 task documented in
      // the README.
      const kind = mapIndicatorsToKind(indicators);
      return { kind: kind === 'ambiguous' ? 'psc' : kind, disambiguate: kind === 'ambiguous' };
    }
  } catch {
    // swallow; fall through to fallback
  }
  const kind = fallback(query);
  if (kind === 'ambiguous') return { kind: 'psc', disambiguate: true };
  return { kind, disambiguate: false };
}

function mapIndicatorsToKind(ids: string[]): ViewKind | 'ambiguous' {
  for (const id of ids) {
    if (id.startsWith('psc')) return 'psc';
    if (id.startsWith('nrf')) return 'nrf';
    if (id.startsWith('gdp')) return 'gdp';
    if (id.startsWith('npl')) return 'npl';
  }
  return 'ambiguous';
}

export async function narrate(query: string, indicatorIds: string[]): Promise<string | null> {
  try {
    const res = await fetch('/api/query/narrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, indicatorIds }),
    });
    if (!res.ok) return null;
    const body = await res.json() as { ok: true; commentary: string } | { ok: false };
    if ('ok' in body && body.ok === true) return body.commentary;
    return null;
  } catch {
    return null;
  }
}
