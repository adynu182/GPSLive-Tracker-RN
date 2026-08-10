import * as Location from 'expo-location';
import { writeLocation } from './firebase-write';
import { snapToRoad } from './road-snap';
import { getState, useStore } from './state';
import { COLORS, haversine } from './constants';

let _watchSub: Location.LocationSubscription | null = null;
let _headingSub: Location.LocationSubscription | null = null;
let _simInterval: ReturnType<typeof setInterval> | null = null;

// ─── Heading source: GPS direction-of-travel vs. compass ────────
// Nav mode should rotate the map to match the direction the user is
// actually walking/driving (course-over-ground), not which way the phone
// body happens to be pointing. We prefer GPS-derived travel direction
// while moving, and only fall back to the magnetometer compass while the
// user is stationary (e.g. standing still looking around the map).
const MOVING_SPEED_ENTER = 0.5;      // m/s — start trusting GPS direction of travel
const MOVING_SPEED_EXIT = 0.2;       // m/s — drop back to compass below this
const MIN_DISTANCE_FOR_BEARING = 3;  // meters — ignore GPS jitter smaller than this
const HEADING_SMOOTHING = 0.5;       // 0-1, higher = snappier, lower = smoother

let _isMoving = false;
let _lastFixForBearing: { lat: number; lng: number } | null = null;
let _smoothedHeading: number | null = null;

// Initial bearing (0-360°, 0 = North, clockwise) from point 1 to point 2.
function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x =
    Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Whether the user counts as "moving" for heading purposes. Uses two
// thresholds (hysteresis) so the heading source doesn't flicker between
// GPS course and compass right around one speed value.
function updateMovingState(speed: number): boolean {
  if (!_isMoving && speed > MOVING_SPEED_ENTER) {
    _isMoving = true;
    _smoothedHeading = null; // don't blend against a stale compass-era value
  } else if (_isMoving && speed < MOVING_SPEED_EXIT) {
    _isMoving = false;
  }
  return _isMoving;
}

// Exponential smoothing over circular degrees (handles the 0°/360° wrap)
// so the map doesn't snap/jitter between noisy consecutive GPS fixes.
function smoothHeading(next: number): number {
  if (_smoothedHeading == null) {
    _smoothedHeading = next;
    return next;
  }
  const diff = (((next - _smoothedHeading + 180) % 360) + 360) % 360 - 180;
  _smoothedHeading = (_smoothedHeading + diff * HEADING_SMOOTHING + 360) % 360;
  return _smoothedHeading;
}

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

      // Direction of travel (course-over-ground) as reported by the OS from
      // GPS — this is where the user is actually heading, NOT which way the
      // phone is physically pointing. null/-1 means the platform couldn't
      // determine it right now (e.g. no recent movement).
      let travelHeading: number | null =
        loc.coords.heading != null && loc.coords.heading >= 0 ? loc.coords.heading : null;

      // Some devices don't report `coords.heading` reliably. Fall back to a
      // bearing computed ourselves from the last fix, but only once we've
      // moved far enough that it isn't just GPS jitter.
      if (travelHeading == null && _lastFixForBearing) {
        const moved = haversine(_lastFixForBearing.lat, _lastFixForBearing.lng, latitude, longitude);
        if (moved >= MIN_DISTANCE_FOR_BEARING) {
          travelHeading = computeBearing(_lastFixForBearing.lat, _lastFixForBearing.lng, latitude, longitude);
        }
      }
      _lastFixForBearing = { lat: latitude, lng: longitude };

      onPosition(latitude, longitude, accuracy ?? 20, travelHeading, speed ?? 0);
    },
  );

  // Compass — fallback heading source only. While the user is actively
  // moving, GPS direction-of-travel (above) wins so the map rotates with
  // the path they're walking/driving; the compass only steers the map
  // while the user is stationary (e.g. standing still looking around).
  _headingSub = await Location.watchHeadingAsync((heading) => {
    const h = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
    if (h == null || isNaN(h)) return;
    if (_isMoving) return;
    useStore.getState().set({ myHeading: h });
  });
}

// ─── Stop GPS tracking ────────────────────────────────────────────
export function stopGPS(): void {
  _watchSub?.remove();
  _watchSub = null;
  _headingSub?.remove();
  _headingSub = null;
  if (_simInterval) {
    clearInterval(_simInterval);
    _simInterval = null;
  }
  // Reset heading-source tracking so the next session doesn't start out
  // "moving" or smoothing against a stale bearing from a previous session.
  _isMoving = false;
  _lastFixForBearing = null;
  _smoothedHeading = null;
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
  const moving = updateMovingState(mySpeed);
  if (heading != null && moving) {
    useStore.getState().set({ myHeading: smoothHeading(heading), mySpeed });
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
