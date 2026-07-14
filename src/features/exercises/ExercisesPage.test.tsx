import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/appDb';
import { createInMemorySeed } from '../../db/repositories';
import { createId } from '../../lib/id';
import { ExercisesPage } from './ExercisesPage';

function nowIso() {
  return new Date().toISOString();
}

describe('ExercisesPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

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

  it('deletes a base exercise and its linked day exercise rows', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');

    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({
      id: exerciseId,
      name: 'Leg Press',
      machineNumber: '17',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.dayExercises.add({
      id: createId('day-exercise'),
      workoutDayId: seed.workoutDays[0].id,
      exerciseId,
      sortOrder: 0,
      targetSets: 3,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 100,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<ExercisesPage />);
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    expect(await screen.findByText('Leg Press')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kustuta Leg Press' }));

    await waitFor(async () => {
      expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();
      expect(await db.dayExercises.where('exerciseId').equals(exerciseId).count()).toBe(0);
    });
  });

  it('edits a base exercise', async () => {
    const timestamp = nowIso();
    const exerciseId = createId('exercise');

    await db.exercises.add({
      id: exerciseId,
      name: 'Leg Press',
      machineNumber: '17',
      notes: 'vana',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<ExercisesPage />);
    const user = userEvent.setup();

    expect(await screen.findByText('Leg Press')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Muuda Leg Press' }));
    await user.clear(screen.getByLabelText('Harjutuse nimi'));
    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Hack Squat');
    await user.clear(screen.getByLabelText('Märkus'));
    await user.type(screen.getByLabelText('Märkus'), 'uus märkus');
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(await screen.findByText('Hack Squat')).toBeInTheDocument();
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();
  });

  it('shows a single reps field when rep mode is fixed', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');

    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.dayExercises.add({
      id: createId('day-exercise'),
      workoutDayId: seed.workoutDays[0].id,
      exerciseId,
      sortOrder: 0,
      targetSets: 3,
      repMode: 'fixed',
      targetRepsMin: 12,
      targetRepsMax: 12,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Päev 1' }))[0]);

    expect(await screen.findByLabelText('Kordused')).toBeInTheDocument();
    expect(screen.queryByLabelText('Min kordused')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Max kordused')).not.toBeInTheDocument();
  });

  it('renames a workout day', async () => {
    const seed = createInMemorySeed();
    await db.workoutDays.bulkAdd(seed.workoutDays);

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Päev 1' }));
    const nameInput = await screen.findByLabelText('Päeva nimi');

    await user.clear(nameInput);
    await user.type(nameInput, 'Ülakeha');
    await user.click(screen.getByRole('button', { name: 'Salvesta nimi' }));

    expect(await screen.findByRole('button', { name: 'Ülakeha' })).toBeInTheDocument();
  });

  it('duplicates a workout day with its exercises', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');

    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.dayExercises.add({
      id: createId('day-exercise'),
      workoutDayId: seed.workoutDays[0].id,
      exerciseId,
      sortOrder: 0,
      targetSets: 3,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Päev 1' }))[0]);
    await user.click(screen.getByRole('button', { name: 'Duplikeeri päev' }));

    expect(await screen.findByRole('button', { name: 'Päev 1 koopia' })).toBeInTheDocument();
    const copiedDay = (await db.workoutDays.toArray()).find((day) => day.name === 'Päev 1 koopia');
    expect(copiedDay).toBeTruthy();
    expect(await db.dayExercises.where('workoutDayId').equals(copiedDay!.id).count()).toBe(1);
  });

  it('allows adding the same base exercise to a workout day twice', async () => {
    const seed = createInMemorySeed();
    const timestamp = nowIso();
    const exerciseId = createId('exercise');

    await db.workoutDays.bulkAdd(seed.workoutDays);
    await db.exercises.add({
      id: exerciseId,
      name: 'Ellips',
      machineNumber: '',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Päev 1' }))[0]);

    const selector = await screen.findByRole('combobox');
    await user.selectOptions(selector, exerciseId);
    await user.click(screen.getByRole('button', { name: 'Lisa päeva' }));

    await waitFor(async () => {
      expect(await db.dayExercises.where('workoutDayId').equals(seed.workoutDays[0].id).count()).toBe(1);
    });

    await user.selectOptions(selector, exerciseId);
    await user.click(screen.getByRole('button', { name: 'Lisa päeva' }));

    await waitFor(async () => {
      expect(await db.dayExercises.where('workoutDayId').equals(seed.workoutDays[0].id).count()).toBe(2);
    });

    expect((await db.dayExercises.where('exerciseId').equals(exerciseId).toArray())).toHaveLength(2);
  });

  it('deletes a workout day after confirmation', async () => {
    const seed = createInMemorySeed();
    await db.workoutDays.bulkAdd(seed.workoutDays);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Päev 1' }))[0]);
    await user.click(screen.getByRole('button', { name: 'Kustuta päev' }));

    await waitFor(async () => {
      expect(screen.queryByRole('button', { name: 'Päev 1' })).not.toBeInTheDocument();
      expect((await db.workoutDays.toArray()).filter((day) => day.name === 'Päev 1')).toHaveLength(0);
    });

  });

  it('saves a workout day note', async () => {
    const seed = createInMemorySeed();
    await db.workoutDays.bulkAdd(seed.workoutDays);

    render(<ExercisesPage />);
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Päev 1' }))[0]);
    await user.type(screen.getByLabelText('Päeva märkus'), 'Õlale rahulik tempo');
    await user.click(screen.getByRole('button', { name: 'Salvesta nimi' }));

    const updatedDay = (await db.workoutDays.toArray()).find((day) => day.name === 'Päev 1');
    expect(updatedDay?.notes).toBe('Õlale rahulik tempo');
  });
});
