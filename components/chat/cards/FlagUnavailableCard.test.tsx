// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlagUnavailableCard } from './FlagUnavailableCard';

const payload = {
  reason: 'The Gini coefficient for Guyana is not available in the EPAU workbook.',
  missing: [{
    requested: 'Gini coefficient for Guyana',
    closest_available: [
      { indicator_id: 'minimum_wage_gyd', why: 'Policy rate, not distributional.' },
    ],
  }],
  searched: [
    { tool: 'search_catalog' as const, query: 'Gini coefficient', top_hits: [] },
    { tool: 'search_catalog' as const, query: 'inequality income', top_hits: ['fdi_manufacturing_distribution'] },
  ],
};

describe('FlagUnavailableCard', () => {
  it('renders the request, reason, and closest_available', () => {
    render(<FlagUnavailableCard payload={payload} />);
    expect(screen.getByRole('heading', { name: /Gini coefficient for Guyana/ })).toBeInTheDocument();
    expect(screen.getByText(/not available in the EPAU workbook/)).toBeInTheDocument();
    expect(screen.getByText('minimum_wage_gyd')).toBeInTheDocument();
    expect(screen.getByText(/Policy rate, not distributional/)).toBeInTheDocument();
  });

  it('searched disclosure starts collapsed; opens on click', () => {
    render(<FlagUnavailableCard payload={payload} />);
    const toggle = screen.getByRole('button', { name: /See what I searched/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/inequality income/)).toBeInTheDocument();
    expect(screen.getByText('fdi_manufacturing_distribution')).toBeInTheDocument();
  });

  it('fires onAlternativeClick with indicator_id when a closest-available row is clicked', () => {
    const spy = vi.fn();
    render(<FlagUnavailableCard payload={payload} onAlternativeClick={spy} />);
    fireEvent.click(screen.getByText('minimum_wage_gyd').closest('button')!);
    expect(spy).toHaveBeenCalledWith('minimum_wage_gyd', undefined);
  });

  it('does not render suggested_alternatives even when present in payload', () => {
    const leakyPayload = {
      ...payload,
      // This field is on the tool-input type but the card intentionally drops it.
      suggested_alternatives: ['Consult the IMF or World Bank'],
    } as never;
    render(<FlagUnavailableCard payload={leakyPayload} />);
    expect(screen.queryByText(/IMF/)).not.toBeInTheDocument();
    expect(screen.queryByText(/World Bank/)).not.toBeInTheDocument();
  });
});
