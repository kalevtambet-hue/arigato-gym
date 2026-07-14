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
    this.version(2)
      .stores({
        exercises: 'id, name, machineNumber, updatedAt',
        workoutDays: 'id, sortOrder, isArchived, updatedAt',
        dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
        sessions: 'id, workoutDayId, status, performedAt',
        sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex',
        setResults: 'id, workoutSessionExerciseId, setNumber',
      })
      .upgrade((tx) =>
        tx
          .table('workoutDays')
          .toCollection()
          .modify((day) => {
            day.notes ??= '';
          }),
      );
    this.version(3)
      .stores({
        exercises: 'id, name, machineNumber, updatedAt',
        workoutDays: 'id, sortOrder, isArchived, updatedAt',
        dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
        sessions: 'id, workoutDayId, status, performedAt',
        sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex',
        setResults: 'id, workoutSessionExerciseId, setNumber',
      })
      .upgrade(async (tx) => {
        await tx
          .table('dayExercises')
          .toCollection()
          .modify((row) => {
            row.successesRequired ??= 1;
          });
        await tx
          .table('sessionExercises')
          .toCollection()
          .modify((row) => {
            row.successesRequired ??= 1;
          });
      });
  }
}

export const db = new AppDb();
