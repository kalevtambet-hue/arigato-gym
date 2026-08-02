import Dexie, { type Table } from 'dexie';
import type {
  AuditEventRecord,
  DayExerciseRecord,
  ExerciseRecord,
  ExerciseEventRecord,
  SetResultRecord,
  SetResultRevisionRecord,
  WorkoutDayRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
  WorkoutSessionSnapshotRecord,
} from './types';

export class AppDb extends Dexie {
  exercises!: Table<ExerciseRecord, string>;
  workoutDays!: Table<WorkoutDayRecord, string>;
  dayExercises!: Table<DayExerciseRecord, string>;
  sessions!: Table<WorkoutSessionRecord, string>;
  sessionExercises!: Table<WorkoutSessionExerciseRecord, string>;
  setResults!: Table<SetResultRecord, string>;
  exerciseEvents!: Table<ExerciseEventRecord, string>;
  sessionSnapshots!: Table<WorkoutSessionSnapshotRecord, string>;
  setResultRevisions!: Table<SetResultRevisionRecord, string>;
  auditEvents!: Table<AuditEventRecord, string>;

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
    this.version(4)
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
          .table('setResults')
          .toCollection()
          .modify((row) => {
            row.usedWeight ??= null;
          });
      });
    this.version(5)
      .stores({
        exercises: 'id, name, machineNumber, updatedAt',
        workoutDays: 'id, sortOrder, isArchived, updatedAt',
        dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
        sessions: 'id, workoutDayId, status, performedAt',
        sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex, performedOrder',
        setResults: 'id, workoutSessionExerciseId, setNumber',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessionExercises')
          .toCollection()
          .modify((row) => {
            row.performedOrder ??= null;
          });
      });
    this.version(6).stores({
      exercises: 'id, name, machineNumber, updatedAt',
      workoutDays: 'id, sortOrder, isArchived, updatedAt',
      dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
      sessions: 'id, workoutDayId, status, performedAt',
      sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex, performedOrder',
      setResults: 'id, workoutSessionExerciseId, setNumber',
      exerciseEvents: 'id, exerciseId, createdAt, type, actor',
    });
    this.version(7)
      .stores({
        exercises: 'id, name, machineNumber, primaryTargetGroup, updatedAt',
        workoutDays: 'id, sortOrder, isArchived, updatedAt',
        dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
        sessions: 'id, workoutDayId, status, performedAt',
        sessionExercises: 'id, workoutSessionId, dayExerciseId, primaryTargetGroup, orderIndex, performedOrder',
        setResults: 'id, workoutSessionExerciseId, setNumber',
        exerciseEvents: 'id, exerciseId, createdAt, type, actor',
        sessionSnapshots: 'id, workoutSessionId, kind, capturedAt',
        setResultRevisions: 'id, setResultId, revision, recordedAt',
        auditEvents: 'id, entityType, entityId, occurredAt, actor',
      })
      .upgrade(async (tx) => {
        await tx.table('exercises').toCollection().modify((row) => {
          row.primaryTargetGroup ??= '';
          row.secondaryTargetGroups ??= [];
        });
        await tx.table('sessionExercises').toCollection().modify((row) => {
          row.primaryTargetGroup ??= '';
          row.secondaryTargetGroups ??= [];
        });
      });
  }
}

export const db = new AppDb();
