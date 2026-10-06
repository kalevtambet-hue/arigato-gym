export const DEFAULT_EXERCISE_REST_SECONDS = 60;

const durationStorageKey = 'treeninguabiline-exercise-rest-seconds';
const visibilityStorageKey = 'treeninguabiline-show-exercise-rest-timer';

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function getExerciseRestSeconds(): number {
  try {
    const value = localStorage.getItem(durationStorageKey);
    if (value === null || !/^\d+$/.test(value)) {
      return DEFAULT_EXERCISE_REST_SECONDS;
    }

    const seconds = Number(value);
    return isNonNegativeInteger(seconds) ? seconds : DEFAULT_EXERCISE_REST_SECONDS;
  } catch {
    return DEFAULT_EXERCISE_REST_SECONDS;
  }
}

export function setExerciseRestSeconds(seconds: number): void {
  if (!isNonNegativeInteger(seconds)) {
    return;
  }

  try {
    localStorage.setItem(durationStorageKey, String(seconds));
  } catch {
    // The setting remains usable with the fallback in privacy-restricted contexts.
  }
}

export function getShowExerciseRestTimer(): boolean {
  try {
    return localStorage.getItem(visibilityStorageKey) !== 'false';
  } catch {
    return true;
  }
}

export function setShowExerciseRestTimer(value: boolean): void {
  try {
    localStorage.setItem(visibilityStorageKey, String(value));
  } catch {
    // The setting remains usable with the fallback in privacy-restricted contexts.
  }
}
