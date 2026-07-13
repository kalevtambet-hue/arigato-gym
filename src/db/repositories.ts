import { createId } from '../lib/id';
import { db } from './appDb';
import type {
  BackupPayload,
  DayExerciseRecord,
  ExerciseRecord,
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
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('day'),
      name: 'Päev 2',
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
  };
}

export async function ensureSeedData() {
  const dayCount = await db.workoutDays.count();
  if (dayCount === 0) {
    const seed = createInMemorySeed();
    await db.workoutDays.bulkAdd(seed.workoutDays);
  }
}

export async function exportBackup(): Promise<BackupPayload> {
  const [
    exercises,
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setResults,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.workoutDays.orderBy('sortOrder').toArray(),
    db.dayExercises.orderBy('sortOrder').toArray(),
    db.sessions.orderBy('performedAt').toArray(),
    db.sessionExercises.orderBy('orderIndex').toArray(),
    db.setResults.orderBy('setNumber').toArray(),
  ]);

  return {
    exercises,
    workoutDays,
    dayExercises,
    sessions,
    sessionExercises,
    setResults,
  };
}

export async function importBackup(payload: BackupPayload) {
  await db.transaction(
    'rw',
    [db.exercises, db.workoutDays, db.dayExercises, db.sessions, db.sessionExercises, db.setResults],
    async () => {
      await Promise.all([
        db.setResults.clear(),
        db.sessionExercises.clear(),
        db.sessions.clear(),
        db.dayExercises.clear(),
        db.workoutDays.clear(),
        db.exercises.clear(),
      ]);

      await db.exercises.bulkAdd(payload.exercises);
      await db.workoutDays.bulkAdd(payload.workoutDays);
      await db.dayExercises.bulkAdd(payload.dayExercises);
      await db.sessions.bulkAdd(payload.sessions);
      await db.sessionExercises.bulkAdd(payload.sessionExercises);
      await db.setResults.bulkAdd(payload.setResults);
    },
  );
}
