import { describe, expect, it } from 'vitest';
import {
  addDayExercise,
  addExercise,
  addWorkoutDay,
  parseBackup,
  removeDayExercise,
  removeExercise,
  removeWorkoutDay,
  updateDayExercise,
  updateExercise,
  updateWorkoutDay,
  validateBackup,
} from './backupModel';

const sourceBackup = {
  exercises: [
    {
      id: 'exercise-1',
      name: 'Kükk',
      machineNumber: 'R1',
      notes: 'Sügavus',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  workoutDays: [
    {
      id: 'day-1',
      name: 'Esmaspäev',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  dayExercises: [
    {
      id: 'day-exercise-1',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-1',
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 8,
      targetRepsMax: 10,
      currentWeight: 50,
      weightStep: 2.5,
      restSeconds: 90,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  sessions: [{ id: 'session-1', workoutDayId: 'day-1' }],
  sessionExercises: [{ id: 'session-exercise-1', exerciseId: 'exercise-1' }],
  setResults: [{ id: 'set-1', workoutSessionExerciseId: 'session-exercise-1' }],
  exerciseEvents: [{ id: 'event-1', exerciseId: 'exercise-1' }],
  futureField: { keep: true },
};

function backup() {
  return parseBackup(JSON.stringify(sourceBackup));
}

describe('backup editor model', () => {
  it('parses a backup while preserving unknown top-level and historical fields', () => {
    const parsed = backup();

    expect(parsed.futureField).toEqual({ keep: true });
    expect(parsed.sessions).toEqual(sourceBackup.sessions);
    expect(parsed.sessionExercises).toEqual(sourceBackup.sessionExercises);
    expect(parsed.setResults).toEqual(sourceBackup.setResults);
    expect(parsed.exerciseEvents).toEqual(sourceBackup.exerciseEvents);
  });

  it('accepts older backups that do not yet include exercise events', () => {
    const legacyBackup = structuredClone(sourceBackup);
    delete (legacyBackup as Partial<typeof sourceBackup>).exerciseEvents;

    const parsed = parseBackup(JSON.stringify(legacyBackup));

    expect(parsed.exerciseEvents).toEqual([]);
    expect(parsed.exercises).toEqual(sourceBackup.exercises);
  });

  it('rejects malformed or structurally incomplete backup JSON', () => {
    expect(() => parseBackup('{')).toThrow('JSON');
    expect(() => parseBackup(JSON.stringify({ exercises: [] }))).toThrow('workoutDays');
  });

  it('validates references and numeric exercise targets', () => {
    const invalid = backup();
    invalid.dayExercises[0].exerciseId = 'missing';
    invalid.dayExercises[0].targetRepsMin = 12;
    invalid.dayExercises[0].targetRepsMax = 8;

    expect(validateBackup(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('harjutusele'),
        expect.stringContaining('korduste'),
      ]),
    );
  });

  it('blocks saving duplicate IDs and blank exercise or training-day names', () => {
    const invalid = backup();
    invalid.exercises.push({ ...invalid.exercises[0] });
    invalid.workoutDays[0].name = '   ';
    invalid.dayExercises.push({ ...invalid.dayExercises[0] });

    expect(validateBackup(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dubleerub'),
        expect.stringContaining('nimi puudub'),
      ]),
    );
  });

  it('blocks duplicate historical record IDs before mobile bulk import', () => {
    const invalid = backup();
    invalid.sessions.push({ ...invalid.sessions[0] });
    invalid.sessionExercises.push({ ...invalid.sessionExercises[0] });
    invalid.setResults.push({ ...invalid.setResults[0] });
    invalid.exerciseEvents.push({ ...invalid.exerciseEvents[0] });

    expect(validateBackup(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Treeningukorra ID session-1 dubleerub'),
        expect.stringContaining('Treeningharjutuse ID session-exercise-1 dubleerub'),
        expect.stringContaining('Seeriatulemuse ID set-1 dubleerub'),
        expect.stringContaining('Harjutussündmuse ID event-1 dubleerub'),
      ]),
    );
  });

  it('adds an unassigned exercise without altering training days or history', () => {
    const original = backup();
    const result = addExercise(original, { name: 'Plank' });

    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[1]).toMatchObject({ name: 'Plank', machineNumber: '', notes: '' });
    expect(result.dayExercises).toEqual(original.dayExercises);
    expect(result.sessions).toEqual(original.sessions);
  });

  it('updates exercise details without mutating the input backup', () => {
    const original = backup();
    const result = updateExercise(original, 'exercise-1', { name: 'Kükk kangiga', notes: 'Kontrolli tehnikat' });

    expect(result.exercises[0]).toMatchObject({ name: 'Kükk kangiga', notes: 'Kontrolli tehnikat' });
    expect(original.exercises[0].name).toBe('Kükk');
  });

  it('keeps protected exercise fields unchanged when receiving an untrusted update payload', () => {
    const original = backup();
    const result = updateExercise(original, 'exercise-1', {
      name: 'Turvaline nimi',
      id: 'replacement-id',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
    } as unknown as Parameters<typeof updateExercise>[2]);

    expect(result.exercises[0]).toMatchObject({
      id: 'exercise-1',
      name: 'Turvaline nimi',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result.exercises[0].updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('removes only a deleted exercise and its current day links, preserving history', () => {
    const result = removeExercise(backup(), 'exercise-1');

    expect(result.exercises).toEqual([]);
    expect(result.dayExercises).toEqual([]);
    expect(result.sessions).toEqual(sourceBackup.sessions);
    expect(result.sessionExercises).toEqual(sourceBackup.sessionExercises);
    expect(result.setResults).toEqual(sourceBackup.setResults);
    expect(result.exerciseEvents).toEqual(sourceBackup.exerciseEvents);
  });

  it('adds and updates a training day with a following sort order', () => {
    const added = addWorkoutDay(backup(), { name: 'Kolmapäev', notes: 'Jalad' });
    const updated = updateWorkoutDay(added, added.workoutDays[1].id, { name: 'Neljapäev', isArchived: true });

    expect(added.workoutDays[1]).toMatchObject({ name: 'Kolmapäev', notes: 'Jalad', sortOrder: 1, isArchived: false });
    expect(updated.workoutDays[1]).toMatchObject({ name: 'Neljapäev', isArchived: true });
  });

  it('keeps protected workout-day and assignment fields when receiving untrusted update payloads', () => {
    const original = backup();
    const updatedDay = updateWorkoutDay(original, 'day-1', {
      name: 'Turvaline päev',
      id: 'replacement-day',
      sortOrder: 99,
      createdAt: '2000-01-01T00:00:00.000Z',
    } as unknown as Parameters<typeof updateWorkoutDay>[2]);
    const updatedAssignment = updateDayExercise(original, 'day-exercise-1', {
      targetSets: 4,
      id: 'replacement-assignment',
      workoutDayId: 'other-day',
      exerciseId: 'other-exercise',
      sortOrder: 99,
      updatedAt: '2000-01-01T00:00:00.000Z',
    } as unknown as Parameters<typeof updateDayExercise>[2]);

    expect(updatedDay.workoutDays[0]).toMatchObject({ id: 'day-1', sortOrder: 0, createdAt: '2026-01-01T00:00:00.000Z' });
    expect(updatedAssignment.dayExercises[0]).toMatchObject({
      id: 'day-exercise-1',
      workoutDayId: 'day-1',
      exerciseId: 'exercise-1',
      sortOrder: 0,
      targetSets: 4,
    });
    expect(updatedAssignment.dayExercises[0].updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('reports malformed records instead of throwing while validating', () => {
    const invalid = backup();
    invalid.exercises[0] = null as unknown as typeof invalid.exercises[number];
    invalid.dayExercises[0] = null as unknown as typeof invalid.dayExercises[number];

    expect(validateBackup(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Harjutus 1'),
        expect.stringContaining('Päevaharjutus 1'),
      ]),
    );
  });

  it('removes a training day and its current day-exercise links but preserves history', () => {
    const result = removeWorkoutDay(backup(), 'day-1');

    expect(result.workoutDays).toEqual([]);
    expect(result.dayExercises).toEqual([]);
    expect(result.sessions).toEqual(sourceBackup.sessions);
  });

  it('adds, updates and removes an exercise assignment using usable defaults', () => {
    const added = addDayExercise(backup(), 'day-1', 'exercise-1');
    const assignment = added.dayExercises[1];
    const updated = updateDayExercise(added, assignment.id, { targetSets: 4, currentWeight: 55, targetRepsMin: 6, targetRepsMax: 8 });
    const removed = removeDayExercise(updated, assignment.id);

    expect(assignment).toMatchObject({ workoutDayId: 'day-1', exerciseId: 'exercise-1', sortOrder: 1, targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 40, weightStep: 5, restSeconds: 60 });
    expect(updated.dayExercises[1]).toMatchObject({ targetSets: 4, currentWeight: 55, targetRepsMin: 6, targetRepsMax: 8 });
    expect(removed.dayExercises).toHaveLength(1);
  });

  it('normalizes fixed targets and removes weight from duration targets', () => {
    const fixed = updateDayExercise(backup(), 'day-exercise-1', { repMode: 'fixed', targetRepsMin: 12, targetRepsMax: 20 });
    const duration = updateDayExercise(fixed, 'day-exercise-1', { repMode: 'duration-range', currentWeight: 80, weightStep: 5 });

    expect(fixed.dayExercises[0]).toMatchObject({ repMode: 'fixed', targetRepsMin: 12, targetRepsMax: 12 });
    expect(duration.dayExercises[0]).toMatchObject({ repMode: 'duration-range', currentWeight: 0, weightStep: 5 });
  });
});
