import * as Location from 'expo-location';
import { writeLocation } from './firebase-write';
import { snapToRoad } from './road-snap';
import { getState, useStore } from './state';
import { COLORS } from './constants';

let _watchSub: Location.LocationSubscription | null = null;
let _headingSub: Location.LocationSubscription | null = null;
let _simInterval: ReturnType<typeof setInterval> | null = null;

// ─── Request location permissions ────────────────────────────────
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// ─── Start GPS tracking ───────────────────────────────────────────
export async function startGPS(onPosition: (lat: number, lng: number, accuracy: number, heading: number | null, speed: number | null) => void): Promise<void> {
  stopGPS(); // ensure clean state

  const granted = await requestLocationPermission();
  if (!granted) {
    // Fallback to demo mode
    startSimulatedGPS(onPosition);
    return;
  }

  _watchSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 0,
    },
    (loc) => {
      const { latitude, longitude, accuracy, speed } = loc.coords;
      // Heading from watchPositionAsync can be unreliable; prefer watchHeadingAsync
      onPosition(latitude, longitude, accuracy ?? 20, null, speed ?? 0);
    },
  );

  // Watch compass heading separately for better accuracy
  _headingSub = await Location.watchHeadingAsync((heading) => {
    const h = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
    if (h != null && !isNaN(h)) {
      useStore.getState().set({ myHeading: h });
    }
  });
}

// ─── Stop GPS tracking ────────────────────────────────────────────
export function stopGPS(): void {
  _watchSub?.remove();
  _watchSub = null;
  (_headingSub as any)?.remove?.();
  _headingSub = null;
  if (_simInterval) {
    clearInterval(_simInterval);
    _simInterval = null;
  }
}

// ─── GPS position callback handler ───────────────────────────────
// Called from useGPS hook in tracker screen so we have React context.
export function handleGPSPosition(
  rawLat: number,
  rawLng: number,
  accuracy: number,
  heading: number | null,
  speed: number | null,
): { lat: number; lng: number; accuracyStr: string; accuracyLevel: 'good' | 'medium' | 'poor' } {
  const mySpeed = speed ?? 0;
  if (heading != null && mySpeed > 0.3) {
    useStore.getState().set({ myHeading: heading, mySpeed });
  } else {
    useStore.getState().set({ mySpeed });
  }

  const { lat, lng } = snapToRoad(rawLat, rawLng);

  const accuracyStr = `±${Math.round(accuracy)} m`;
  const accuracyLevel: 'good' | 'medium' | 'poor' =
    accuracy < 20 ? 'good' : accuracy < 60 ? 'medium' : 'poor';

  const state = getState();
  if (!state.sharingOn) {
    return { lat, lng, accuracyStr, accuracyLevel };
  }

  useStore.getState().set({
    myLat: lat,
    myLng: lng,
    members: state.myId
      ? {
          ...state.members,
          [state.myId]: {
            ...state.members[state.myId],
            lat,
            lng,
          },
        }
      : state.members,
  });

  if (state.myId) writeLocation(lat, lng);

  return { lat, lng, accuracyStr, accuracyLevel };
}

// ─── Demo mode: random walk around Jakarta ───────────────────────
function startSimulatedGPS(
  onPosition: (lat: number, lng: number, accuracy: number, heading: number | null, speed: number | null) => void,
): void {
  let lat = -6.2 + (Math.random() - 0.5) * 0.02;
  let lng = 106.8 + (Math.random() - 0.5) * 0.02;
  let prevLat: number | null = null;
  let prevLng: number | null = null;

  const tick = () => {
    prevLat = lat; prevLng = lng;
    lat += (Math.random() - 0.5) * 0.0004;
    lng += (Math.random() - 0.5) * 0.0004;

    let heading: number | null = null;
    if (prevLat != null && prevLng != null) {
      const dLng = lng - prevLng;
      const dLat = lat - prevLat;
      heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
    }

    onPosition(lat, lng, 15, heading, 0.8);
  };

  tick();
  _simInterval = setInterval(tick, 3000);
}
