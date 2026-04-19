import { describe, expect, it } from 'vitest';
import { renderChart, renderTable, renderCommentary } from './render';
import { isToolError } from '../types';

// --------- render_chart ---------
describe('render_chart', () => {
  it('happy: line chart with one series returns render_id', () => {
    const r = renderChart({
      chart_type: 'line',
      title: 'Inflation, 2020-2023',
      series: [{
        indicator_id: 'inflation_12month',
        unit: 'percent',
        observations: [{ periodDate: '2023-12-31', value: 2.0 }],
      }],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.render_id).toMatch(/^rnd_/);
    expect(r.chart_type).toBe('line');
    expect(r.series_count).toBe(1);
  });

  it('failure: dual with one series rejects', () => {
    const r = renderChart({
      chart_type: 'dual',
      title: 'x',
      series: [{ indicator_id: 'a', unit: 'percent', observations: [{ periodDate: '2023-12-31', value: 1 }] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('invalid_chart_spec');
  });

  it('failure: dual with identical units rejects', () => {
    const r = renderChart({
      chart_type: 'dual',
      title: 'x',
      series: [
        { indicator_id: 'a', unit: 'percent', observations: [{ periodDate: '2023-12-31', value: 1 }] },
        { indicator_id: 'b', unit: 'percent', observations: [{ periodDate: '2023-12-31', value: 2 }] },
      ],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('invalid_chart_spec');
  });

  it('failure: no_data_to_render when all series are empty', () => {
    const r = renderChart({
      chart_type: 'line',
      title: 'x',
      series: [{ indicator_id: 'a', unit: 'percent', observations: [] }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('no_data_to_render');
  });

  it('edge: warnings flag null values per series', () => {
    const r = renderChart({
      chart_type: 'line',
      title: 'x',
      series: [{
        indicator_id: 'a',
        unit: 'percent',
        observations: [
          { periodDate: '2022-12-31', value: null },
          { periodDate: '2023-12-31', value: 2 },
        ],
      }],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.warnings.some((w) => w.includes('1 null'))).toBe(true);
  });

  it('failure: bar-paired rejects when indicator_ids differ', () => {
    const r = renderChart({
      chart_type: 'bar-paired',
      title: 'x',
      series: [
        { indicator_id: 'rev_actual', unit: 'G$m', observations: [{ periodDate: '2023-12-31', value: 1 }] },
        { indicator_id: 'rev_budget', unit: 'G$m', observations: [{ periodDate: '2023-12-31', value: 2 }] },
      ],
    });
    expect(isToolError(r)).toBe(true);
  });
});

// --------- render_table ---------
describe('render_table', () => {
  it('happy: table with valid columns and rows', () => {
    const r = renderTable({
      title: 't',
      columns: [{ key: 'sector', label: 'Sector' }, { key: 'share', label: 'Share', format: 'percent' }],
      rows: [{ sector: 'mortgages', share: 0.21 }],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.row_count).toBe(1);
  });

  it('failure: unknown column key in row', () => {
    const r = renderTable({
      title: 't',
      columns: [{ key: 'a', label: 'A' }],
      rows: [{ a: 1, b: 2 }],
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('unknown_column_key');
  });

  it('failure: too many rows', () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({ a: i }));
    const r = renderTable({
      title: 't',
      columns: [{ key: 'a', label: 'A' }],
      rows,
    });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('table_too_long');
  });

  it('edge: warns when a column is entirely null', () => {
    const r = renderTable({
      title: 't',
      columns: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }],
      rows: [{ a: 1, b: null }, { a: 2, b: null }],
    });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.warnings.some((w) => w.includes('"b"'))).toBe(true);
  });
});

// --------- render_commentary ---------
describe('render_commentary', () => {
  const goodText = Array(150).fill('Guyanese').join(' ');

  it('happy: clean prose returns word_count and no style warnings', () => {
    const r = renderCommentary({ text: goodText });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.word_count).toBe(150);
    expect(r.style_warnings).toEqual([]);
  });

  it('edge: emdash produces a style warning', () => {
    const r = renderCommentary({ text: 'NRF balance grew sharply \u2014 largely due to oil inflows. ' + goodText });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.style_warnings.some((w) => w.startsWith('emdash'))).toBe(true);
  });

  it('edge: GY$ currency symbol flagged', () => {
    const r = renderCommentary({ text: 'GY$178 billion was reported in 2023. ' + goodText });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.style_warnings.some((w) => w.includes('GY$'))).toBe(true);
  });

  it('edge: "not X, it is Y" construction flagged', () => {
    const r = renderCommentary({ text: 'The NRF is not a stabilization fund, it is a savings vehicle. ' + goodText });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.style_warnings.some((w) => w.includes('not X'))).toBe(true);
  });

  it('failure: empty text', () => {
    const r = renderCommentary({ text: '  ' });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('commentary_empty');
  });

  it('failure: over 400 words', () => {
    const r = renderCommentary({ text: Array(401).fill('word').join(' ') });
    expect(isToolError(r)).toBe(true);
    if (isToolError(r)) expect(r.error).toBe('commentary_too_long');
  });

  it('edge: word count below target band produces a warning', () => {
    const r = renderCommentary({ text: 'Short paragraph about NRF performance this year.', word_count_target: 200 });
    if (isToolError(r)) throw new Error('unexpected');
    expect(r.style_warnings.some((w) => w.includes('below target band'))).toBe(true);
  });
});
