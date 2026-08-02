export type RepMode = 'fixed' | 'range' | 'duration-fixed' | 'duration-range';

export type WorkoutSessionStatus = 'active' | 'completed' | 'partial';

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
  status: WorkoutSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSessionExerciseRecord = {
  id: string;
  workoutSessionId: string;
  dayExerciseId: string;
  exerciseId?: string | null;
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
  performedOrder?: number | null;
};

export type SetResultRecord = {
  id: string;
  workoutSessionExerciseId: string;
  setNumber: number;
  status: 'success' | 'failed';
  completedReps: number;
  usedWeight: number | null;
};

export type ExerciseEventField = 'targetSets' | 'targetReps' | 'currentWeight';

export type ExerciseEventRecord = {
  id: string;
  exerciseId: string;
  sessionExerciseId: string | null;
  createdAt: string;
  type: 'note' | 'change';
  actor: 'user' | 'automation';
  field: ExerciseEventField | null;
  fromValue: string | null;
  toValue: string | null;
  noteText: string | null;
};

export type BackupPayload = {
  exercises: ExerciseRecord[];
  workoutDays: WorkoutDayRecord[];
  dayExercises: DayExerciseRecord[];
  sessions: WorkoutSessionRecord[];
  sessionExercises: WorkoutSessionExerciseRecord[];
  setResults: SetResultRecord[];
  exerciseEvents: ExerciseEventRecord[];
};
