import { cleanup, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('link', { name: 'Harjutused' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajalugu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seaded' })).toBeInTheDocument();
  });

  it('routes More to accessible links for exercises and settings', async () => {
    render(
      <MemoryRouter initialEntries={['/rohkem']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Rohkem' })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('link', { name: /Harjutused/i })).toHaveAttribute('href', '/harjutused');
    expect(within(main).getByRole('link', { name: /Seaded/i })).toHaveAttribute('href', '/seaded');
  });

  it('routes the root path to Treening by default', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Valitud päev')).toBeInTheDocument();
  });

  it('shows the global brand header only on the workout home view', async () => {
    render(
      <MemoryRouter initialEntries={['/treening']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Treeninguabiline' })).toBeInTheDocument();
    expect(screen.getByText('Offline-first PWA')).toBeInTheDocument();

    cleanup();
    render(
      <MemoryRouter initialEntries={['/harjutused']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Harjutused' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Treeninguabiline' })).not.toBeInTheDocument();
    expect(screen.queryByText('Offline-first PWA')).not.toBeInTheDocument();
  });
});
