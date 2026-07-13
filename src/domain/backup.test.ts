import { describe, expect, it } from 'vitest';
import { serializeBackup } from './backup';

describe('serializeBackup', () => {
  it('returns a portable clone of all table collections', () => {
    const payload = serializeBackup({
      exercises: [{ id: 'e1', name: 'Chest Press', machineNumber: '12', notes: '', createdAt: '', updatedAt: '' }],
      workoutDays: [],
      dayExercises: [],
      sessions: [],
      sessionExercises: [],
      setResults: [],
    });

    expect(payload.exercises).toHaveLength(1);
    expect(payload.exercises[0].name).toBe('Chest Press');
  });
});
