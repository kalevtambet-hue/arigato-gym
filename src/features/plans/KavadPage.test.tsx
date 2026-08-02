import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { db } from '../../db/appDb';
import { createInMemorySeed } from '../../db/repositories';
import { createId } from '../../lib/id';
import { canDuplicateDay } from './planDetail';

function nowIso() {
  return new Date().toISOString();
}

describe('workout plan routes', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.workoutDays, db.exercises],
      async () => {
        await db.setResults.clear();
        await db.sessionExercises.clear();
        await db.sessions.clear();
        await db.dayExercises.clear();
        await db.workoutDays.clear();
        await db.exercises.clear();
      },
    );
  });

  afterEach(cleanup);

  it('prevents duplication until the day exercise query has loaded', () => {
    expect(canDuplicateDay(undefined)).toBe(false);
    expect(canDuplicateDay([])).toBe(true);
  });

  it('lists workout days at /kavad and opens a selected day on its own route', async () => {
    const seed = createInMemorySeed();
    await db.workoutDays.bulkAdd(seed.workoutDays);

    render(<MemoryRouter initialEntries={['/kavad']}><App /></MemoryRouter>);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Kavad' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /^Päev 1/ })).toHaveAttribute('href', `/kavad/${seed.workoutDays[0].id}`);
    expect(screen.getByRole('button', { name: 'Lisa treeningpäev' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lisa harjutus' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Päev 1/ }));

    expect(await screen.findByRole('heading', { name: 'Päev 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tagasi kavade juurde' })).toHaveAttribute('href', '/kavad');
  });

  it('shows ordered compact rows and expands a selected target editor at /kavad/:dayId', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const firstExerciseId = createId('exercise');
    const secondExerciseId = createId('exercise');

    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.bulkAdd([
      { id: firstExerciseId, name: 'Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp },
      { id: secondExerciseId, name: 'Leg Press', machineNumber: '17', notes: '', createdAt: timestamp, updatedAt: timestamp },
    ]);
    await db.dayExercises.bulkAdd([
      { id: createId('day-exercise'), workoutDayId: seed.workoutDays[0].id, exerciseId: secondExerciseId, sortOrder: 1, targetSets: 4, successesRequired: 1, repMode: 'fixed', targetRepsMin: 8, targetRepsMax: 8, currentWeight: 100, weightStep: 5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp },
      { id: createId('day-exercise'), workoutDayId: seed.workoutDays[0].id, exerciseId: firstExerciseId, sortOrder: 0, targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 60, weightStep: 5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp },
    ]);

    render(<MemoryRouter initialEntries={[`/kavad/${seed.workoutDays[0].id}`]}><App /></MemoryRouter>);
    const user = userEvent.setup();

    const rows = await screen.findAllByTestId('day-exercise-row');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Chest Press'),
      expect.stringContaining('Leg Press'),
    ]);
    expect(rows[0]).toHaveTextContent('Masin #12');
    expect(rows[0]).toHaveTextContent('3 x 10-15 x 60 kg');
    expect(screen.queryByLabelText('Seeriate arv')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ava Chest Press' }));
    expect(await screen.findByLabelText('Seeriate arv')).toBeInTheDocument();
    expect(screen.getByLabelText('Sihi tüüp')).toHaveValue('range');
  });

  it('lists, edits, and deletes base exercises with their notes from /kavad', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');
    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({
      id: exerciseId, name: 'Leg Press', machineNumber: '17', notes: 'Jalad õla laiuselt',
      createdAt: timestamp, updatedAt: timestamp,
    });
    await db.dayExercises.add({
      id: createId('day-exercise'), workoutDayId: seed.workoutDays[0].id, exerciseId, sortOrder: 0,
      targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15,
      currentWeight: 100, weightStep: 5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MemoryRouter initialEntries={['/kavad']}><App /></MemoryRouter>);
    const user = userEvent.setup();

    expect(await screen.findByText('Leg Press')).toBeInTheDocument();
    expect(screen.getByText('Jalad õla laiuselt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Muuda Leg Press' }));
    await user.clear(screen.getByLabelText('Harjutuse nimi'));
    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Hack Squat');
    await user.clear(screen.getByLabelText('Märkus'));
    await user.type(screen.getByLabelText('Märkus'), 'Kontrolli sügavust');
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(await screen.findByText('Hack Squat')).toBeInTheDocument();
    expect(screen.getByText('Kontrolli sügavust')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kustuta Hack Squat' }));

    await waitFor(async () => {
      expect(screen.queryByText('Hack Squat')).not.toBeInTheDocument();
      expect(await db.dayExercises.where('exerciseId').equals(exerciseId).count()).toBe(0);
    });
  });

  it('shows a not-found state for an unknown workout day route', async () => {
    render(<MemoryRouter initialEntries={['/kavad/missing-day']}><App /></MemoryRouter>);

    expect(await screen.findByText('Treeningpäeva ei leitud.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tagasi kavade juurde' })).toHaveAttribute('href', '/kavad');
  });

  it('duplicates loaded exercise rows using only persisted day-exercise fields', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');
    const dayExerciseId = createId('day-exercise');
    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({ id: exerciseId, name: 'Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.dayExercises.add({
      id: dayExerciseId, workoutDayId: seed.workoutDays[0].id, exerciseId, sortOrder: 0,
      targetSets: 3, successesRequired: 2, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15,
      currentWeight: 60, weightStep: 5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp,
    });

    render(<MemoryRouter initialEntries={[`/kavad/${seed.workoutDays[0].id}`]}><App /></MemoryRouter>);
    const user = userEvent.setup();
    await screen.findByTestId('day-exercise-row');
    const duplicate = screen.getByRole('button', { name: 'Duplikeeri päev' });
    expect(duplicate).toBeEnabled();
    await user.click(duplicate);

    await waitFor(async () => {
      expect((await db.workoutDays.toArray()).some((day) => day.name === 'Päev 1 koopia')).toBe(true);
    });
    const copiedDay = (await db.workoutDays.toArray()).find((day) => day.name === 'Päev 1 koopia');
    const copiedRow = (await db.dayExercises.where('workoutDayId').equals(copiedDay!.id).toArray())[0];
    expect(copiedRow).toMatchObject({
      exerciseId, sortOrder: 0, targetSets: 3, successesRequired: 2, repMode: 'range',
      targetRepsMin: 10, targetRepsMax: 15, currentWeight: 60, weightStep: 5, restSeconds: 90,
    });
    expect(copiedRow).not.toHaveProperty('exercise');
  });
});
