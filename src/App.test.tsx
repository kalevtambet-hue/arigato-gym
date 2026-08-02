import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
});

describe('App shell', () => {
  it('shows the four main navigation tabs in Estonian', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Treening' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kavad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajalugu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rohkem' })).toBeInTheDocument();
  });

  it('routes More to accessible links for exercises and settings', async () => {
    render(
      <MemoryRouter initialEntries={['/rohkem']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Rohkem' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Harjutused/i })).toHaveAttribute('href', '/harjutused');
    expect(screen.getByRole('link', { name: /Seaded/i })).toHaveAttribute('href', '/seaded');
  });

  it('routes the root path to Treening by default', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Valitud päev')).toBeInTheDocument();
  });
});
