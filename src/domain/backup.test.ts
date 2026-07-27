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
      exerciseEvents: [
        {
          id: 'event-1',
          exerciseId: 'e1',
          sessionExerciseId: null,
          createdAt: '2026-07-27T10:00:00.000Z',
          type: 'note',
          actor: 'user',
          field: null,
          fromValue: null,
          toValue: null,
          noteText: 'Tempo kontrolli all',
        },
      ],
    });

    expect(payload.exercises).toHaveLength(1);
    expect(payload.exercises[0].name).toBe('Chest Press');
    expect(payload.exerciseEvents[0].noteText).toBe('Tempo kontrolli all');
  });
});
