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
});
