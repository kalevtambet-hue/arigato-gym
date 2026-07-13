import { describe, expect, it } from 'vitest';
import { buildSessionExercises } from './session';

describe('buildSessionExercises', () => {
  it('copies day exercise data into session snapshots', () => {
    const snapshots = buildSessionExercises('session-1', [
      {
        id: 'de1',
        exerciseId: 'e1',
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 45,
        weightStep: 5,
        sortOrder: 0,
      },
    ]);

    expect(snapshots[0].dayExerciseId).toBe('de1');
    expect(snapshots[0].exerciseName).toBe('Chest Press');
    expect(snapshots[0].workoutSessionId).toBe('session-1');
  });
});
