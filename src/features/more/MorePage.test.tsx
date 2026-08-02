import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MorePage } from './MorePage';

describe('MorePage', () => {
  it('provides named accessible links to exercises and settings', () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Harjutused/i })).toHaveAttribute('href', '/harjutused');
    expect(screen.getByRole('link', { name: /Seaded/i })).toHaveAttribute('href', '/seaded');
  });
});
