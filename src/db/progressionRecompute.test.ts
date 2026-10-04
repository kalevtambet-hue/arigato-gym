import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './appDb';
import { correctHistoricalSetResult } from './progressionRecompute';

describe('correctHistoricalSetResult', () => {
  beforeEach(async () => {
    await db.transaction('rw', [db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.workoutDays], async () => {
      await Promise.all([db.setResults.clear(), db.sessionExercises.clear(), db.sessions.clear(), db.dayExercises.clear(), db.workoutDays.clear()]);
    });
  });

  afterEach(async () => {
    await db.transaction('rw', [db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.workoutDays], async () => {
      await Promise.all([db.setResults.clear(), db.sessionExercises.clear(), db.sessions.clear(), db.dayExercises.clear(), db.workoutDays.clear()]);
    });
  });

  async function addCompletedSession(params: { sessionId: string; sessionExerciseId: string; dayExerciseId: string; performedAt: string }) {
    const { sessionId, sessionExerciseId, dayExerciseId, performedAt } = params;
    await db.sessions.add({
      id: sessionId, workoutDayId: 'day', performedAt, status: 'completed', createdAt: performedAt, updatedAt: performedAt,
    });
    await db.sessionExercises.add({
      id: sessionExerciseId, workoutSessionId: sessionId, dayExerciseId, exerciseName: 'Chest Press', machineNumber: '12',
      targetSets: 3, successesRequired: 2, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15,
      currentWeight: 80, weightStep: 2.5, orderIndex: 0,
    });
    await db.setResults.bulkAdd([1, 2, 3].map((setNumber) => ({
      id: `${sessionExerciseId}-${setNumber}`, workoutSessionExerciseId: sessionExerciseId, setNumber,
      status: 'success' as const, completedReps: 15, usedWeight: 80,
    })));
  }

  it('corrects a completed set and atomically recomputes only its linked day-exercise target', async () => {
    const timestamp = '2026-01-01T10:00:00.000Z';
    await db.workoutDays.add({ id: 'day', name: 'Päev', notes: '', sortOrder: 0, isArchived: false, createdAt: timestamp, updatedAt: timestamp });
    await db.dayExercises.bulkAdd([
      { id: 'owner-a', workoutDayId: 'day', exerciseId: 'same-exercise', sortOrder: 0, targetSets: 3, successesRequired: 2, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 82.5, weightStep: 2.5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp },
      { id: 'owner-b', workoutDayId: 'day', exerciseId: 'same-exercise', sortOrder: 1, targetSets: 3, successesRequired: 2, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 60, weightStep: 2.5, restSeconds: 90, createdAt: timestamp, updatedAt: timestamp },
    ]);
    await addCompletedSession({ sessionId: 'session-a1', sessionExerciseId: 'session-exercise-a1', dayExerciseId: 'owner-a', performedAt: '2026-01-01T10:00:00.000Z' });
    await addCompletedSession({ sessionId: 'session-a2', sessionExerciseId: 'session-exercise-a2', dayExerciseId: 'owner-a', performedAt: '2026-01-02T10:00:00.000Z' });

    await correctHistoricalSetResult('session-exercise-a1-1', { status: 'failed', completedReps: 12 });

    expect(await db.setResults.get('session-exercise-a1-1')).toMatchObject({ status: 'failed', completedReps: 12 });
    expect(await db.dayExercises.get('owner-a')).toMatchObject({ currentWeight: 80 });
    expect(await db.dayExercises.get('owner-b')).toMatchObject({ currentWeight: 60 });
  });

  it('rolls back a correction when its linked progression owner is missing', async () => {
    await addCompletedSession({ sessionId: 'orphan-session', sessionExerciseId: 'orphan-exercise', dayExerciseId: 'missing-owner', performedAt: '2026-01-01T10:00:00.000Z' });

    await expect(correctHistoricalSetResult('orphan-exercise-1', { status: 'failed', completedReps: 12 })).rejects.toThrow('Progression owner');
    expect(await db.setResults.get('orphan-exercise-1')).toMatchObject({ status: 'success', completedReps: 15 });
  });
});
