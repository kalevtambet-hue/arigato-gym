import { describe, expect, it } from 'vitest';
import { countConsecutiveSuccesses } from './consecutiveProgression';

describe('countConsecutiveSuccesses', () => {
  it('counts one matching success', () => {
    expect(countConsecutiveSuccesses([{ matchedTarget: true, success: true }])).toBe(1);
  });

  it('stops before a failed attempt', () => {
    expect(
      countConsecutiveSuccesses([
        { matchedTarget: true, success: true },
        { matchedTarget: false, success: false },
        { matchedTarget: true, success: true },
      ]),
    ).toBe(1);
  });

  it('counts consecutive matched successes at the end', () => {
    expect(
      countConsecutiveSuccesses([
        { matchedTarget: true, success: false },
        { matchedTarget: true, success: true },
        { matchedTarget: true, success: true },
      ]),
    ).toBe(2);
  });
});
