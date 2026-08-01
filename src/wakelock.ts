import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const KEEP_AWAKE_TAG = 'gpslive-tracker';

// ─── Prevent screen from sleeping during active session ───────────
export async function requestWakeLock(): Promise<void> {
  try {
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  } catch (err) {
    console.info('Wake lock failed:', err);
  }
}

export function releaseWakeLock(): void {
  deactivateKeepAwake(KEEP_AWAKE_TAG);
}
