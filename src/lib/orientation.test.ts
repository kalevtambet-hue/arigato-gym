import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockPortraitOrientation } from './orientation';

const originalOrientation = window.screen.orientation;

afterEach(() => {
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: originalOrientation,
  });
});

describe('lockPortraitOrientation', () => {
  it('requests portrait lock when the API is available', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { lock },
    });

    await lockPortraitOrientation();

    expect(lock).toHaveBeenCalledWith('portrait');
  });

  it('ignores missing and rejected orientation locks', async () => {
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: undefined,
    });

    await expect(lockPortraitOrientation()).resolves.toBeUndefined();

    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { lock: vi.fn().mockRejectedValue(new Error('Not allowed')) },
    });

    await expect(lockPortraitOrientation()).resolves.toBeUndefined();
  });
});
