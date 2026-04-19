// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableCard } from './TableCard';

describe('TableCard', () => {
  it('renders columns and rows with null dash', () => {
    render(
      <TableCard
        payload={{
          title: 'Private sector credit shifts',
          subtitle: '2015 → 2023',
          columns: [
            { key: 'sector', label: 'Sector' },
            { key: 'share_2015', label: '2015', format: 'percent' },
            { key: 'share_latest', label: 'Latest', format: 'percent' },
          ],
          rows: [
            { sector: 'Households', share_2015: 0.24, share_latest: 0.29 },
            { sector: 'Mining',     share_2015: 0.14, share_latest: null },
          ],
        }}
      />,
    );
    expect(screen.getByText('Private sector credit shifts')).toBeInTheDocument();
    expect(screen.getByText('Households')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders caveat when present', () => {
    render(
      <TableCard
        payload={{
          title: 't',
          columns: [{ key: 'a', label: 'A' }],
          rows: [{ a: 'x' }],
          caveat: 'Shares may not sum to 100 due to rounding.',
        }}
      />,
    );
    expect(screen.getByText(/Shares may not sum to 100/)).toBeInTheDocument();
  });

  it('exposes a table role', () => {
    render(
      <TableCard payload={{ title: 'T', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 'x' }] }} />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
