// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentaryCard } from './CommentaryCard';

describe('CommentaryCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders prose, optional pullquote, and caveat', () => {
    render(
      <CommentaryCard
        payload={{
          text: 'The NRF balance continued to rise through 2024.',
          pullquote: 'A generational savings vehicle.',
          caveat: 'Figures are actuals through Q4.',
        }}
      />,
    );
    expect(screen.getByText(/NRF balance continued to rise/)).toBeInTheDocument();
    expect(screen.getByText(/A generational savings vehicle/)).toBeInTheDocument();
    expect(screen.getByText(/Figures are actuals/)).toBeInTheDocument();
  });

  it('copy button writes prose (without pullquote / caveat) to clipboard', async () => {
    render(
      <CommentaryCard
        payload={{
          text: 'Plain prose for the minute.',
          pullquote: 'Should not be copied.',
          caveat: 'Also not copied.',
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Copy to briefing/ }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Plain prose for the minute.'));
  });
});
