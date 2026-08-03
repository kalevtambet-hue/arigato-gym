import { describe, expect, it } from 'vitest';
import { evaluatePrimaryProgression, type ProgressionTargetV1 } from './progressionV1';

const target: ProgressionTargetV1 = {
  metric: 'reps',
  minimum: 8,
  threshold: 12,
  plannedSets: 3,
  thresholdSetCount: 2,
  successesBeforeAdvance: 2,
  load: { kind: 'weight', targetGrams: 40_000, stepGrams: 2_500 },
  progression: { axis: 'load', step: 2_500, ceiling: 42_500 },
};

describe('evaluatePrimaryProgression', () => {
  it('keeps the streak neutral when the complete exercise is skipped', () => {
    expect(evaluatePrimaryProgression({ target, previousSuccesses: 1, state: 'skipped', sets: [] }))
      .toMatchObject({ reason: 'skipped', consecutiveSuccesses: 1 });
  });

  it('fails when any planned set misses the minimum even if an extra set hits the threshold', () => {
    expect(evaluatePrimaryProgression({
      target,
      previousSuccesses: 1,
      state: 'completed',
      sets: [
        { planned: true, metricValue: 12, actualLoadGrams: 37_500 },
        { planned: true, metricValue: 7, actualLoadGrams: 40_000 },
        { planned: true, metricValue: 12, actualLoadGrams: 40_000 },
        { planned: false, metricValue: 12, actualLoadGrams: 40_000 },
      ],
    })).toMatchObject({ reason: 'minimum-missed', consecutiveSuccesses: 0 });
  });

  it('allows an extra qualifying set to satisfy the threshold requirement', () => {
    expect(evaluatePrimaryProgression({
      target,
      previousSuccesses: 1,
      state: 'completed',
      sets: [
        { planned: true, metricValue: 12, actualLoadGrams: 40_000 },
        { planned: true, metricValue: 8, actualLoadGrams: 40_000 },
        { planned: true, metricValue: 8, actualLoadGrams: 40_000 },
        { planned: false, metricValue: 12, actualLoadGrams: 40_000 },
      ],
    })).toMatchObject({
      reason: 'advanced',
      consecutiveSuccesses: 0,
      nextTarget: { load: { targetGrams: 42_500 } },
    });
  });

  it('does not qualify a lighter actual load', () => {
    expect(evaluatePrimaryProgression({
      target,
      previousSuccesses: 0,
      state: 'completed',
      sets: [
        { planned: true, metricValue: 12, actualLoadGrams: 37_500 },
        { planned: true, metricValue: 12, actualLoadGrams: 37_500 },
        { planned: true, metricValue: 12, actualLoadGrams: 40_000 },
      ],
    })).toMatchObject({ reason: 'insufficient-threshold', consecutiveSuccesses: 0 });
  });

  it('moves assistance down and clamps it at the ceiling', () => {
    const assisted: ProgressionTargetV1 = {
      ...target,
      load: { kind: 'assistance', targetGrams: 35_000, stepGrams: 2_500 },
      progression: { axis: 'assistance', step: 2_500, ceiling: 32_500 },
    };
    expect(evaluatePrimaryProgression({
      target: assisted,
      previousSuccesses: 1,
      state: 'completed',
      sets: Array.from({ length: 3 }, () => ({ planned: true, metricValue: 12, actualLoadGrams: 35_000 })),
    })).toMatchObject({ reason: 'advanced', nextTarget: { load: { targetGrams: 32_500 } }, frozen: true });
  });

  it('does not accrue an automatic streak for a zero-step progression', () => {
    expect(evaluatePrimaryProgression({
      target: { ...target, progression: { axis: 'load', step: 0 } },
      previousSuccesses: 1,
      state: 'completed',
      sets: Array.from({ length: 3 }, () => ({ planned: true, metricValue: 12, actualLoadGrams: 40_000 })),
    })).toMatchObject({ reason: 'manual', consecutiveSuccesses: 0 });
  });
});
