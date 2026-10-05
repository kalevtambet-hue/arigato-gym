import type { RepMode, SetResultRecord, WorkoutSessionExerciseRecord, WorkoutSessionRecord } from '../db/types';

type CompletedSession = Pick<WorkoutSessionRecord, 'id' | 'performedAt' | 'status'>;
type SessionExercise = Pick<WorkoutSessionExerciseRecord, 'id' | 'workoutSessionId' | 'exerciseId' | 'repMode'>;
type Result = Pick<SetResultRecord, 'id' | 'workoutSessionExerciseId' | 'setNumber' | 'status' | 'completedReps' | 'usedWeight' | 'setKind'>;

export type ExercisePerformanceInput = {
  exerciseId: string;
  sessions: readonly CompletedSession[];
  sessionExercises: readonly SessionExercise[];
  setResults: readonly Result[];
};

export type PerformanceEvidence = {
  value: number;
  load?: number;
  sessionId: string;
  performedAt: string;
  setResultId: string;
  setNumber: number;
};

type SummaryBase = {
  successfulWorkSetCount: number;
  completedSessionCount: number;
  latestPerformance: PerformanceEvidence;
};

export type RepetitionPerformanceSummary = SummaryBase & {
  kind: 'repetition';
  highestLoad: PerformanceEvidence | null;
  bestRepsAtHighestLoad: PerformanceEvidence | null;
};

export type DurationPerformanceSummary = SummaryBase & {
  kind: 'duration';
  longestDuration: PerformanceEvidence;
};

export type ExercisePerformanceSummary = RepetitionPerformanceSummary | DurationPerformanceSummary;

type EligibleEvidence = PerformanceEvidence & { repMode: RepMode };

function isDurationMode(repMode: RepMode) {
  return repMode === 'duration-fixed' || repMode === 'duration-range';
}

function isWorkSet(result: Result) {
  return result.setKind == null || result.setKind === 'work';
}

function isMoreRecent(left: PerformanceEvidence, right: PerformanceEvidence) {
  if (left.performedAt !== right.performedAt) return left.performedAt > right.performedAt;
  if (left.sessionId !== right.sessionId) return left.sessionId > right.sessionId;
  return left.setResultId > right.setResultId;
}

function higherValue(left: PerformanceEvidence, right: PerformanceEvidence) {
  return left.value > right.value || (left.value === right.value && isMoreRecent(left, right));
}

function selectLatestSessionExercise(
  sessionExercises: readonly SessionExercise[],
  sessionsById: ReadonlyMap<string, CompletedSession>,
) {
  return sessionExercises.reduce<SessionExercise | null>((latest, item) => {
    const itemSession = sessionsById.get(item.workoutSessionId);
    if (!itemSession) return latest;
    if (!latest) return item;
    const latestSession = sessionsById.get(latest.workoutSessionId);
    if (!latestSession) return item;
    if (itemSession.performedAt !== latestSession.performedAt) return itemSession.performedAt > latestSession.performedAt ? item : latest;
    return item.workoutSessionId > latest.workoutSessionId ? item : latest;
  }, null);
}

export function deriveExercisePerformance(input: ExercisePerformanceInput): ExercisePerformanceSummary | null {
  const sessionsById = new Map(
    input.sessions
      .filter((session) => session.status === 'completed')
      .map((session) => [session.id, session] as const),
  );
  const matchingExercises = input.sessionExercises.filter(
    (item) => item.exerciseId === input.exerciseId && sessionsById.has(item.workoutSessionId),
  );
  const latestExercise = selectLatestSessionExercise(matchingExercises, sessionsById);
  if (!latestExercise) return null;

  const useDuration = isDurationMode(latestExercise.repMode);
  const matchingExercisesById = new Map(
    matchingExercises
      .filter((item) => isDurationMode(item.repMode) === useDuration)
      .map((item) => [item.id, item] as const),
  );
  const evidence: EligibleEvidence[] = [];
  for (const result of input.setResults) {
    const exercise = matchingExercisesById.get(result.workoutSessionExerciseId);
    if (!exercise || result.status !== 'success' || !isWorkSet(result)) continue;
    const workoutSession = sessionsById.get(exercise.workoutSessionId);
    if (!workoutSession) continue;
    evidence.push({
      value: result.completedReps,
      ...(result.usedWeight == null ? {} : { load: result.usedWeight }),
      sessionId: workoutSession.id,
      performedAt: workoutSession.performedAt,
      setResultId: result.id,
      setNumber: result.setNumber,
      repMode: exercise.repMode,
    });
  }
  if (evidence.length === 0) return null;

  const latestPerformance = evidence.reduce((latest, item) => isMoreRecent(item, latest) ? item : latest);
  const successfulWorkSetCount = evidence.length;
  const completedSessionCount = new Set(evidence.map((item) => item.sessionId)).size;

  if (useDuration) {
    const longestDuration = evidence.reduce((longest, item) => higherValue(item, longest) ? item : longest);
    return { kind: 'duration', successfulWorkSetCount, completedSessionCount, latestPerformance, longestDuration };
  }

  const weightedEvidence = evidence.filter((item): item is EligibleEvidence & { load: number } => item.load != null);
  if (weightedEvidence.length === 0) {
    return { kind: 'repetition', successfulWorkSetCount, completedSessionCount, latestPerformance, highestLoad: null, bestRepsAtHighestLoad: null };
  }
  const highestLoad = weightedEvidence.reduce((highest, item) =>
    item.load > highest.load || (item.load === highest.load && isMoreRecent(item, highest)) ? item : highest,
  );
  const bestRepsAtHighestLoad = weightedEvidence
    .filter((item) => item.load === highestLoad.load)
    .reduce((best, item) => higherValue(item, best) ? item : best);
  return {
    kind: 'repetition',
    successfulWorkSetCount,
    completedSessionCount,
    latestPerformance,
    highestLoad: { ...highestLoad, value: highestLoad.load },
    bestRepsAtHighestLoad,
  };
}
