import { afterEach, describe, expect, it, vi } from 'vitest';
import { getThemePreference, initializeThemePreference, setThemePreference } from './theme';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme preference', () => {
  it('persists and applies an explicit theme', () => {
    setThemePreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('treeninguabiline-theme')).toBe('dark');
  });

  it('uses system when the saved value is missing or invalid', () => {
    localStorage.setItem('treeninguabiline-theme', 'sepia');
    expect(getThemePreference()).toBe('system');
  });

  it('applies system on startup when no valid preference was saved', () => {
    localStorage.setItem('treeninguabiline-theme', 'sepia');
    expect(initializeThemePreference()).toBe('system');
    expect(document.documentElement.dataset.theme).toBe('system');
  });

  it('keeps the system preference when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(() => setThemePreference('system')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('system');
  });
});
