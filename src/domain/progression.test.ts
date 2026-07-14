import { describe, expect, it } from 'vitest';
import { computeNextTarget } from './progression';

describe('computeNextTarget', () => {
  it('raises weight for range mode when every set reaches the max reps', () => {
    const result = computeNextTarget(
      {
        repMode: 'range',
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 50,
        weightStep: 5,
      },
      [15, 15, 15],
    );

    expect(result.currentWeight).toBe(55);
  });

  it('keeps the same target when one range set misses the max', () => {
    const result = computeNextTarget(
      {
        repMode: 'range',
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 50,
        weightStep: 5,
      },
      [15, 15, 12],
    );

    expect(result.currentWeight).toBe(50);
  });

  it('raises duration range target when every set reaches the max minutes', () => {
    const result = computeNextTarget(
      {
        repMode: 'duration-range',
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 0,
        weightStep: 5,
      },
      [15, 15],
    );

    expect(result.targetRepsMin).toBe(15);
    expect(result.targetRepsMax).toBe(20);
    expect(result.currentWeight).toBe(0);
  });

  it('keeps the same duration target when one set misses the target minutes', () => {
    const result = computeNextTarget(
      {
        repMode: 'duration-fixed',
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 10,
        currentWeight: 0,
        weightStep: 2,
      },
      [10, 8],
    );

    expect(result.targetRepsMin).toBe(10);
    expect(result.targetRepsMax).toBe(10);
    expect(result.currentWeight).toBe(0);
  });
});
