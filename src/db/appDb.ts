import Dexie, { type Table } from 'dexie';
import type {
  DayExerciseRecord,
  ExerciseRecord,
  SetResultRecord,
  WorkoutDayRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
} from './types';

export class AppDb extends Dexie {
  exercises!: Table<ExerciseRecord, string>;
  workoutDays!: Table<WorkoutDayRecord, string>;
  dayExercises!: Table<DayExerciseRecord, string>;
  sessions!: Table<WorkoutSessionRecord, string>;
  sessionExercises!: Table<WorkoutSessionExerciseRecord, string>;
  setResults!: Table<SetResultRecord, string>;

  constructor() {
    super('gym-log-db');
    this.version(1).stores({
      exercises: 'id, name, machineNumber, updatedAt',
      workoutDays: 'id, sortOrder, isArchived, updatedAt',
      dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
      sessions: 'id, workoutDayId, status, performedAt',
      sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex',
      setResults: 'id, workoutSessionExerciseId, setNumber',
    });
  }
}

export const db = new AppDb();
