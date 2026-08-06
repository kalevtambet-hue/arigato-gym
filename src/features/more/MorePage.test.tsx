import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MorePage } from './MorePage';

describe('MorePage', () => {
  it('provides the named accessible settings link without duplicating primary navigation', () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Harjutused/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Seaded/i })).toHaveAttribute('href', '/seaded');
  });
});
