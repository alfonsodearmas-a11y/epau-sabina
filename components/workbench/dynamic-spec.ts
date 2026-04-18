// DynamicSpec — a live, data-driven replacement for the prototype's canned Spec.
// Built at query time from Indicator metadata + Observation arrays; see
// lib/workbench-spec.ts for the builder.

import type { Caveat } from './CaveatsPanel';
import type { SeriesDef } from './charts/GenericChart';

export interface DynamicHeadline {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaLabel: string;
}

export interface DynamicIndicator {
  id: string;
  name: string;
  unit: string;
  source: string;
  sheet: string;
  color: string;
  caveat: string | null;
}

export interface DynamicSpec {
  title: string;
  subtitle: string;
  indicators: DynamicIndicator[];
  caveats: Caveat[];
  headline: DynamicHeadline;
  data: Array<Record<string, string | number | null>>;
  series: SeriesDef[];
  xKey: string;
  chartType: 'area' | 'line' | 'bar';
  tableMode: boolean;
  table: string[];
  tableLabels: Record<string, string>;
  observationCount: number;
  percent: boolean;
  commentary: string | null;
}
