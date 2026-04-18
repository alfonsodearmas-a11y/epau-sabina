// UI-facing types. These mirror the Prisma schema shapes but use the
// display-friendly labels the prototype uses (Macro / Monthly / etc) so the
// UI can be wired to /api/* later without touching leaf components.

export type IndicatorCategory =
  | 'Macro'
  | 'Prices'
  | 'Fiscal'
  | 'Monetary'
  | 'External'
  | 'Debt'
  | 'Social';

export type Frequency = 'Annual' | 'Quarterly' | 'Monthly';

export type Scenario = 'actual' | 'budget' | 'revised' | 'projection';

export type IssueSeverity = 'high' | 'medium' | 'low';

export interface Indicator {
  id: string;
  name: string;
  category: IndicatorCategory;
  frequency: Frequency;
  latest: string;
  source: string;
  unit: string;
  caveat: string | null;
  sheet: string;
}

export interface Observation {
  indicatorId: string;
  periodDate: string;
  periodLabel: string;
  value: number | null;
  isEstimate: boolean;
  scenario: Scenario;
}

export type SavedViewChart = 'area' | 'line' | 'line-fall' | 'bar-paired' | 'dual';

export interface SavedView {
  id: string;
  name: string;
  query: string;
  indicators: string[];
  last_run: string;
  chart: SavedViewChart;
}

export interface ComparisonGroup {
  label: string;
  span: number;
  sub: string[];
}

export interface ComparisonRow {
  label: string;
  unit: string;
  cells: Array<number | null>;
}

export interface ComparisonTable {
  id: string;
  name: string;
  description: string;
  groups: ComparisonGroup[];
  rows: ComparisonRow[];
}

export interface QuarantineIssue {
  sheet: string;
  cell: string;
  reason: string;
  severity: IssueSeverity;
}

export interface IngestionRun {
  timestamp: string;
  workbook: string;
  workbook_size: string;
  sheets_parsed: number;
  indicators_upserted: number;
  observations_upserted: number;
  duration: string;
  issues_count: number;
  quarantine: QuarantineIssue[];
}

// Series shapes used by the workbench charts.
export interface NrfRow {
  year: string;
  actual: number | null;
  budget: number | null;
}

export interface PscRow {
  year: string;
  business: number;
  mortgages: number;
  households: number;
}

export interface GdpRow {
  year: string;
  overall: number;
  nonoil: number;
}

export interface NplRow {
  q: string;
  npl: number;
}
