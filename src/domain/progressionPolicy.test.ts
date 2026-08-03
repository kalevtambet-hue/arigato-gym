import { describe, expect, it } from 'vitest';
import { evaluateProgression } from './progressionPolicy';

const target = {
  repMode: 'range' as const,
  targetSets: 3,
  successesRequired: 2,
  targetRepsMin: 10,
  targetRepsMax: 12,
  currentWeight: 40,
  weightStep: 5,
};

describe('evaluateProgression', () => {
  it('keeps the primary target group with a successful attempt', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 0,
        completedSets: 3,
        successfulReps: [12, 12, 12],
      }),
    ).toMatchObject({ primaryTargetGroup: 'Rind', consecutiveSuccesses: 1, reason: 'success' });
  });

  it('raises the target after the required consecutive successes', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 1,
        completedSets: 3,
        successfulReps: [12, 12, 12],
      }),
    ).toMatchObject({ consecutiveSuccesses: 0, reason: 'advanced', nextTarget: { currentWeight: 45 } });
  });

  it('keeps the streak unchanged when the whole exercise is skipped', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 1,
        completedSets: 0,
        successfulReps: [],
        skipped: true,
      }),
    ).toMatchObject({ consecutiveSuccesses: 1, reason: 'skipped', nextTarget: target });
  });

  it('resets progress when only part of the exercise was completed', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 1,
        completedSets: 2,
        successfulReps: [12, 12],
      }),
    ).toMatchObject({ consecutiveSuccesses: 0, reason: 'partial' });
  });

  it('resets progress after a manual target change', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 1,
        completedSets: 3,
        successfulReps: [12, 12, 12],
        manuallyChanged: true,
      }),
    ).toMatchObject({ consecutiveSuccesses: 0, reason: 'manual-change', nextTarget: target });
  });

  it('clamps the next target to its configured weight ceiling', () => {
    expect(
      evaluateProgression({
        target,
        primaryTargetGroup: 'Rind',
        previousConsecutiveSuccesses: 1,
        completedSets: 3,
        successfulReps: [12, 12, 12],
        maxWeight: 40,
      }),
    ).toMatchObject({
      consecutiveSuccesses: 0,
      reason: 'ceiling',
      frozen: true,
      nextTarget: { currentWeight: 40 },
    });
  });
});
