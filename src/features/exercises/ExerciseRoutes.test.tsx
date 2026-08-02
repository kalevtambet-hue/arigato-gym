import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { db } from '../../db/appDb';

const timestamp = '2026-08-02T12:00:00.000Z';

describe('exercise routes', () => {
  beforeEach(async () => {
    await db.transaction('rw', [db.exercises, db.dayExercises], async () => {
      await db.dayExercises.clear();
      await db.exercises.clear();
    });
  });

  afterEach(cleanup);

  it('searches the dedicated exercise list and links each result to its detail route', async () => {
    await db.exercises.bulkAdd([
      { id: 'chest', name: 'Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp },
      { id: 'leg', name: 'Leg Press', machineNumber: '17', notes: '', createdAt: timestamp, updatedAt: timestamp },
    ]);

    render(<MemoryRouter initialEntries={['/harjutused']}><App /></MemoryRouter>);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Otsi harjutust'), 'chest');

    expect(screen.getByRole('link', { name: /Chest Press/ })).toHaveAttribute('href', '/harjutused/chest');
    expect(screen.queryByRole('link', { name: /Leg Press/ })).not.toBeInTheDocument();
  });

  it('shows the exercise details, edits it, and links to its history', async () => {
    await db.exercises.add({
      id: 'leg', name: 'Leg Press', machineNumber: '17', notes: 'Kontrolli sügavust', createdAt: timestamp, updatedAt: timestamp,
    });

    render(<MemoryRouter initialEntries={['/harjutused/leg']}><App /></MemoryRouter>);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Leg Press' })).toBeInTheDocument();
    expect(screen.getByText('Masin #17')).toBeInTheDocument();
    expect(screen.getByText('Kontrolli sügavust')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vaata ajalugu' })).toHaveAttribute('href', '/ajalugu?exerciseId=leg');

    await user.click(screen.getByRole('button', { name: 'Muuda harjutust' }));
    await user.clear(screen.getByLabelText('Harjutuse nimi'));
    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Hack Squat');
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(await screen.findByRole('heading', { name: 'Hack Squat' })).toBeInTheDocument();
  });

  it('handles an unknown exercise route safely', async () => {
    render(<MemoryRouter initialEntries={['/harjutused/puudub']}><App /></MemoryRouter>);

    expect(await screen.findByText('Harjutust ei leitud.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tagasi harjutuste juurde' })).toHaveAttribute('href', '/harjutused');
  });

  it('deletes an exercise and its workout-day assignments from its detail page', async () => {
    await db.exercises.add({ id: 'leg', name: 'Leg Press', machineNumber: '17', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.dayExercises.add({ id: 'assignment', workoutDayId: 'day', exerciseId: 'leg', sortOrder: 0, targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 100, weightStep: 5, restSeconds: 60, createdAt: timestamp, updatedAt: timestamp });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MemoryRouter initialEntries={['/harjutused/leg']}><App /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Kustuta harjutus' }));

    expect(await screen.findByText('Harjutusi veel ei ole.')).toBeInTheDocument();
    expect(await db.dayExercises.count()).toBe(0);
  });
});
