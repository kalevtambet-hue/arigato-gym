export type Exercise = {
  id: string;
  name: string;
  machineNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type WorkoutDay = {
  id: string;
  name: string;
  notes: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type DayExercise = {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  successesRequired: number;
  repMode: 'fixed' | 'range' | 'duration-fixed' | 'duration-range';
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
  restSeconds: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export type Backup = Record<string, unknown> & {
  exercises: Exercise[];
  workoutDays: WorkoutDay[];
  dayExercises: DayExercise[];
  sessions: unknown[];
  sessionExercises: unknown[];
  setResults: unknown[];
  exerciseEvents: unknown[];
};

export type NewExercise = Pick<Exercise, 'name'> & Partial<Pick<Exercise, 'machineNumber' | 'notes'>>;
export type NewWorkoutDay = Pick<WorkoutDay, 'name'> & Partial<Pick<WorkoutDay, 'notes'>>;
export type ExerciseUpdate = {
  name?: string;
  machineNumber?: string;
  notes?: string;
  primaryTargetGroup?: string;
  secondaryTargetGroups?: string[];
};
export type WorkoutDayUpdate = {
  name?: string;
  notes?: string;
  isArchived?: boolean;
};
export type DayExerciseUpdate = {
  targetSets?: number;
  successesRequired?: number;
  repMode?: DayExercise['repMode'];
  targetRepsMin?: number;
  targetRepsMax?: number;
  currentWeight?: number;
  weightStep?: number;
  restSeconds?: number;
};

const requiredLists = ['exercises', 'workoutDays', 'dayExercises', 'sessions', 'sessionExercises', 'setResults'] as const;
const optionalLists = ['exerciseEvents'] as const;

function now() {
  return new Date().toISOString();
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `backup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function copy(backup: Backup): Backup {
  return structuredClone(backup);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord<T extends { id: string }>(items: T[], id: string, label: string): T {
  const record = items.find((item) => item.id === id);
  if (!record) throw new Error(`${label} puudub.`);
  return record;
}

export function parseBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON-fail ei ole loetav.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Varundus peab olema JSON-objekt.');
  }

  const backup = parsed as Record<string, unknown>;

  for (const name of requiredLists) {
    const items = backup[name];
    if (!Array.isArray(items)) {
      throw new Error(`Varundusest puudub loend ${name}.`);
    }
    if (items.some((item) => !isRecord(item))) throw new Error(`Loend ${name} sisaldab vigast kirjet.`);
  }

  for (const name of optionalLists) {
    const items = backup[name];
    if (items === undefined) {
      backup[name] = [];
    } else if (!Array.isArray(items)) {
      throw new Error(`Loend ${name} ei ole korrektne.`);
    } else if (items.some((item) => !isRecord(item))) {
      throw new Error(`Loend ${name} sisaldab vigast kirjet.`);
    }
  }

  return structuredClone(backup) as Backup;
}

export function validateBackup(backup: Backup): string[] {
  const errors: string[] = [];
  const exerciseIds = new Set<string>();
  const dayIds = new Set<string>();
  const validateRecordIds = (items: unknown[], label: string) => {
    const ids = new Set<string>();
    items.forEach((item, index) => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id) {
        errors.push(`${label} ${index + 1} ID puudub.`);
      } else if (ids.has(item.id)) {
        errors.push(`${label} ID ${item.id} dubleerub.`);
      } else {
        ids.add(item.id);
      }
    });
  };

  backup.exercises.forEach((exercise, index) => {
    if (!isRecord(exercise) || typeof exercise.id !== 'string') {
      errors.push(`Harjutus ${index + 1} ei ole korrektne objekt.`);
      return;
    }
    if (exerciseIds.has(exercise.id)) errors.push(`Harjutuse ID ${exercise.id} dubleerub.`);
    exerciseIds.add(exercise.id);
    if (typeof exercise.name !== 'string' || !exercise.name.trim()) errors.push(`Harjutusel ${index + 1} nimi puudub.`);
  });
  backup.workoutDays.forEach((day, index) => {
    if (!isRecord(day) || typeof day.id !== 'string') {
      errors.push(`Treeningpäev ${index + 1} ei ole korrektne objekt.`);
      return;
    }
    if (dayIds.has(day.id)) errors.push(`Treeningpäeva ID ${day.id} dubleerub.`);
    dayIds.add(day.id);
    if (typeof day.name !== 'string' || !day.name.trim()) errors.push(`Treeningpäeval ${index + 1} nimi puudub.`);
  });

  const assignmentIds = new Set<string>();

  backup.dayExercises.forEach((assignment, index) => {
    const prefix = `Päevaharjutus ${index + 1}`;
    if (!isRecord(assignment)) {
      errors.push(`${prefix} ei ole korrektne objekt.`);
      return;
    }
    if (typeof assignment.id !== 'string') errors.push(`${prefix} ID puudub.`);
    else if (assignmentIds.has(assignment.id)) errors.push(`${prefix} ID ${assignment.id} dubleerub.`);
    else assignmentIds.add(assignment.id);
    if (!exerciseIds.has(assignment.exerciseId)) errors.push(`${prefix} viitab puuduvale harjutusele.`);
    if (!dayIds.has(assignment.workoutDayId)) errors.push(`${prefix} viitab puuduvale treeningpäevale.`);
    if (!Number.isFinite(assignment.targetRepsMin) || !Number.isFinite(assignment.targetRepsMax) || assignment.targetRepsMin > assignment.targetRepsMax) {
      errors.push(`${prefix} korduste vahemik ei ole korrektne.`);
    }
    if ((assignment.repMode === 'fixed' || assignment.repMode === 'duration-fixed') && assignment.targetRepsMin !== assignment.targetRepsMax) {
      errors.push(`${prefix} fikseeritud siht peab kasutama sama miinimumi ja maksimumi.`);
    }
    if ((assignment.repMode === 'duration-fixed' || assignment.repMode === 'duration-range') && assignment.currentWeight !== 0) {
      errors.push(`${prefix} kestuse siht ei kasuta raskust.`);
    }
    for (const [name, value] of Object.entries({
      targetSets: assignment.targetSets,
      successesRequired: assignment.successesRequired,
      currentWeight: assignment.currentWeight,
      weightStep: assignment.weightStep,
      restSeconds: assignment.restSeconds,
    })) {
      if (!Number.isFinite(value) || value < 0) errors.push(`${prefix}: ${name} peab olema null või suurem.`);
    }
  });

  validateRecordIds(backup.sessions, 'Treeningukorra');
  validateRecordIds(backup.sessionExercises, 'Treeningharjutuse');
  validateRecordIds(backup.setResults, 'Seeriatulemuse');
  validateRecordIds(backup.exerciseEvents, 'Harjutussündmuse');

  return errors;
}

export function addExercise(backup: Backup, input: NewExercise): Backup {
  const result = copy(backup);
  const timestamp = now();
  result.exercises.push({
    id: createId(),
    name: input.name.trim(),
    machineNumber: input.machineNumber?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return result;
}

export function updateExercise(backup: Backup, id: string, update: ExerciseUpdate): Backup {
  const result = copy(backup);
  const exercise = requireRecord(result.exercises, id, 'Harjutus');
  if (update.name !== undefined) exercise.name = update.name;
  if (update.machineNumber !== undefined) exercise.machineNumber = update.machineNumber;
  if (update.notes !== undefined) exercise.notes = update.notes;
  if (update.primaryTargetGroup !== undefined) exercise.primaryTargetGroup = update.primaryTargetGroup;
  if (update.secondaryTargetGroups !== undefined) exercise.secondaryTargetGroups = update.secondaryTargetGroups;
  exercise.updatedAt = now();
  return result;
}

export function removeExercise(backup: Backup, id: string): Backup {
  const result = copy(backup);
  requireRecord(result.exercises, id, 'Harjutus');
  result.exercises = result.exercises.filter((exercise) => exercise.id !== id);
  result.dayExercises = result.dayExercises.filter((assignment) => assignment.exerciseId !== id);
  return result;
}

export function addWorkoutDay(backup: Backup, input: NewWorkoutDay): Backup {
  const result = copy(backup);
  const timestamp = now();
  const sortOrder = result.workoutDays.reduce((highest, day) => Math.max(highest, day.sortOrder), -1) + 1;
  result.workoutDays.push({
    id: createId(),
    name: input.name.trim(),
    notes: input.notes?.trim() ?? '',
    sortOrder,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return result;
}

export function updateWorkoutDay(backup: Backup, id: string, update: WorkoutDayUpdate): Backup {
  const result = copy(backup);
  const day = requireRecord(result.workoutDays, id, 'Treeningpäev');
  if (update.name !== undefined) day.name = update.name;
  if (update.notes !== undefined) day.notes = update.notes;
  if (update.isArchived !== undefined) day.isArchived = update.isArchived;
  day.updatedAt = now();
  return result;
}

export function removeWorkoutDay(backup: Backup, id: string): Backup {
  const result = copy(backup);
  requireRecord(result.workoutDays, id, 'Treeningpäev');
  result.workoutDays = result.workoutDays.filter((day) => day.id !== id);
  result.dayExercises = result.dayExercises.filter((assignment) => assignment.workoutDayId !== id);
  return result;
}

export function addDayExercise(backup: Backup, workoutDayId: string, exerciseId: string): Backup {
  const result = copy(backup);
  requireRecord(result.workoutDays, workoutDayId, 'Treeningpäev');
  requireRecord(result.exercises, exerciseId, 'Harjutus');
  const timestamp = now();
  const sortOrder = result.dayExercises
    .filter((assignment) => assignment.workoutDayId === workoutDayId)
    .reduce((highest, assignment) => Math.max(highest, assignment.sortOrder), -1) + 1;
  result.dayExercises.push({
    id: createId(),
    workoutDayId,
    exerciseId,
    sortOrder,
    targetSets: 3,
    successesRequired: 1,
    repMode: 'range',
    targetRepsMin: 10,
    targetRepsMax: 15,
    currentWeight: 40,
    weightStep: 5,
    restSeconds: 60,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return result;
}

export function updateDayExercise(backup: Backup, id: string, update: DayExerciseUpdate): Backup {
  const result = copy(backup);
  const assignment = requireRecord(result.dayExercises, id, 'Päevaharjutus');
  if (update.targetSets !== undefined) assignment.targetSets = update.targetSets;
  if (update.successesRequired !== undefined) assignment.successesRequired = update.successesRequired;
  if (update.repMode !== undefined) assignment.repMode = update.repMode;
  if (update.targetRepsMin !== undefined) assignment.targetRepsMin = update.targetRepsMin;
  if (update.targetRepsMax !== undefined) assignment.targetRepsMax = update.targetRepsMax;
  if (update.currentWeight !== undefined) assignment.currentWeight = update.currentWeight;
  if (update.weightStep !== undefined) assignment.weightStep = update.weightStep;
  if (update.restSeconds !== undefined) assignment.restSeconds = update.restSeconds;
  if (assignment.repMode === 'fixed' || assignment.repMode === 'duration-fixed') {
    assignment.targetRepsMax = assignment.targetRepsMin;
  }
  if (assignment.repMode === 'duration-fixed' || assignment.repMode === 'duration-range') {
    assignment.currentWeight = 0;
  }
  assignment.updatedAt = now();
  return result;
}

export function removeDayExercise(backup: Backup, id: string): Backup {
  const result = copy(backup);
  requireRecord(result.dayExercises, id, 'Päevaharjutus');
  result.dayExercises = result.dayExercises.filter((assignment) => assignment.id !== id);
  return result;
}
