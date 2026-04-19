// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAgentPanel, PANEL_COOKIE } from './useAgentPanel';

function clearCookie() {
  document.cookie = `${PANEL_COOKIE}=; Max-Age=0; Path=/`;
}

describe('useAgentPanel', () => {
  beforeEach(() => clearCookie());

  it('defaults to open when no cookie is set', () => {
    const { result } = renderHook(() => useAgentPanel('open'));
    expect(result.current.state).toBe('open');
  });

  it('persists a state change to the cookie', () => {
    const { result } = renderHook(() => useAgentPanel('open'));
    act(() => result.current.setState('collapsed'));
    expect(result.current.state).toBe('collapsed');
    expect(document.cookie).toContain(`${PANEL_COOKIE}=collapsed`);
  });

  it('toggle flips between open and collapsed', () => {
    const { result } = renderHook(() => useAgentPanel('open'));
    act(() => result.current.toggle());
    expect(result.current.state).toBe('collapsed');
    act(() => result.current.toggle());
    expect(result.current.state).toBe('open');
  });

  it('reads an existing cookie on mount', () => {
    document.cookie = `${PANEL_COOKIE}=collapsed; Path=/`;
    const { result } = renderHook(() => useAgentPanel('open'));
    expect(result.current.state).toBe('collapsed');
  });
});
