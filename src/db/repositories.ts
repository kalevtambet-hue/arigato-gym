import { createId } from '../lib/id';
import { db } from './appDb';
import type {
  BackupPayload,
  DayExerciseRecord,
  ExerciseRecord,
  ExerciseEventField,
  ExerciseEventRecord,
  SetResultRecord,
  WorkoutDayRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
} from './types';

function nowIso() {
  return new Date().toISOString();
}

export function createInMemorySeed() {
  const timestamp = nowIso();
  const workoutDays: WorkoutDayRecord[] = [
    {
      id: createId('day'),
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('day'),
      name: 'Päev 2',
      notes: '',
      sortOrder: 1,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    exercises: [] as ExerciseRecord[],
    workoutDays,
    dayExercises: [] as DayExerciseRecord[],
    sessions: [] as WorkoutSessionRecord[],
    sessionExercises: [] as WorkoutSessionExerciseRecord[],
    setResults: [] as SetResultRecord[],
    exerciseEvents: [] as ExerciseEventRecord[],
  };
}

export async function ensureSeedData() {
  await db.transaction('rw', db.workoutDays, async () => {
    const dayCount = await db.workoutDays.count();
    if (dayCount === 0) {
      const seed = createInMemorySeed();
      await db.workoutDays.bulkAdd(seed.workoutDays);
    }
  });
}

export async function exportBackup(): Promise<BackupPayload> {
  const [
    exercises,
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setResults,
    exerciseEvents,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.workoutDays.orderBy('sortOrder').toArray(),
    db.dayExercises.orderBy('sortOrder').toArray(),
    db.sessions.orderBy('performedAt').toArray(),
    db.sessionExercises.orderBy('orderIndex').toArray(),
    db.setResults.orderBy('setNumber').toArray(),
    db.exerciseEvents.orderBy('createdAt').toArray(),
  ]);

  return {
    exercises,
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setResults,
    exerciseEvents,
  };
}

export async function importBackup(payload: BackupPayload) {
  await db.transaction(
    'rw',
    [db.exercises, db.workoutDays, db.dayExercises, db.sessions, db.sessionExercises, db.setResults, db.exerciseEvents],
    async () => {
      await Promise.all([
        db.exerciseEvents.clear(),
        db.setResults.clear(),
        db.sessionExercises.clear(),
        db.sessions.clear(),
        db.dayExercises.clear(),
        db.workoutDays.clear(),
        db.exercises.clear(),
      ]);

      await db.exercises.bulkAdd(payload.exercises);
      await db.workoutDays.bulkAdd(payload.workoutDays);
      await db.dayExercises.bulkAdd(
        payload.dayExercises.map((item) => ({
          ...item,
          successesRequired: item.successesRequired ?? 1,
        })),
      );
      await db.sessions.bulkAdd(payload.sessions);
      await db.sessionExercises.bulkAdd(
        payload.sessionExercises.map((item) => ({
          ...item,
          successesRequired: item.successesRequired ?? 1,
          performedOrder: item.performedOrder ?? null,
        })),
      );
      await db.setResults.bulkAdd(
        payload.setResults.map((item) => ({
          ...item,
          usedWeight: item.usedWeight ?? null,
        })),
      );
      await db.exerciseEvents.bulkAdd(
        (payload.exerciseEvents ?? []).map((item) => ({
          ...item,
          sessionExerciseId: item.sessionExerciseId ?? null,
          field: item.field ?? null,
          fromValue: item.fromValue ?? null,
          toValue: item.toValue ?? null,
          noteText: item.noteText ?? null,
        })),
      );
    },
  );
}

export async function addExerciseNote(input: {
  exerciseId: string;
  sessionExerciseId?: string | null;
  noteText: string;
}) {
  const noteText = input.noteText.trim();
  if (!noteText) {
    return;
  }

  await db.exerciseEvents.add({
    id: createId('exercise-event'),
    exerciseId: input.exerciseId,
    sessionExerciseId: input.sessionExerciseId ?? null,
    createdAt: nowIso(),
    type: 'note',
    actor: 'user',
    field: null,
    fromValue: null,
    toValue: null,
    noteText,
  });
}

export async function addExerciseChangeEvent(input: {
  exerciseId: string;
  sessionExerciseId?: string | null;
  actor: 'user' | 'automation';
  field: ExerciseEventField;
  fromValue: string;
  toValue: string;
}) {
  if (input.fromValue === input.toValue) {
    return;
  }

  await db.exerciseEvents.add({
    id: createId('exercise-event'),
    exerciseId: input.exerciseId,
    sessionExerciseId: input.sessionExerciseId ?? null,
    createdAt: nowIso(),
    type: 'change',
    actor: input.actor,
    field: input.field,
    fromValue: input.fromValue,
    toValue: input.toValue,
    noteText: null,
  });
}
