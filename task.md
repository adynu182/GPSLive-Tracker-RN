# Migration Task List: GPSLive-Tracker PWA → Expo RN

## Phase 0 — Project Bootstrap
- [/] Initialize Expo project with TypeScript template at `d:\Project\GPSLive-Tracker-RN`
- [ ] Configure `app.json` (name, slug, permissions)
- [ ] Configure `eas.json`

## Phase 1 — Core Infrastructure
- [ ] Install all dependencies
- [ ] `src/constants.ts` — port from `constants.js`
- [ ] `src/state.ts` — Zustand store (replaces `state.js`)
- [ ] `src/firebase.ts` — Firebase config (replaces `firebase-config.js`)
- [ ] `src/storage.ts` — AsyncStorage wrapper (replaces `localStorage`)
- [ ] `src/firebase-write.ts` — port `firebase-write.js`

## Phase 2 — Screen Architecture
- [ ] `app/_layout.tsx` — root layout with providers
- [ ] `app/index.tsx` — Join screen (modal)
- [ ] `app/tracker.tsx` — Main map screen shell

## Phase 3 — Map Component
- [ ] `components/MapView.tsx` — MapLibre map wrapper
- [ ] `components/MemberMarker.tsx` — circle/arrow marker
- [ ] `components/RouteLayer.tsx` — route polyline + dest marker

## Phase 4 — GPS & Sensors
- [ ] `src/gps.ts` — expo-location watchPosition
- [ ] `src/wakelock.ts` — expo-keep-awake wrapper

## Phase 5 — Road Snap
- [ ] `src/road-snap.ts` — stub (road snap dropped in v1, returns raw coords)

## Phase 6 — Remaining Logic
- [ ] `src/session.ts` — Firebase presence + listeners
- [ ] `src/room.ts` — room tab logic
- [ ] `src/theme.ts` — RN theme (Appearance API)
- [ ] `components/MembersList.tsx`
- [ ] `components/BottomBar.tsx`
- [ ] `components/Toolbar.tsx`
- [ ] `components/Toast.tsx`
- [ ] `components/ConnectionBadge.tsx`
- [ ] `components/FollowIndicator.tsx`

## Phase 7 — Share & Deep Links
- [ ] Room share via `Share.share()`
- [ ] Deep link room param via Expo Router

## Verification
- [ ] App boots and shows join screen
- [ ] GPS tracking works
- [ ] Firebase sync works between two devices
