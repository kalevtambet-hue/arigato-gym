import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

type WakeLockSentinel = {
  release: ReturnType<typeof vi.fn>;
  addEventListener?: EventTarget['addEventListener'];
};

function WakeLockHarness({ active }: { active: boolean }) {
  useWakeLock(active);
  return null;
}

describe('useWakeLock', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('requests a screen wake lock only while a workout is active and releases it when inactive', async () => {
    const sentinel: WakeLockSentinel = { release: vi.fn().mockResolvedValue(undefined) };
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    const page = render(<WakeLockHarness active={false} />);
    expect(request).not.toHaveBeenCalled();

    page.rerender(<WakeLockHarness active />);
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));

    page.rerender(<WakeLockHarness active={false} />);
    await waitFor(() => expect(sentinel.release).toHaveBeenCalledTimes(1));
  });

  it('reacquires when the page becomes visible without duplicating an in-flight request', async () => {
    let resolveRequest: (sentinel: WakeLockSentinel) => void = () => undefined;
    const request = vi.fn(
      () => new Promise<WakeLockSentinel>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    render(<WakeLockHarness active />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);

    resolveRequest({ release: vi.fn().mockResolvedValue(undefined) });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    document.dispatchEvent(new Event('visibilitychange'));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps an in-flight request when the workout becomes active again before it resolves', async () => {
    let resolveRequest: (sentinel: WakeLockSentinel) => void = () => undefined;
    const request = vi.fn(
      () => new Promise<WakeLockSentinel>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const sentinel: WakeLockSentinel = { release: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    const page = render(<WakeLockHarness active />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    page.rerender(<WakeLockHarness active={false} />);
    page.rerender(<WakeLockHarness active />);
    resolveRequest(sentinel);
    await Promise.resolve();
    await Promise.resolve();

    expect(sentinel.release).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reacquires immediately when the browser releases the wake lock while active and visible', async () => {
    const releasedSentinel = Object.assign(new EventTarget(), {
      release: vi.fn().mockResolvedValue(undefined),
    });
    const replacementSentinel: WakeLockSentinel = { release: vi.fn().mockResolvedValue(undefined) };
    const request = vi.fn().mockResolvedValueOnce(releasedSentinel).mockResolvedValueOnce(replacementSentinel);
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    render(<WakeLockHarness active />);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    releasedSentinel.dispatchEvent(new Event('release'));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it('silently handles unsupported or rejected wake-lock requests', async () => {
    const unsupported = render(<WakeLockHarness active />);
    unsupported.unmount();

    const request = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    render(<WakeLockHarness active />);

    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  });
});
