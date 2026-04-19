import { describe, expect, it, vi } from 'vitest';
import { createSseParser } from './parseSse';

describe('createSseParser', () => {
  it('parses a single full event', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);
    parser.push('event: session\ndata: {"type":"session","session_id":"abc","turn_index":0}\n\n');
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'session', session_id: 'abc', turn_index: 0 });
  });

  it('assembles events split across chunks', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);
    parser.push('event: text_delta\ndata: {"type":"text_d');
    expect(onEvent).not.toHaveBeenCalled();
    parser.push('elta","text":"hello"}\n\n');
    expect(onEvent).toHaveBeenCalledWith({ type: 'text_delta', text: 'hello' });
  });

  it('emits multiple events in one push', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);
    parser.push(
      'event: status\ndata: {"type":"status","message":"A"}\n\n' +
      'event: status\ndata: {"type":"status","message":"B"}\n\n',
    );
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('ignores malformed events silently', () => {
    const onEvent = vi.fn();
    const parser = createSseParser(onEvent);
    parser.push('event: bogus\ndata: {not-json}\n\n');
    parser.push('event: status\ndata: {"type":"status","message":"ok"}\n\n');
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'status', message: 'ok' });
  });
});
