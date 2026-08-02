import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from './appDb';

const schemaV6 = {
  exercises: 'id, name, machineNumber, updatedAt',
  workoutDays: 'id, sortOrder, isArchived, updatedAt',
  dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
  sessions: 'id, workoutDayId, status, performedAt',
  sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex, performedOrder',
  setResults: 'id, workoutSessionExerciseId, setNumber',
  exerciseEvents: 'id, exerciseId, createdAt, type, actor',
};

describe('AppDb v7 migration', () => {
  afterEach(async () => {
    db.close();
    await Dexie.delete('gym-log-db');
    await db.open();
  });

  it('backfills session exercise identity from its persisted day exercise', async () => {
    db.close();
    await Dexie.delete('gym-log-db');
    const legacyDb = new Dexie('gym-log-db');
    legacyDb.version(6).stores(schemaV6);
    await legacyDb.open();
    await legacyDb.table('dayExercises').add({ id: 'day-exercise', exerciseId: 'exercise-a' });
    await legacyDb.table('sessionExercises').add({ id: 'session-exercise', dayExerciseId: 'day-exercise' });
    legacyDb.close();

    await db.open();

    expect((await db.sessionExercises.get('session-exercise'))?.exerciseId).toBe('exercise-a');
    await db.dayExercises.delete('day-exercise');
    expect((await db.sessionExercises.get('session-exercise'))?.exerciseId).toBe('exercise-a');
  });
});
