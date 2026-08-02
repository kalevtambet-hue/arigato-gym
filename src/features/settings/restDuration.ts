export const DEFAULT_REST_SECONDS = 60;

const storageKey = 'treeninguabiline-default-rest-seconds';

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function getDefaultRestSeconds(): number {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null || !/^\d+$/.test(stored)) {
      return DEFAULT_REST_SECONDS;
    }

    const seconds = Number(stored);
    return isNonNegativeInteger(seconds) ? seconds : DEFAULT_REST_SECONDS;
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export function setDefaultRestSeconds(seconds: number): void {
  if (!isNonNegativeInteger(seconds)) {
    return;
  }

  try {
    localStorage.setItem(storageKey, String(seconds));
  } catch {
    // The setting remains usable with the fallback in privacy-restricted contexts.
  }
}
