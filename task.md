# Migration Task List: GPSLive-Tracker PWA → Expo RN

## Phase 0 — Project Bootstrap
- [x] Initialize Expo project with TypeScript template at `d:\Project\GPSLive-Tracker-RN`
- [x] Configure `app.json` (name, slug, permissions) — adding GPS permissions now
- [ ] Configure `eas.json`

## Phase 1 — Core Infrastructure
- [x] Install all dependencies
- [x] `src/constants.ts` — port from `constants.js`
- [x] `src/state.ts` — Zustand store (replaces `state.js`)
- [x] `src/firebase.ts` — Firebase config (replaces `firebase-config.js`)
- [x] `src/storage.ts` — AsyncStorage wrapper (replaces `localStorage`)
- [x] `src/firebase-write.ts` — port `firebase-write.js`

## Phase 2 — Screen Architecture
- [/] `app.json` — add GPS location permissions + update for Expo Router
- [ ] `app/_layout.tsx` — root layout with providers
- [ ] `app/index.tsx` — Join screen (modal)
- [ ] `app/tracker.tsx` — Main map screen shell

## Phase 3 — Map Component
- [ ] `components/MapView.tsx` — MapLibre map wrapper
- [ ] `components/MemberMarker.tsx` — circle/arrow marker
- [ ] `components/RouteLayer.tsx` — route polyline + dest marker

## Phase 4 — GPS & Sensors
- [x] `src/gps.ts` — expo-location watchPosition
- [x] `src/wakelock.ts` — expo-keep-awake wrapper

## Phase 5 — Road Snap
- [x] `src/road-snap.ts` — stub (road snap dropped in v1, returns raw coords)

## Phase 6 — Remaining Logic
- [ ] `src/session.ts` — Firebase presence + listeners
- [x] `src/room.ts` — room tab logic
- [x] `src/theme.ts` — RN theme (Appearance API)
- [ ] `components/MembersList.tsx`
- [ ] `components/BottomBar.tsx`
- [ ] `components/Toolbar.tsx`
- [ ] `components/Toast.tsx`
- [ ] `components/ConnectionBadge.tsx`
- [ ] `components/FollowIndicator.tsx`

## Phase 7 — Share & Deep Links
- [x] Room share via `Share.share()` — in room.ts
- [ ] Deep link room param via Expo Router

## Verification
- [ ] App boots and shows join screen
- [ ] GPS tracking works
- [ ] Firebase sync works between two devices
