import { describe, expect, it } from 'vitest';
import { getNextWorkoutExercise } from './nextWorkoutExercise';

const exercises = [
  { id: 'a', targetSets: 3, orderIndex: 0 },
  { id: 'b', targetSets: 3, orderIndex: 1 },
  { id: 'c', targetSets: 3, orderIndex: 2 },
];

describe('getNextWorkoutExercise', () => {
  it('keeps the current exercise active for a regular workout', () => {
    expect(getNextWorkoutExercise(exercises, new Map([['a', 1]]), false)?.id).toBe('a');
  });

  it('moves to the next exercise with fewer completed sets for a circuit workout', () => {
    expect(getNextWorkoutExercise(exercises, new Map([['a', 1]]), true)?.id).toBe('b');
  });

  it('uses the configured order to break a circuit tie', () => {
    expect(getNextWorkoutExercise(exercises, new Map([['a', 1], ['b', 1]]), true)?.id).toBe('c');
  });
});
