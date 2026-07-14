import type { ProgressionTarget } from './types';
import { isDurationMode } from './targetMode';

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
