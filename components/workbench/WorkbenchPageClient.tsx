'use client';

// Thin client wrapper around <Workbench> that reads the initial query
// from the URL search params (?q=...). If a query is present we start
// in the `results` state; otherwise the empty hint is shown.

import { useSearchParams } from 'next/navigation';

import { Workbench } from './Workbench';

export function WorkbenchPageClient() {
  const params = useSearchParams();
  const q = params?.get('q') ?? '';
  return (
    <Workbench
      initialQuery={q}
      initialState={q ? 'results' : 'empty'}
    />
  );
}
