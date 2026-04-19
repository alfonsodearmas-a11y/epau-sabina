import { describe, expect, it } from 'vitest';
import { assistantSegments, latestStatus } from './types';

describe('assistantSegments', () => {
  it('merges consecutive text_delta into one segment', () => {
    const segs = assistantSegments([
      { type: 'text_delta', text: 'Hello ' },
      { type: 'text_delta', text: 'Sabina.' },
    ]);
    expect(segs).toEqual([{ kind: 'text', text: 'Hello Sabina.' }]);
  });

  it('breaks text runs on render events', () => {
    const segs = assistantSegments([
      { type: 'text_delta', text: 'Before.' },
      { type: 'render', render_id: 'r1', kind: 'chart', payload: {} },
      { type: 'text_delta', text: 'After.' },
    ]);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: 'text', text: 'Before.' });
    expect(segs[1]!.kind).toBe('render');
    expect(segs[2]).toEqual({ kind: 'text', text: 'After.' });
  });

  it('skips status and tool events from assistant segments', () => {
    const segs = assistantSegments([
      { type: 'status', message: 'Searching…' },
      { type: 'tool_call', tool_name: 'search_catalog', tool_call_id: 't1', input: {} },
      { type: 'tool_result', tool_call_id: 't1', output: {} },
      { type: 'text_delta', text: 'Found it.' },
    ]);
    expect(segs).toEqual([{ kind: 'text', text: 'Found it.' }]);
  });
});

describe('latestStatus', () => {
  it('returns the most recent status before any text_delta or render', () => {
    expect(latestStatus([
      { type: 'status', message: 'A' },
      { type: 'tool_call', tool_name: 'x', tool_call_id: 'x', input: {} },
      { type: 'status', message: 'B' },
    ])).toBe('B');
  });

  it('returns null once text_delta has started', () => {
    expect(latestStatus([
      { type: 'status', message: 'A' },
      { type: 'text_delta', text: 'hi' },
    ])).toBeNull();
  });

  it('returns null when no status events present', () => {
    expect(latestStatus([
      { type: 'tool_call', tool_name: 'x', tool_call_id: 'x', input: {} },
    ])).toBeNull();
  });
});
