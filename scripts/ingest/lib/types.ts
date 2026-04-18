import type { WorkSheet } from 'xlsx';

export type Category = 'real_economy' | 'external' | 'prices' | 'monetary' | 'fiscal' | 'debt' | 'social';
export type Frequency = 'annual' | 'quarterly' | 'monthly';
export type Scenario = 'actual' | 'budget' | 'revised' | 'projection';
export type Severity = 'info' | 'warning' | 'error';

export interface IndicatorRecord {
  id: string;
  name: string;
  category: Category;
  subcategory?: string | null;
  unit: string;
  frequency: Frequency;
  source: string;
  sourceTab: string;
  caveat?: string | null;
}

export interface ObservationRecord {
  indicatorId: string;
  periodDate: string; // ISO yyyy-mm-dd
  periodLabel: string;
  value: number | null;
  isEstimate?: boolean;
  scenario?: Scenario;
}

export interface ComparisonTableRecord {
  id: string;
  name: string;
  category?: Category | null;
  source?: string | null;
  sourceTab: string;
  description?: string | null;
  metadata?: unknown;
  rows: ComparisonTableRowRecord[];
}

export interface ComparisonTableRowRecord {
  rowLabel: string;
  groupLabel?: string | null;
  columnLabel: string;
  value?: number | null;
  valueText?: string | null;
  unit?: string | null;
  note?: string | null;
  orderIndex: number;
}

export interface Issue {
  sheet: string;
  row?: number;
  col?: number;
  cellRef?: string;
  rawValue?: string;
  reason: string;
  severity: Severity;
}

export interface RawSheetSnapshot {
  sheetName: string;
  rowCount: number;
  colCount: number;
  cells: unknown; // serialisable (Array<Array<unknown>>)
}

export type Sheet = WorkSheet;

export interface IngestContext {
  workbookPath: string;
  workbookFilename: string;
  caveats: Map<string, string>; // sheet name -> caveat text from List of Sheets
  pushIssue(i: Issue): void;
  indicators: Map<string, IndicatorRecord>;
  observations: ObservationRecord[];
  comparisonTables: ComparisonTableRecord[];
  snapshots: RawSheetSnapshot[];
}
