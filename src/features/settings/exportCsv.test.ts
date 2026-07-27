import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './exportCsv';

describe('toCsv', () => {
  it('serializes row objects into CSV text with a header row', () => {
    expect(toCsv([{ name: 'Leg Press', machineNumber: '17' }])).toContain('name,machineNumber');
  });
});

describe('parseCsv', () => {
  it('parses CSV back into row objects', () => {
    const rows = parseCsv('name,machineNumber\nLeg Press,17');
    expect(rows[0]).toEqual({ name: 'Leg Press', machineNumber: '17' });
  });

  it('round-trips exercise event rows with nullable fields', () => {
    const csv = toCsv([
      {
        id: 'event-1',
        exerciseId: 'exercise-1',
        sessionExerciseId: '',
        createdAt: '2026-07-27T10:00:00.000Z',
        type: 'note',
        actor: 'user',
        field: '',
        fromValue: '',
        toValue: '',
        noteText: 'Hoia tempo, ära tõmble',
      },
    ]);

    expect(parseCsv(csv)).toEqual([
      {
        id: 'event-1',
        exerciseId: 'exercise-1',
        sessionExerciseId: '',
        createdAt: '2026-07-27T10:00:00.000Z',
        type: 'note',
        actor: 'user',
        field: '',
        fromValue: '',
        toValue: '',
        noteText: 'Hoia tempo, ära tõmble',
      },
    ]);
  });
});
