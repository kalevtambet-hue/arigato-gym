import type { ProgressionTarget } from './types';
import { isDurationMode } from './targetMode';
import { countConsecutiveSuccesses } from './consecutiveProgression';
import type { SetResultRecord, WorkoutSessionExerciseRecord, WorkoutSessionRecord } from '../db/types';

export type ProgressionReason = 'advanced' | 'success' | 'failed' | 'incomplete' | 'ceiling' | 'mixed-actual-loads';

export type ActualLoadSource =
  | 'recorded'
  | 'partial-actual'
  | 'target-fallback'
  | 'mixed-actual-loads'
  | 'not-applicable'
  | 'no-qualifying-sets';

type ProgressionSetResult = Pick<SetResultRecord, 'setNumber' | 'status' | 'completedReps' | 'usedWeight' | 'setKind'>;

export type QualifyingSetEvidence = {
  metricValues: number[];
  completedSetCount: number;
  complete: boolean;
  successful: boolean;
  load: {
    value: number | null;
    source: ActualLoadSource;
    differsFromTarget: boolean;
    distinctValues: number[];
  };
};

export type ProgressionDecision = {
  sessionTarget: ProgressionTarget;
  actual: {
    metricValues: number[];
    completedSetCount: number;
    qualifies: boolean;
    load: {
      value: number | null;
      source: ActualLoadSource;
      differsFromTarget: boolean;
      distinctValues: number[];
    };
  };
  nextTarget: ProgressionTarget;
  progressed: boolean;
  consecutiveSuccesses: number;
  reason: ProgressionReason;
  explanation: string;
};

export type ProgressionDecisionInput = {
  target: ProgressionTarget;
  results: ReadonlyArray<ProgressionSetResult>;
  previousConsecutiveSuccesses: number;
  maxWeight?: number;
};

export type ProgressionHistoryEntry = {
  session: Pick<WorkoutSessionRecord, 'id' | 'performedAt' | 'status'>;
  sessionExercise: Pick<
    WorkoutSessionExerciseRecord,
    | 'id'
    | 'dayExerciseId'
    | 'repMode'
    | 'targetSets'
    | 'successesRequired'
    | 'targetRepsMin'
    | 'targetRepsMax'
    | 'currentWeight'
    | 'weightStep'
  >;
  results: ReadonlyArray<ProgressionSetResult>;
};

export type RecomputedProgression = {
  dayExerciseId: string;
  decision: ProgressionDecision;
};

export function computeNextTarget(target: ProgressionTarget, reps: number[]) {
  const fullCount = reps.length === target.targetSets;
  const allAtMax = fullCount && reps.every((value) => value >= target.targetRepsMax);
  const allAtFixed = fullCount && reps.every((value) => value >= target.targetRepsMin);

  if (target.repMode === 'range' && allAtMax) {
    return { ...target, currentWeight: target.currentWeight + target.weightStep };
  }

  if (target.repMode === 'fixed' && allAtFixed) {
    return { ...target, currentWeight: target.currentWeight + target.weightStep };
  }

  if (target.repMode === 'duration-range' && allAtMax) {
    return {
      ...target,
      targetRepsMin: target.targetRepsMin + target.weightStep,
      targetRepsMax: target.targetRepsMax + target.weightStep,
      currentWeight: 0,
    };
  }

  if (target.repMode === 'duration-fixed' && allAtFixed) {
    return {
      ...target,
      targetRepsMin: target.targetRepsMin + target.weightStep,
      targetRepsMax: target.targetRepsMax + target.weightStep,
      currentWeight: 0,
    };
  }

  if (isDurationMode(target.repMode)) {
    return { ...target, currentWeight: 0 };
  }

  return { ...target };
}

function sortedResults(results: ReadonlyArray<ProgressionSetResult>) {
  return [...results].sort((left, right) => left.setNumber - right.setNumber);
}

function loadWithoutEvidence() {
  return { value: null, source: 'no-qualifying-sets' as const, differsFromTarget: false, distinctValues: [] };
}

function isPlannedWorkSet(result: ProgressionSetResult, target: ProgressionTarget) {
  return (result.setKind == null || result.setKind === 'work')
    && Number.isInteger(result.setNumber)
    && result.setNumber >= 1
    && result.setNumber <= target.targetSets;
}

function successfulMetric(target: ProgressionTarget, results: ReadonlyArray<ProgressionSetResult>) {
  if (results.some((result) => result.status === 'failed')) {
    return false;
  }
  const required = target.repMode === 'fixed' || target.repMode === 'duration-fixed'
    ? target.targetRepsMin
    : target.targetRepsMax;
  return results.every((result) => result.completedReps >= required);
}

function actualLoadFor(target: ProgressionTarget, results: ReadonlyArray<ProgressionSetResult>) {
  if (isDurationMode(target.repMode)) {
    return { value: null, source: 'not-applicable' as const, differsFromTarget: false, distinctValues: [] };
  }

  const distinctValues = [...new Set(results.flatMap((result) => result.usedWeight == null ? [] : [result.usedWeight]))]
    .sort((left, right) => left - right);
  if (distinctValues.length > 1) {
    return {
      value: null,
      source: 'mixed-actual-loads' as const,
      differsFromTarget: true,
      distinctValues,
    };
  }
  if (distinctValues.length === 1) {
    const value = distinctValues[0];
    return {
      value,
      source: results.some((result) => result.usedWeight == null) ? 'partial-actual' as const : 'recorded' as const,
      differsFromTarget: value !== target.currentWeight,
      distinctValues,
    };
  }

  return {
    value: target.currentWeight,
    source: 'target-fallback' as const,
    differsFromTarget: false,
    distinctValues,
  };
}

export function qualifyingSetEvidence(target: ProgressionTarget, sourceResults: ReadonlyArray<ProgressionSetResult>): QualifyingSetEvidence {
  const results = sortedResults(sourceResults).filter((result) => isPlannedWorkSet(result, target));
  const resultsByNumber = new Map<number, ProgressionSetResult[]>();
  results.forEach((result) => {
    const current = resultsByNumber.get(result.setNumber) ?? [];
    current.push(result);
    resultsByNumber.set(result.setNumber, current);
  });
  const plannedResults = Array.from({ length: target.targetSets }, (_, index) => resultsByNumber.get(index + 1) ?? []);
  const complete = plannedResults.every((sets) => sets.length === 1);
  const qualifyingResults = complete ? plannedResults.map(([set]) => set) : [];
  const successful = complete && successfulMetric(target, qualifyingResults);
  const load = successful ? actualLoadFor(target, qualifyingResults) : loadWithoutEvidence();

  return {
    metricValues: qualifyingResults.map((result) => result.completedReps),
    completedSetCount: qualifyingResults.length,
    complete,
    successful,
    load,
  };
}

function targetFromSessionExercise(entry: ProgressionHistoryEntry['sessionExercise']): ProgressionTarget {
  return {
    repMode: entry.repMode,
    targetSets: entry.targetSets,
    successesRequired: entry.successesRequired,
    targetRepsMin: entry.targetRepsMin,
    targetRepsMax: entry.targetRepsMax,
    currentWeight: entry.currentWeight,
    weightStep: entry.weightStep,
  };
}

function matchesTarget(entry: ProgressionHistoryEntry['sessionExercise'], target: ProgressionTarget) {
  return entry.repMode === target.repMode
    && entry.targetRepsMin === target.targetRepsMin
    && entry.targetRepsMax === target.targetRepsMax
    && entry.currentWeight === target.currentWeight;
}

function successfulHistoricalAttempt(entry: ProgressionHistoryEntry) {
  const evidence = qualifyingSetEvidence(targetFromSessionExercise(entry.sessionExercise), entry.results);
  return evidence.successful && evidence.load.source !== 'mixed-actual-loads';
}

export function recomputeProgressionFromHistory(input: {
  dayExerciseId: string;
  entries: ReadonlyArray<ProgressionHistoryEntry>;
  maxWeight?: number;
}): RecomputedProgression | null {
  const entries = input.entries
    .filter((entry) => entry.session.status === 'completed' && entry.sessionExercise.dayExerciseId === input.dayExerciseId)
    .toSorted((left, right) => {
      const performedAt = left.session.performedAt.localeCompare(right.session.performedAt);
      return performedAt === 0 ? left.session.id.localeCompare(right.session.id) : performedAt;
    });
  const latest = entries.at(-1);
  if (!latest) {
    return null;
  }

  const target = targetFromSessionExercise(latest.sessionExercise);
  const previousConsecutiveSuccesses = countConsecutiveSuccesses(
    entries.slice(0, -1).map((entry) => ({
      matchedTarget: matchesTarget(entry.sessionExercise, target),
      success: successfulHistoricalAttempt(entry),
    })),
  );

  return {
    dayExerciseId: input.dayExerciseId,
    decision: decideProgression({
      target,
      results: latest.results,
      previousConsecutiveSuccesses,
      maxWeight: input.maxWeight,
    }),
  };
}

function explanationFor(reason: ProgressionReason, actual: ProgressionDecision['actual'], target: ProgressionTarget) {
  const loadNote = actual.load.source === 'not-applicable'
    ? ''
    : actual.load.source === 'no-qualifying-sets'
      ? ''
    : actual.load.source === 'target-fallback'
      ? ' Tegelik raskus puudub, seega kasutati siht-raskust.'
      : actual.load.source === 'partial-actual'
        ? ` Osalised tegeliku raskuse andmed viitavad raskusele ${actual.load.value} kg.`
        : actual.load.source === 'mixed-actual-loads'
          ? ` Kasutati mitut tegelikku tööraskust (${actual.load.distinctValues.join(', ')} kg), seega automaatset raskuse tõusu ei tehtud.`
      : actual.load.differsFromTarget
        ? ` Tegelik raskus oli ${actual.load.value} kg, mitte siht ${target.currentWeight} kg.`
        : ` Tegelik raskus oli ${actual.load.value} kg.`;

  switch (reason) {
    case 'advanced': return `Kõik planeeritud seeriad täitsid sihi; järgmine siht tõuseb.${loadNote}`;
    case 'success': return `Õnnestumine on kirjas, kuid enne tõusu on vaja veel järjestikust õnnestumist.${loadNote}`;
    case 'failed': return `Vähemalt üks planeeritud seeria ei täitnud sihti.${loadNote}`;
    case 'incomplete': return `Kõik planeeritud seeriad ei ole veel kirjas.${loadNote}`;
    case 'ceiling': return `Seatud kaalulagi ei luba järgmist tõusu.${loadNote}`;
    case 'mixed-actual-loads': return `Mitme tegeliku tööraskuse tõttu automaatset raskuse tõusu ei tehtud.${loadNote}`;
  }
}

export function decideProgression(input: ProgressionDecisionInput): ProgressionDecision {
  const sessionTarget = { ...input.target };
  const evidence = qualifyingSetEvidence(sessionTarget, input.results);
  const actual = {
    metricValues: evidence.metricValues,
    completedSetCount: evidence.completedSetCount,
    qualifies: evidence.successful,
    load: evidence.load,
  };
  const baseTarget = isDurationMode(sessionTarget.repMode) || actual.load.value == null
    ? { ...sessionTarget }
    : { ...sessionTarget, currentWeight: actual.load.value };

  if (!evidence.complete) {
    return {
      sessionTarget, actual, nextTarget: baseTarget, progressed: false, consecutiveSuccesses: 0,
      reason: 'incomplete', explanation: explanationFor('incomplete', actual, sessionTarget),
    };
  }
  if (!actual.qualifies) {
    return {
      sessionTarget, actual, nextTarget: baseTarget, progressed: false, consecutiveSuccesses: 0,
      reason: 'failed', explanation: explanationFor('failed', actual, sessionTarget),
    };
  }

  if (actual.load.source === 'mixed-actual-loads') {
    return {
      sessionTarget, actual, nextTarget: { ...sessionTarget }, progressed: false, consecutiveSuccesses: 0,
      reason: 'mixed-actual-loads', explanation: explanationFor('mixed-actual-loads', actual, sessionTarget),
    };
  }

  const consecutiveSuccesses = input.previousConsecutiveSuccesses + 1;
  if (consecutiveSuccesses < (sessionTarget.successesRequired ?? 1)) {
    return {
      sessionTarget, actual, nextTarget: baseTarget, progressed: false, consecutiveSuccesses,
      reason: 'success', explanation: explanationFor('success', actual, sessionTarget),
    };
  }

  if (input.maxWeight != null && baseTarget.currentWeight >= input.maxWeight) {
    return {
      sessionTarget, actual, nextTarget: baseTarget, progressed: false, consecutiveSuccesses: 0,
      reason: 'ceiling', explanation: explanationFor('ceiling', actual, sessionTarget),
    };
  }

  const nextTarget = computeNextTarget(baseTarget, actual.metricValues);
  if (input.maxWeight != null && nextTarget.currentWeight > input.maxWeight) {
    return {
      sessionTarget, actual, nextTarget: baseTarget, progressed: false, consecutiveSuccesses: 0,
      reason: 'ceiling', explanation: explanationFor('ceiling', actual, sessionTarget),
    };
  }

  return {
    sessionTarget, actual, nextTarget, progressed: true, consecutiveSuccesses: 0,
    reason: 'advanced', explanation: explanationFor('advanced', actual, sessionTarget),
  };
}
