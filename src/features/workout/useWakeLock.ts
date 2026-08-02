import { useEffect, useRef } from 'react';

type WakeLockSentinel = {
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

type WakeLockApi = {
  request: (type: 'screen') => Promise<WakeLockSentinel>;
};

function getWakeLockApi() {
  return (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
}

export function useWakeLock(isActive: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const requestInFlightRef = useRef(false);
  const wantsWakeLockRef = useRef(isActive);

  useEffect(() => {
    wantsWakeLockRef.current = isActive;

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        void sentinel.release().catch(() => undefined);
      }
    };

    const request = async () => {
      const wakeLock = getWakeLockApi();
      if (!wantsWakeLockRef.current || sentinelRef.current || requestInFlightRef.current || !wakeLock) {
        return;
      }

      requestInFlightRef.current = true;
      try {
        const sentinel = await wakeLock.request('screen');
        if (!wantsWakeLockRef.current) {
          void sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            if (wantsWakeLockRef.current && document.visibilityState === 'visible') {
              void request();
            }
          }
        });
      } catch {
        // Wake locks are optional and may be rejected by the browser or operating system.
      } finally {
        requestInFlightRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void request();
      }
    };

    if (isActive) {
      void request();
      document.addEventListener('visibilitychange', onVisibilityChange);
    } else {
      release();
    }

    return () => {
      wantsWakeLockRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      release();
    };
  }, [isActive]);
}
