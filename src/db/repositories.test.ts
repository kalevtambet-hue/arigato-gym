import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './appDb';
import * as repositories from './repositories';

const { createInMemorySeed, ensureSeedData, importBackup } = repositories;

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

  it('imports exercise events and preserves actor metadata', async () => {
    const seed = createInMemorySeed();

    await importBackup({
      ...seed,
      exerciseEvents: [
        {
          id: 'event-1',
          exerciseId: 'exercise-1',
          sessionExerciseId: null,
          createdAt: '2026-07-27T10:00:00.000Z',
          type: 'note',
          actor: 'user',
          field: null,
          fromValue: null,
          toValue: null,
          noteText: 'Hoia küünarnukid all',
        },
      ],
    });

    const events = await db.exerciseEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: 'user',
      noteText: 'Hoia küünarnukid all',
    });
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

  it('marks an active session partial while retaining saved sets and progression targets', async () => {
    const createdAt = '2026-08-02T10:00:00.000Z';
    await db.sessions.add({
      id: 'session-1',
      workoutDayId: 'day-1',
      performedAt: createdAt,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    });
    await db.dayExercises.add({
      id: 'day-exercise-1',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-1',
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 1,
      repMode: 'fixed',
      targetRepsMin: 10,
      targetRepsMax: 10,
      currentWeight: 50,
      weightStep: 5,
      restSeconds: 90,
      createdAt,
      updatedAt: createdAt,
    });
    await db.sessionExercises.add({
      id: 'session-exercise-1',
      workoutSessionId: 'session-1',
      dayExerciseId: 'day-exercise-1',
      exerciseName: 'Press',
      machineNumber: '1',
      targetSets: 3,
      successesRequired: 1,
      repMode: 'fixed',
      targetRepsMin: 10,
      targetRepsMax: 10,
      currentWeight: 50,
      weightStep: 5,
      orderIndex: 0,
      performedOrder: 0,
    });
    await db.setResults.add({
      id: 'set-1',
      workoutSessionExerciseId: 'session-exercise-1',
      setNumber: 1,
      status: 'success',
      completedReps: 10,
      usedWeight: 50,
    });

    await repositories.completeSessionPartially('session-1');

    const partialSession = await db.sessions.get('session-1');
    expect(partialSession).toMatchObject({ status: 'partial' });
    expect(partialSession?.updatedAt).not.toBe(createdAt);
    expect(await db.setResults.toArray()).toEqual([
      expect.objectContaining({ id: 'set-1', status: 'success', completedReps: 10, usedWeight: 50 }),
    ]);
    expect(await db.dayExercises.get('day-exercise-1')).toMatchObject({
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 10,
      currentWeight: 50,
      updatedAt: createdAt,
    });
  });
});
