import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { createInMemorySeed } from '../../db/repositories';
import { createId } from '../../lib/id';
import { ExercisesPage } from './ExercisesPage';

function nowIso() {
  return new Date().toISOString();
}

describe('ExercisesPage', () => {
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

    expect(await screen.findByText('Leg Press')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kustuta' }));

    await waitFor(async () => {
      expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();
      expect(await db.dayExercises.where('exerciseId').equals(exerciseId).count()).toBe(0);
    });
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

    await user.click(await screen.findByRole('button', { name: 'Päev 1' }));

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
});
