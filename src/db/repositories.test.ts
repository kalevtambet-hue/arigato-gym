import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './appDb';
import { createInMemorySeed, ensureSeedData, importBackup } from './repositories';

describe('createInMemorySeed', () => {
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

  it('creates starter workout days for a new user', () => {
    const seed = createInMemorySeed();
    expect(seed.workoutDays.map((day) => day.name)).toEqual(['Päev 1', 'Päev 2']);
  });

  it('defaults usedWeight to null for imported set results that do not include it', async () => {
    const seed = createInMemorySeed();

    await importBackup({
      ...seed,
      setResults: [
        {
          id: 'set-1',
          workoutSessionExerciseId: 'session-exercise-1',
          setNumber: 1,
          status: 'success',
          completedReps: 12,
        },
      ] as unknown as typeof seed.setResults,
    });

    expect((await db.setResults.get('set-1'))?.usedWeight).toBeNull();
  });

  it('creates default workout days only once even if initialization runs concurrently', async () => {
    await Promise.all([
      ensureSeedData(),
      ensureSeedData(),
      ensureSeedData(),
      ensureSeedData(),
    ]);

    const days = await db.workoutDays.orderBy('sortOrder').toArray();

    expect(days).toHaveLength(2);
    expect(days.map((day) => day.name)).toEqual(['Päev 1', 'Päev 2']);
  });
});
