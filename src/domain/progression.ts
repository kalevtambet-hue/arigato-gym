import type { ProgressionTarget } from './types';

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

  return { ...target };
}
