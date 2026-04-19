import { newRenderId, type Scenario, type ToolError } from '../types';

export type ChartType = 'area' | 'line' | 'bar' | 'bar-paired' | 'dual' | 'indexed';

export type RenderChartInput = {
  chart_type: ChartType;
  title: string;
  subtitle?: string;
  caveat?: string;
  x_domain?: { start: string; end: string };
  y_format?: 'number' | 'percent' | 'currency_gyd' | 'currency_usd';
  series: Array<{
    indicator_id: string;
    label?: string;
    axis?: 'left' | 'right';
    observations: Array<{ periodDate: string; value: number | null; isEstimate?: boolean; scenario?: Scenario }>;
    unit: string;
  }>;
};

export type RenderChartResult =
  | { render_id: string; chart_type: ChartType; series_count: number; warnings: string[] }
  | ToolError<'invalid_chart_spec' | 'no_data_to_render'>;

const VALID_CHART_TYPES: ChartType[] = ['area', 'line', 'bar', 'bar-paired', 'dual', 'indexed'];

export function renderChart(input: RenderChartInput): RenderChartResult {
  if (!VALID_CHART_TYPES.includes(input.chart_type)) {
    return { error: 'invalid_chart_spec', detail: `unknown chart_type: ${input.chart_type}` };
  }
  if (!input.title?.trim()) {
    return { error: 'invalid_chart_spec', detail: 'title is required' };
  }
  if (!Array.isArray(input.series) || input.series.length === 0) {
    return { error: 'no_data_to_render', detail: 'at least one series is required' };
  }

  const totalPoints = input.series.reduce((s, ser) => s + (ser.observations?.length ?? 0), 0);
  if (totalPoints === 0) {
    return { error: 'no_data_to_render', detail: 'all series have zero observations' };
  }

  if (input.chart_type === 'dual') {
    if (input.series.length !== 2) {
      return { error: 'invalid_chart_spec', detail: 'dual charts require exactly two series' };
    }
    const [a, b] = input.series as [typeof input.series[number], typeof input.series[number]];
    if (a.unit === b.unit) {
      return { error: 'invalid_chart_spec', detail: 'dual charts require two series with different units' };
    }
  }

  if (input.chart_type === 'bar-paired') {
    if (input.series.length !== 2) {
      return { error: 'invalid_chart_spec', detail: 'bar-paired charts require exactly two series' };
    }
    const ids = new Set(input.series.map((s) => s.indicator_id));
    if (ids.size !== 1) {
      return { error: 'invalid_chart_spec', detail: 'bar-paired charts require two series on the same indicator (different scenarios)' };
    }
  }

  const warnings: string[] = [];
  input.series.forEach((ser, i) => {
    const nulls = ser.observations?.filter((o) => o.value === null).length ?? 0;
    if (nulls > 0) warnings.push(`series ${i + 1} (${ser.indicator_id}) has ${nulls} null${nulls === 1 ? '' : 's'}`);
  });

  return {
    render_id: newRenderId(),
    chart_type: input.chart_type,
    series_count: input.series.length,
    warnings,
  };
}

export type TableColumnFormat = 'text' | 'number' | 'percent' | 'currency_gyd' | 'currency_usd' | 'date';

export type RenderTableInput = {
  title: string;
  subtitle?: string;
  caveat?: string;
  columns: Array<{ key: string; label: string; format?: TableColumnFormat; align?: 'left' | 'right' }>;
  rows: Array<Record<string, string | number | null>>;
};

export type RenderTableResult =
  | { render_id: string; row_count: number; warnings: string[] }
  | ToolError<'invalid_table_spec' | 'unknown_column_key' | 'table_too_long'>;

const MAX_TABLE_ROWS = 200;

export function renderTable(input: RenderTableInput): RenderTableResult {
  if (!input.title?.trim()) return { error: 'invalid_table_spec', detail: 'title is required' };
  if (!Array.isArray(input.columns) || input.columns.length === 0) {
    return { error: 'invalid_table_spec', detail: 'at least one column is required' };
  }
  if (!Array.isArray(input.rows)) {
    return { error: 'invalid_table_spec', detail: 'rows must be an array' };
  }
  if (input.rows.length > MAX_TABLE_ROWS) {
    return { error: 'table_too_long', count: input.rows.length, limit: MAX_TABLE_ROWS };
  }

  const colKeys = new Set(input.columns.map((c) => c.key));
  const nullsPerCol = new Map<string, number>();
  for (const row of input.rows) {
    for (const k of Object.keys(row)) {
      if (!colKeys.has(k)) return { error: 'unknown_column_key', key: k };
    }
    for (const c of input.columns) {
      if (row[c.key] === null || row[c.key] === undefined) {
        nullsPerCol.set(c.key, (nullsPerCol.get(c.key) ?? 0) + 1);
      }
    }
  }

  const warnings: string[] = [];
  nullsPerCol.forEach((count, key) => {
    if (count === input.rows.length && input.rows.length > 0) {
      warnings.push(`column "${key}" is empty in every row`);
    }
  });

  return { render_id: newRenderId(), row_count: input.rows.length, warnings };
}

export type RenderCommentaryInput = {
  text: string;
  pullquote?: string;
  caveat?: string;
  word_count_target?: number;
};

export type RenderCommentaryResult =
  | { render_id: string; word_count: number; style_warnings: string[] }
  | ToolError<'commentary_empty' | 'commentary_too_long'>;

const MAX_COMMENTARY_WORDS = 400;

export function renderCommentary(input: RenderCommentaryInput): RenderCommentaryResult {
  const text = (input.text ?? '').trim();
  if (!text) return { error: 'commentary_empty' };

  const count = text.split(/\s+/).filter(Boolean).length;
  if (count > MAX_COMMENTARY_WORDS) return { error: 'commentary_too_long', word_count: count, limit: MAX_COMMENTARY_WORDS };

  const style_warnings = lintHouseStyle(text, count, input.word_count_target ?? 150);
  return { render_id: newRenderId(), word_count: count, style_warnings };
}

function lintHouseStyle(text: string, wordCount: number, target: number): string[] {
  const warnings: string[] = [];

  if (/[\u2014]/.test(text)) warnings.push('emdash detected (use commas, semicolons, or new sentences)');

  if (/\bnot\s+[^,.]{1,60},\s*it\s+is\b/i.test(text)) {
    warnings.push('"not X, it is Y" construction detected');
  }

  if (/\b(1|2)\d,\d{3}\b/.test(text)) warnings.push('year appears comma-formatted');

  if (/\bG[yY]\$/.test(text)) warnings.push('GY$ / Gy$ seen; house style is G$');

  const low = Math.max(80, Math.round(target * 0.7));
  const high = Math.min(250, Math.round(target * 1.3));
  if (wordCount < low) warnings.push(`word count ${wordCount} below target band (${low}-${high})`);
  if (wordCount > high) warnings.push(`word count ${wordCount} above target band (${low}-${high})`);

  return warnings;
}
