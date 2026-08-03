export type RepMode = 'fixed' | 'range' | 'duration-fixed' | 'duration-range';

export type WorkoutSessionStatus = 'active' | 'completed' | 'partial' | 'aborted';

export type LoadKind = 'weight' | 'bodyweight' | 'assistance';
export type ProgressionAxis = 'load' | 'metric' | 'assistance' | 'manual';
export type SetKind = 'work' | 'warmup' | 'trial' | 'backoff';

export type ProgressionTargetGroupRecord = {
  id: string;
  dayExerciseId: string;
  role: 'primary' | 'related';
  name: string;
  metric: 'reps' | 'duration';
  minimum: number;
  threshold: number;
  plannedSets: number;
  thresholdSetCount: number;
  loadKind: LoadKind;
  targetLoadGrams: number | null;
  availableLoadStepGrams: number;
  progressionAxis: ProgressionAxis;
  progressionStep: number;
  successesBeforeAdvance: number;
  ceiling: number | null;
  consecutiveSuccesses: number;
  relatedToTargetGroupId: string | null;
  relation: { kind: 'kilograms' | 'percentage'; value: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type SetTargetSnapshotRecord = {
  targetGroupId: string | null;
  metric: 'reps' | 'duration';
  minimum: number;
  threshold: number;
  loadKind: LoadKind;
  targetLoadGrams: number | null;
  thresholdSetCount: number;
  loadQualification: 'at-least-target' | 'at-most-target-assistance' | 'not-applicable';
};

export type ExerciseRecord = {
  id: string;
  name: string;
  machineNumber: string;
  notes: string;
  primaryTargetGroup?: string;
  secondaryTargetGroups?: string[];
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
  startedAtUtc?: string;
  endedAtUtc?: string | null;
  originalTimeZone?: string;
  bodyweightGrams?: number | null;
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
  primaryTargetGroup?: string;
  secondaryTargetGroups?: string[];
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
  setKind?: SetKind;
  actualMetricValue?: number | null;
  actualLoadGrams?: number | null;
  targetSnapshot?: SetTargetSnapshotRecord | null;
  skippedReason?: string | null;
  recordedAt?: string;
};

export type WorkoutSessionSnapshotRecord = {
  id: string;
  workoutSessionId: string;
  kind: 'started' | 'completed';
  capturedAt: string;
  workoutDayId: string;
  workoutDayName: string;
  sessionExercises: WorkoutSessionExerciseRecord[];
};

export type SetResultRevisionRecord = {
  id: string;
  setResultId: string;
  revision: number;
  recordedAt: string;
  reason: 'created' | 'updated' | 'voided';
  result: SetResultRecord | null;
};

export type AuditEventRecord = {
  id: string;
  occurredAt: string;
  actor: 'user' | 'automation';
  entityType: 'exercise' | 'dayExercise' | 'targetGroup' | 'session' | 'setResult';
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  reason?: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
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
