import { describe, expect, it } from 'vitest';
import type { SetResultRecord, WorkoutSessionExerciseRecord, WorkoutSessionRecord } from '../db/types';
import { deriveExercisePerformance } from './exercisePerformance';

const exerciseId = 'chest-press';

function session(id: string, performedAt: string, status: WorkoutSessionRecord['status'] = 'completed'): WorkoutSessionRecord {
  return { id, workoutDayId: 'day', performedAt, status, createdAt: performedAt, updatedAt: performedAt };
}

function sessionExercise(id: string, sessionId: string, repMode: WorkoutSessionExerciseRecord['repMode'] = 'range'): WorkoutSessionExerciseRecord {
  return {
    id, workoutSessionId: sessionId, dayExerciseId: 'day-exercise', exerciseId, exerciseName: 'Chest Press', machineNumber: '12',
    targetSets: 3, successesRequired: 2, repMode, targetRepsMin: 8, targetRepsMax: 12, currentWeight: 70, weightStep: 2.5, orderIndex: 0,
  };
}

function result(id: string, workoutSessionExerciseId: string, overrides: Partial<SetResultRecord> = {}): SetResultRecord {
  return {
    id, workoutSessionExerciseId, setNumber: 1, status: 'success', completedReps: 10, usedWeight: 70, ...overrides,
  };
}

describe('deriveExercisePerformance', () => {
  it('derives load PRs from successful work sets with explicit observed loads only', () => {
    const summary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('older', '2026-01-01T10:00:00.000Z'), session('newer', '2026-01-02T10:00:00.000Z')],
      sessionExercises: [sessionExercise('older-exercise', 'older'), sessionExercise('newer-exercise', 'newer')],
      setResults: [
        result('older-load', 'older-exercise', { usedWeight: 80, completedReps: 8 }),
        result('newer-load', 'newer-exercise', { usedWeight: 82.5, completedReps: 6 }),
        result('legacy-null', 'newer-exercise', { setNumber: 2, usedWeight: null, completedReps: 20 }),
        result('failed', 'newer-exercise', { setNumber: 3, status: 'failed', usedWeight: 100, completedReps: 12 }),
      ],
    });

    expect(summary).toMatchObject({
      kind: 'repetition', successfulWorkSetCount: 3, completedSessionCount: 2,
      highestLoad: { value: 82.5, sessionId: 'newer', setResultId: 'newer-load' },
      bestRepsAtHighestLoad: { value: 6, load: 82.5, sessionId: 'newer', setResultId: 'newer-load' },
    });
  });

  it('keeps mixed-load successful work sets as independent evidence and excludes explicit non-work sets', () => {
    const summary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('mixed', '2026-01-03T10:00:00.000Z')],
      sessionExercises: [sessionExercise('mixed-exercise', 'mixed')],
      setResults: [
        result('work-80', 'mixed-exercise', { usedWeight: 80 }),
        result('work-75', 'mixed-exercise', { setNumber: 2, usedWeight: 75 }),
        result('warmup-100', 'mixed-exercise', { setNumber: 3, usedWeight: 100, setKind: 'warmup' }),
      ],
    });

    expect(summary).toMatchObject({ successfulWorkSetCount: 2, highestLoad: { value: 80, setResultId: 'work-80' } });
  });

  it('uses duration values and ignores observed loads for duration exercises', () => {
    const summary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('duration', '2026-01-04T10:00:00.000Z')],
      sessionExercises: [sessionExercise('duration-exercise', 'duration', 'duration-fixed')],
      setResults: [
        result('longest', 'duration-exercise', { completedReps: 75, usedWeight: 999 }),
        result('shorter', 'duration-exercise', { setNumber: 2, completedReps: 60, usedWeight: null }),
      ],
    });

    expect(summary).toMatchObject({
      kind: 'duration', successfulWorkSetCount: 2, completedSessionCount: 1,
      longestDuration: { value: 75, sessionId: 'duration', setResultId: 'longest' },
    });
    expect(summary).not.toHaveProperty('highestLoad');
  });

  it('removes failed sets from PR evidence and admits a corrected successful set', () => {
    const sessions = [session('session', '2026-01-04T10:00:00.000Z')];
    const sessionExercises = [sessionExercise('session-exercise', 'session')];
    const failed = [result('set', 'session-exercise', { status: 'failed', usedWeight: 90 })];
    const corrected = [result('set', 'session-exercise', { status: 'success', usedWeight: 90 })];

    expect(deriveExercisePerformance({ exerciseId, sessions, sessionExercises, setResults: failed })).toBeNull();
    expect(deriveExercisePerformance({ exerciseId, sessions, sessionExercises, setResults: corrected })).toMatchObject({
      highestLoad: { value: 90, setResultId: 'set' },
    });
  });

  it('breaks equal load and repetition ties by latest session then lexicographically later session and set ID', () => {
    const summary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('z-session', '2026-01-05T10:00:00.000Z'), session('a-session', '2026-01-05T10:00:00.000Z'), session('latest', '2026-01-06T10:00:00.000Z')],
      sessionExercises: [sessionExercise('z-exercise', 'z-session'), sessionExercise('a-exercise', 'a-session'), sessionExercise('latest-exercise', 'latest')],
      setResults: [
        result('z-result', 'z-exercise', { usedWeight: 80, completedReps: 10 }),
        result('a-result', 'a-exercise', { usedWeight: 80, completedReps: 10 }),
        result('latest-result', 'latest-exercise', { usedWeight: 80, completedReps: 10 }),
      ],
    });

    expect(summary).toMatchObject({
      highestLoad: { sessionId: 'latest', setResultId: 'latest-result' },
      bestRepsAtHighestLoad: { sessionId: 'latest', setResultId: 'latest-result' },
    });

    const sameTimeSummary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('z-session', '2026-01-05T10:00:00.000Z'), session('a-session', '2026-01-05T10:00:00.000Z')],
      sessionExercises: [sessionExercise('z-exercise', 'z-session'), sessionExercise('a-exercise', 'a-session')],
      setResults: [
        result('z-result', 'z-exercise', { usedWeight: 80, completedReps: 10 }),
        result('a-result', 'a-exercise', { usedWeight: 80, completedReps: 10 }),
      ],
    });
    expect(sameTimeSummary).toMatchObject({ highestLoad: { sessionId: 'z-session', setResultId: 'z-result' } });

    const sameSessionSummary = deriveExercisePerformance({
      exerciseId,
      sessions: [session('session', '2026-01-05T10:00:00.000Z')],
      sessionExercises: [sessionExercise('session-exercise', 'session')],
      setResults: [
        result('a-result', 'session-exercise', { usedWeight: 80, completedReps: 10 }),
        result('z-result', 'session-exercise', { setNumber: 2, usedWeight: 80, completedReps: 10 }),
      ],
    });
    expect(sameSessionSummary).toMatchObject({ highestLoad: { sessionId: 'session', setResultId: 'z-result' } });
  });

  it('does not mutate source arrays or nested records', () => {
    const sessions = [session('session', '2026-01-01T10:00:00.000Z')];
    const sessionExercises = [sessionExercise('session-exercise', 'session')];
    const setResults = [result('set', 'session-exercise')];
    const before = JSON.stringify({ sessions, sessionExercises, setResults });

    deriveExercisePerformance({ exerciseId, sessions, sessionExercises, setResults });

    expect(JSON.stringify({ sessions, sessionExercises, setResults })).toBe(before);
  });
});
