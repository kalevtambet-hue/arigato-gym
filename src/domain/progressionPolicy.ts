import { computeNextTarget } from './progression';
import type { ProgressionTarget } from './types';

export type ProgressionInput = {
  target: ProgressionTarget;
  primaryTargetGroup: string;
  previousConsecutiveSuccesses: number;
  completedSets: number;
  successfulReps: number[];
  skipped?: boolean;
  manuallyChanged?: boolean;
  maxWeight?: number;
};

export type ProgressionDecision = {
  primaryTargetGroup: string;
  consecutiveSuccesses: number;
  frozen: boolean;
  reason: 'success' | 'advanced' | 'skipped' | 'partial' | 'manual-change' | 'failed' | 'ceiling';
  nextTarget: ProgressionTarget;
};

function isSuccessful(target: ProgressionTarget, reps: number[]) {
  if (reps.length !== target.targetSets) {
    return false;
  }

  const requiredReps = target.repMode === 'fixed' || target.repMode === 'duration-fixed'
    ? target.targetRepsMin
    : target.targetRepsMax;
  return reps.every((rep) => rep >= requiredReps);
}

export function evaluateProgression(input: ProgressionInput): ProgressionDecision {
  const unchanged = {
    primaryTargetGroup: input.primaryTargetGroup,
    consecutiveSuccesses: 0,
    frozen: false,
    nextTarget: { ...input.target },
  };

  if (input.skipped) {
    return {
      ...unchanged,
      consecutiveSuccesses: input.previousConsecutiveSuccesses,
      reason: 'skipped',
    };
  }

  if (input.manuallyChanged) {
    return { ...unchanged, reason: 'manual-change' };
  }

  if (input.completedSets < input.target.targetSets) {
    return { ...unchanged, reason: 'partial' };
  }

  if (!isSuccessful(input.target, input.successfulReps)) {
    return { ...unchanged, reason: 'failed' };
  }

  const consecutiveSuccesses = input.previousConsecutiveSuccesses + 1;
  if (consecutiveSuccesses < (input.target.successesRequired ?? 1)) {
    return { ...unchanged, consecutiveSuccesses, reason: 'success' };
  }

  if (input.maxWeight != null && input.target.currentWeight >= input.maxWeight) {
    return { ...unchanged, frozen: true, reason: 'ceiling' };
  }

  const advancedTarget = computeNextTarget(input.target, input.successfulReps);
  if (input.maxWeight != null && advancedTarget.currentWeight > input.maxWeight) {
    return { ...unchanged, frozen: true, reason: 'ceiling' };
  }

  return {
    primaryTargetGroup: input.primaryTargetGroup,
    consecutiveSuccesses: 0,
    frozen: false,
    reason: 'advanced',
    nextTarget: advancedTarget,
  };
}
