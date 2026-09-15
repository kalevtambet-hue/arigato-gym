type PortraitOrientationLock = {
  lock: (orientation: 'portrait') => Promise<void>;
};

export async function lockPortraitOrientation() {
  const orientation = screen.orientation as PortraitOrientationLock | undefined;
  if (!orientation?.lock) return;

  try {
    await orientation.lock('portrait');
  } catch {
    // Orientation locking is optional and browser support varies.
  }
}
