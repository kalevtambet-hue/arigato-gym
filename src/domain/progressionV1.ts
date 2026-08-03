export type LoadTargetV1 =
  | { kind: 'weight'; targetGrams: number; stepGrams: number }
  | { kind: 'assistance'; targetGrams: number; stepGrams: number }
  | { kind: 'bodyweight'; stepGrams: number };

export type ProgressionTargetV1 = {
  metric: 'reps' | 'duration';
  minimum: number;
  threshold: number;
  plannedSets: number;
  thresholdSetCount: number;
  successesBeforeAdvance: number;
  load: LoadTargetV1;
  progression: {
    axis: 'load' | 'metric' | 'assistance' | 'manual';
    step: number;
    ceiling?: number;
  };
};

export type PrimarySetAttempt = {
  planned: boolean;
  metricValue: number;
  actualLoadGrams?: number | null;
};

export type PrimaryProgressionInput = {
  target: ProgressionTargetV1;
  previousSuccesses: number;
  state: 'completed' | 'partial' | 'skipped' | 'aborted';
  sets: PrimarySetAttempt[];
};

export type PrimaryProgressionDecision = {
  reason: 'success' | 'advanced' | 'skipped' | 'aborted' | 'partial' | 'minimum-missed' | 'insufficient-threshold' | 'manual';
  consecutiveSuccesses: number;
  frozen: boolean;
  nextTarget: ProgressionTargetV1;
};

function cloneTarget(target: ProgressionTargetV1): ProgressionTargetV1 {
  return { ...target, load: { ...target.load }, progression: { ...target.progression } };
}

function loadQualifies(target: LoadTargetV1, actualLoadGrams: number | null | undefined) {
  if (target.kind === 'bodyweight') {
    return true;
  }
  if (actualLoadGrams == null) {
    return false;
  }
  return target.kind === 'assistance'
    ? actualLoadGrams <= target.targetGrams
    : actualLoadGrams >= target.targetGrams;
}

function advanceTarget(target: ProgressionTargetV1) {
  const next = cloneTarget(target);
  const { axis, step, ceiling } = target.progression;

  if (axis === 'metric') {
    const value = target.threshold + step;
    const nextThreshold = ceiling == null ? value : Math.min(value, ceiling);
    const delta = nextThreshold - target.threshold;
    next.minimum += delta;
    next.threshold = nextThreshold;
    return { target: next, frozen: ceiling != null && nextThreshold === ceiling };
  }

  if (target.load.kind === 'bodyweight') {
    return { target: next, frozen: false };
  }

  const direction = axis === 'assistance' || target.load.kind === 'assistance' ? -1 : 1;
  const rawValue = target.load.targetGrams + direction * step;
  const nextValue = ceiling == null
    ? rawValue
    : direction > 0 ? Math.min(rawValue, ceiling) : Math.max(rawValue, ceiling);
  next.load = { ...target.load, targetGrams: nextValue };
  return { target: next, frozen: ceiling != null && nextValue === ceiling };
}

export function evaluatePrimaryProgression(input: PrimaryProgressionInput): PrimaryProgressionDecision {
  const nextTarget = cloneTarget(input.target);
  const neutral = (reason: 'skipped' | 'aborted'): PrimaryProgressionDecision => ({
    reason,
    consecutiveSuccesses: input.previousSuccesses,
    frozen: false,
    nextTarget,
  });

  if (input.state === 'skipped' || input.state === 'aborted') {
    return neutral(input.state);
  }
  if (input.state === 'partial') {
    return { reason: 'partial', consecutiveSuccesses: 0, frozen: false, nextTarget };
  }
  if (input.target.progression.axis === 'manual' || input.target.progression.step === 0) {
    return { reason: 'manual', consecutiveSuccesses: 0, frozen: false, nextTarget };
  }

  const plannedSets = input.sets.filter((set) => set.planned);
  if (
    plannedSets.length !== input.target.plannedSets
    || plannedSets.some((set) => set.metricValue < input.target.minimum)
  ) {
    return { reason: 'minimum-missed', consecutiveSuccesses: 0, frozen: false, nextTarget };
  }

  const qualifyingSets = input.sets.filter(
    (set) => set.metricValue >= input.target.threshold && loadQualifies(input.target.load, set.actualLoadGrams),
  );
  if (qualifyingSets.length < input.target.thresholdSetCount) {
    return { reason: 'insufficient-threshold', consecutiveSuccesses: 0, frozen: false, nextTarget };
  }

  const consecutiveSuccesses = input.previousSuccesses + 1;
  if (consecutiveSuccesses < input.target.successesBeforeAdvance) {
    return { reason: 'success', consecutiveSuccesses, frozen: false, nextTarget };
  }

  const advanced = advanceTarget(input.target);
  return {
    reason: 'advanced',
    consecutiveSuccesses: 0,
    frozen: advanced.frozen,
    nextTarget: advanced.target,
  };
}
