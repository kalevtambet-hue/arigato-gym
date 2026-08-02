import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from './appDb';

const databaseName = 'gym-log-db';
const v6Stores = {
  exercises: 'id, name, machineNumber, updatedAt',
  workoutDays: 'id, sortOrder, isArchived, updatedAt',
  dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
  sessions: 'id, workoutDayId, status, performedAt',
  sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex, performedOrder',
  setResults: 'id, workoutSessionExerciseId, setNumber',
  exerciseEvents: 'id, exerciseId, createdAt, type, actor',
};

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('AppDb migrations', () => {
  it('adds progression defaults and backfills exercise identity when upgrading v6 data', async () => {
    db.close();
    await db.delete();

    const legacy = new Dexie(databaseName);
    legacy.version(6).stores(v6Stores);
    await legacy.open();
    await legacy.table('exercises').add({
      id: 'exercise-1',
      name: 'Chest press',
      machineNumber: '',
      notes: '',
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
    });
    await legacy.table('sessionExercises').add({
      id: 'session-exercise-1',
      workoutSessionId: 'session-1',
      dayExerciseId: 'day-exercise-1',
      exerciseName: 'Chest press',
      machineNumber: '',
      targetSets: 3,
      successesRequired: 1,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 12,
      currentWeight: 40,
      weightStep: 5,
      orderIndex: 0,
      performedOrder: null,
    });
    await legacy.table('dayExercises').add({
      id: 'day-exercise-1',
      exerciseId: 'exercise-1',
    });
    legacy.close();

    await db.open();

    expect(await db.exercises.get('exercise-1')).toMatchObject({
      primaryTargetGroup: '',
      secondaryTargetGroups: [],
    });
    expect(await db.sessionExercises.get('session-exercise-1')).toMatchObject({
      exerciseId: 'exercise-1',
      primaryTargetGroup: '',
      secondaryTargetGroups: [],
    });
    expect(db.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(['sessionSnapshots', 'setResultRevisions', 'auditEvents']),
    );
  });
});
