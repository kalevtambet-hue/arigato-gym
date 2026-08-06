import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../db/appDb';
import { createId } from '../lib/id';
import { BottomNav } from './BottomNav';

function nowIso() {
  return new Date().toISOString();
}

describe('BottomNav', () => {
  beforeEach(async () => {
    await db.transaction('rw', [db.sessions, db.workoutDays], async () => {
      await db.sessions.clear();
      await db.workoutDays.clear();
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows an active-workout indicator on the training tab', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessions.add({
      id: createId('session'),
      workoutDayId: dayId,
      performedAt: timestamp,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(
      <MemoryRouter initialEntries={['/kavad']}>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Aktiivne treening')).toBeInTheDocument();
  });

  it('keeps workout planning directly discoverable and moves settings under more', () => {
    render(
      <MemoryRouter initialEntries={['/treening']}>
        <BottomNav />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');

    expect(links).toHaveLength(5);
    expect(links.map((link) => link.textContent)).toEqual([
      'Treening',
      'Kavad',
      'Harjutused',
      'Ajalugu',
      'Veel',
    ]);
    expect(screen.getByRole('link', { name: 'Kavad' })).toHaveAttribute('href', '/kavad');
    expect(screen.getByRole('link', { name: 'Veel' })).toHaveAttribute('href', '/rohkem');
  });
});
