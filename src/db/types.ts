export type RepMode = 'fixed' | 'range' | 'duration-fixed' | 'duration-range';

export type ExerciseRecord = {
  id: string;
  name: string;
  machineNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutDayRecord = {
  id: string;
  name: string;
  notes: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DayExerciseRecord = {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  successesRequired: number;
  repMode: RepMode;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
  restSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionRecord = {
  id: string;
  workoutDayId: string;
  performedAt: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionExerciseRecord = {
  id: string;
  workoutSessionId: string;
  dayExerciseId: string;
  exerciseName: string;
  machineNumber: string;
  targetSets: number;
  successesRequired: number;
  repMode: RepMode;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
  orderIndex: number;
};

export type SetResultRecord = {
  id: string;
  workoutSessionExerciseId: string;
  setNumber: number;
  status: 'success' | 'failed';
  completedReps: number;
};

export type BackupPayload = {
  exercises: ExerciseRecord[];
  workoutDays: WorkoutDayRecord[];
  dayExercises: DayExerciseRecord[];
  sessions: WorkoutSessionRecord[];
  sessionExercises: WorkoutSessionExerciseRecord[];
  setResults: SetResultRecord[];
};
