import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  afterEach(async () => {
    await db.delete();
    db.close();
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
});
