// The shape of a resolved workbench "spec" — headline, indicators,
// caveats, chart data and table mapping — ported from the switch inside
// ResultsPanel in docs/design/workbench.jsx.

import type { ReactNode } from 'react';
import type { Caveat } from './CaveatsPanel';

export interface SpecIndicator {
  id: string;
  name: string;
  unit: string;
  source: string;
  color: string;
}

export interface SpecHeadline {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaLabel: string;
}

// A row is an object keyed by the table column ids. We keep the generic
// loose on purpose so each spec can add its own keys; accesses are guarded
// by the spec's `table` field.
export type SpecRow = Record<string, string | number | null>;

export interface Spec {
  kind: 'psc' | 'nrf' | 'gdp' | 'npl';
  title: string;
  subtitle: string;
  indicators: SpecIndicator[];
  caveats: Caveat[];
  headline: SpecHeadline;
  data: SpecRow[];
  render: (data: SpecRow[]) => ReactNode;
  table: string[];
  tableLabels: Record<string, string>;
  commentary: string;
}

export type ViewKind = Spec['kind'];
export type ChartType = 'area' | 'line' | 'bar' | 'table';

export interface ViewState {
  kind: ViewKind;
  chart: ChartType;
}
