import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_REST_SECONDS,
  getDefaultRestSeconds,
  setDefaultRestSeconds,
} from './restDuration';

const storageKey = 'treeninguabiline-default-rest-seconds';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('default rest duration', () => {
  it('falls back to 60 seconds when no preference is stored', () => {
    expect(DEFAULT_REST_SECONDS).toBe(60);
    expect(getDefaultRestSeconds()).toBe(60);
  });

  it('persists and reads a valid non-negative integer', () => {
    setDefaultRestSeconds(90);

    expect(localStorage.getItem(storageKey)).toBe('90');
    expect(getDefaultRestSeconds()).toBe(90);
  });

  it('persists and reads zero seconds', () => {
    setDefaultRestSeconds(0);

    expect(localStorage.getItem(storageKey)).toBe('0');
    expect(getDefaultRestSeconds()).toBe(0);
  });

  it.each(['-1', '1.5', 'ten', ''])('falls back for an invalid stored value of %j', (value) => {
    localStorage.setItem(storageKey, value);

    expect(getDefaultRestSeconds()).toBe(DEFAULT_REST_SECONDS);
  });

  it('falls back for an unsafe stored integer', () => {
    localStorage.setItem(storageKey, String(Number.MAX_SAFE_INTEGER + 1));

    expect(getDefaultRestSeconds()).toBe(DEFAULT_REST_SECONDS);
  });

  it('does not persist an invalid value', () => {
    setDefaultRestSeconds(90);
    setDefaultRestSeconds(-1);
    setDefaultRestSeconds(1.5);

    expect(localStorage.getItem(storageKey)).toBe('90');
  });

  it('does not persist an unsafe integer', () => {
    setDefaultRestSeconds(90);
    setDefaultRestSeconds(Number.MAX_SAFE_INTEGER + 1);

    expect(localStorage.getItem(storageKey)).toBe('90');
  });

  it('falls back safely when browser storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(getDefaultRestSeconds()).toBe(DEFAULT_REST_SECONDS);
    expect(() => setDefaultRestSeconds(90)).not.toThrow();
  });
});
