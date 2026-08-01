// ─── Road Snap — DROPPED in v1 ────────────────────────────────────
// The PWA used MapLibre's queryRenderedFeatures() (browser WebGL API)
// to snap GPS points to nearby road geometries. This has no equivalent
// in the React Native map SDK.
//
// v1 Plan: pass raw GPS coordinates through unchanged.
// Future: replace with OSRM /nearest API or a local Turf.js algorithm.

export function snapToRoad(lat: number, lng: number): { lat: number; lng: number } {
  // No-op passthrough — raw GPS coordinates used as-is.
  return { lat, lng };
}

export function toggleRoadSnap(): void {
  // No-op — road snap not implemented in v1.
  // TODO: implement OSRM /nearest API call in v2.
}
