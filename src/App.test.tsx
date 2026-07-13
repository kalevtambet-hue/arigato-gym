import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('shows the four main navigation tabs in Estonian', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Harjutused' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tänane treening' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajalugu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seaded' })).toBeInTheDocument();
  });
});
