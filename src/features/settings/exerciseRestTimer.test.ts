import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_EXERCISE_REST_SECONDS,
  getExerciseRestSeconds,
  getShowExerciseRestTimer,
  setExerciseRestSeconds,
  setShowExerciseRestTimer,
} from './exerciseRestTimer';

describe('exercise rest timer settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses a 60-second visible timer by default', () => {
    expect(DEFAULT_EXERCISE_REST_SECONDS).toBe(60);
    expect(getExerciseRestSeconds()).toBe(60);
    expect(getShowExerciseRestTimer()).toBe(true);
  });

  it('persists a valid duration and disabled visibility', () => {
    setExerciseRestSeconds(120);
    setShowExerciseRestTimer(false);

    expect(getExerciseRestSeconds()).toBe(120);
    expect(getShowExerciseRestTimer()).toBe(false);
  });

  it('falls back when the stored duration is invalid', () => {
    localStorage.setItem('treeninguabiline-exercise-rest-seconds', '12.5');

    expect(getExerciseRestSeconds()).toBe(60);
  });
});
