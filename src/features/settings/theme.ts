export type ThemePreference = 'system' | 'light' | 'dark';

const storageKey = 'treeninguabiline-theme';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(storageKey, preference);
  } catch {
    // Theme selection remains usable in privacy-restricted browser contexts.
  }
  applyThemePreference(preference);
}

export function initializeThemePreference() {
  const preference = getThemePreference();
  applyThemePreference(preference);
  return preference;
}
