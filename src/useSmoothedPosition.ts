import { useEffect, useRef, useState } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

// Shared duration for position smoothing. Fixes (both our own GPS and other
// members synced via Firebase) land roughly every ~2s — see `timeInterval`
// in gps.ts. This is kept a little under that so a glide always finishes
// before the next update, and is also used by MapView's nav-mode camera
// `easeTo` so the camera and the marker glide together instead of the
// marker lagging behind an already-centered camera.
export const MARKER_ANIMATION_DURATION_MS = 1500;

/**
 * Smoothly animates towards a new lat/lng whenever it changes, instead of
 * snapping instantly. Without this, markers visibly teleport between
 * positions on every GPS update and look choppy while walking.
 *
 * - Accepts `null` for "no fix yet" (returns `null` until a real position
 *   arrives, and shows that first position immediately — no animating in
 *   from an arbitrary default).
 * - If a new update lands mid-animation, it eases from wherever is
 *   currently on screen (not the previous target), so back-to-back updates
 *   stay seamless instead of restarting/jumping.
 */
export function useSmoothedPosition(
  lat: number | null | undefined,
  lng: number | null | undefined,
  duration: number = MARKER_ANIMATION_DURATION_MS,
): LatLng | null {
  const initial = lat != null && lng != null ? { lat, lng } : null;
  const [displayed, setDisplayed] = useState<LatLng | null>(initial);

  const toRef = useRef<LatLng | null>(initial);
  const displayedRef = useRef<LatLng | null>(initial);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) return; // no fix yet, nothing to animate

    // First real fix ever, or a duplicate of the current target: set/keep
    // directly, no animation needed.
    if (toRef.current == null) {
      const point = { lat, lng };
      toRef.current = point;
      displayedRef.current = point;
      setDisplayed(point);
      return;
    }
    if (toRef.current.lat === lat && toRef.current.lng === lng) return;

    const from = displayedRef.current ?? { lat, lng };
    const to = { lat, lng };
    toRef.current = to;

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic: quick start, gentle stop

      const next = {
        lat: from.lat + (to.lat - from.lat) * eased,
        lng: from.lng + (to.lng - from.lng) * eased,
      };
      displayedRef.current = next;
      setDisplayed(next);

      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, duration]);

  return displayed;
}
