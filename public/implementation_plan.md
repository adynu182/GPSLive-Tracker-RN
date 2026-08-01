# GPSLive-Tracker: PWA → React Native Expo Migration Plan

## Background

**GPSLive-Tracker** is a real-time GPS sharing app built as a Vite PWA using vanilla JavaScript and HTML. The goal is to migrate it to a proper React Native Expo app for native iOS/Android distribution.

### Current Tech Stack (PWA)
| Layer | Technology |
|---|---|
| Bundler | Vite + `vite-plugin-pwa` |
| Language | Vanilla JS (ES Modules) |
| UI | Plain HTML + CSS |
| Map | MapLibre GL JS (WebGL) |
| GPS | `navigator.geolocation.watchPosition` |
| Real-time | Firebase Realtime Database |
| Road snap | Turf.js + MapLibre `queryRenderedFeatures` |
| Routing | OSRM REST API (fetch) |
| Storage | `localStorage` |
| Offline | Service Worker + Workbox |

---

## User Review Required

> [!IMPORTANT]
> **Map library replacement is the most critical decision.** MapLibre GL JS is a WebGL-based library designed for browsers and cannot run in React Native directly. Two options are available — please choose one before implementation begins (see Open Questions below).

> [!WARNING]
> **Road snap via `queryRenderedFeatures` will NOT be portable.** This PWA feature queries the browser-rendered tile viewport to find nearby roads. There is no native equivalent in React Native map SDKs. A server-side road-snapping solution (e.g., OSRM or a dedicated Snap API) will need to replace the client-side algorithm.

> [!CAUTION]
> **The `jajankuy` project in `d:\Project\jajankuy` is already an Expo app.** This plan creates a brand-new Expo project initialized from scratch at `d:\Project\GPSLive-Tracker-RN` (or any folder you choose). If you want the code to live alongside the PWA in the same repo, we can adjust the structure.

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Map Library**: Which map library do you prefer for the native app?
> - **Option A: `@rnmapbox/maps`** — MapLibre for React Native. Closest 1:1 feature parity with the current PWA (same vector tiles, same style URLs, similar API). Requires Expo Development Build (cannot run in Expo Go). Recommended.
> - **Option B: `react-native-maps`** — Uses native Google Maps (Android) / Apple Maps (iOS). Simpler setup but requires API keys, different tile system, and loses offline tile caching.

> [!IMPORTANT]
> **Q2 — Project location**: Where should the new Expo project be initialized?
> - `d:\Project\GPSLive-Tracker-RN` (separate sibling folder)
> - A subdirectory inside `d:\Project\GPSLive-Tracker` (monorepo structure)

> [!IMPORTANT]
> **Q3 — Road Snap replacement**: Since client-side `queryRenderedFeatures` snapping won't work in native:
> - **Option A**: Replace with OSRM snap endpoint (server-side, adds a network call per GPS tick)
> - **Option B**: Drop road snap entirely in v1, add it later
> - **Option C**: Implement a simplified local polyline-snapping algorithm using Turf.js with preloaded road data

---

## Proposed Changes

### Phase 0 — Project Bootstrap

#### [NEW] Expo project scaffold
- Initialize a new Expo project using `npx create-expo-app@latest` with TypeScript template.
- Configure EAS Build (`eas.json`) for development and production builds.
- Set up `app.json` with GPS location permissions for both iOS and Android.

---

### Phase 1 — Core Infrastructure

#### [NEW] `src/state.ts` (Zustand store)
Replace the plain mutable JS object (`state.js`) with a **Zustand** store. This gives React Native components reactive access to app state without prop drilling. One-to-one mapping of all existing state fields.

#### [NEW] `src/firebase.ts`
Port `firebase-config.js` as-is. Firebase JS SDK (`firebase@10`) is fully compatible with React Native and Expo. Replace `import.meta.env.VITE_*` with `expo-constants` / `.env` via `expo-env`.

#### [NEW] `src/storage.ts`
Replace `localStorage` with **`@react-native-async-storage/async-storage`**. API is identical (key-value string store) but async. All `getItem`/`setItem` calls need to be awaited.

---

### Phase 2 — Screen Architecture (Expo Router)

Use **Expo Router** (file-based routing, already the default in modern Expo).

```
app/
  _layout.tsx          ← Root layout (providers: Zustand, gesture handler)
  index.tsx            ← Join modal (equivalent to #joinOverlay)
  tracker.tsx          ← Main map screen (equivalent to the main layout)
```

#### [NEW] `app/index.tsx` — Join Screen
Port the join modal HTML into a React Native screen:
- Tab selector: **Create Room** / **Join Room** (using `Pressable` tabs)
- Text inputs for room code and name (`TextInput`)
- Emoji picker row (`FlatList` horizontal)
- "Bagikan Lokasi" button → navigates to `tracker` screen
- Offline detection via `@react-native-community/netinfo`

#### [NEW] `app/tracker.tsx` — Map Screen
Main screen containing the map, sidebar, bottom bar, and toolbar.

---

### Phase 3 — Map Component

#### [NEW] `components/MapView.tsx`
> [!IMPORTANT]
> This depends on the answer to **Q1** above.

**If Option A (`@rnmapbox/maps`):**
- Wrap `MapboxGL.MapView` with the OpenFreeMap Liberty style URL (same as PWA).
- Port marker logic: custom `MapboxGL.PointAnnotation` with circle/arrow SVG elements.
- Port trail logic: `MapboxGL.ShapeSource` + `MapboxGL.LineLayer` (direct equivalent of PWA's GeoJSON source + line layer).
- Port route line: same approach.
- Camera animation: `MapboxGL.Camera` with `animationMode: 'easeTo'` for smooth follow.
- Navigation mode (heading-based camera rotation): `MapboxGL.Camera` bearing property.

**If Option B (`react-native-maps`):**
- Use `MapView` with `Marker` and `Polyline` components.
- Must switch from vector tiles (OpenFreeMap) to Google Maps / Apple Maps tiles.
- Custom marker elements rendered as React Native views inside `Marker`.

#### [NEW] `components/MemberMarker.tsx`
Reusable marker component: circle with number (regular member) or arrow SVG (nav mode self).

#### [NEW] `components/RouteLayer.tsx`
Renders the route polyline and destination pin on the map.

---

### Phase 4 — GPS & Sensors

#### [NEW] `src/gps.ts`
Replace `navigator.geolocation.watchPosition` with **`expo-location`**:
```ts
// PWA
navigator.geolocation.watchPosition(onGPS, onGPSErr, opts);

// Expo
Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }, onGPS);
```
- Request `foreground` location permission via `expo-location`.
- For background tracking (screen off), request `background` location permission and use `expo-task-manager`.
- Heading: use `Location.watchHeadingAsync()` instead of relying on `coords.heading` (more accurate on mobile).

#### [NEW] `src/wakelock.ts`
Replace `navigator.wakeLock` with **`expo-keep-awake`**:
```ts
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
```

---

### Phase 5 — Road Snap (Replacement Strategy)

#### [MODIFY] `src/road-snap.ts`
The current algorithm uses `state.map.queryRenderedFeatures()` which has no native equivalent.

**Recommended replacement (Option A — OSRM snap):**
```
GET https://router.project-osrm.org/nearest/v1/driving/{lng},{lat}
```
- Called per GPS tick but throttled (max once per 5s, skip if moved < 5m).
- Returns the nearest point on a road.
- Falls back to raw GPS coordinate if the request fails or times out.

---

### Phase 6 — Remaining Logic Ports

#### [NEW] `src/session.ts`
Port `session.js` Firebase presence logic. Firebase JS SDK works identically in React Native. Replace:
- `BroadcastChannel` (browser-only) → **not needed** in native (no multi-tab concept)
- `document.getElementById(...)` DOM calls → Zustand state updates that components react to
- `history.replaceState(...)` deep link → **Expo Router** deep link (`router.setParams({ room: id })`)

#### [NEW] `src/ui.ts` → split into components
The `ui.js` module mixes DOM manipulation with business logic. In React Native, this splits into:
- `components/MembersList.tsx` — sidebar member list
- `components/BottomBar.tsx` — distance chips bar
- `components/Toolbar.tsx` — main bottom toolbar (GPS badge, action buttons, sharing toggle, logout)
- `components/Toast.tsx` — toast notification (use `react-native-toast-message` or custom)
- `components/ConnectionBadge.tsx` — online/offline indicator
- `components/FollowIndicator.tsx` — "Following..." indicator with cancel button

#### [NEW] `src/theme.ts`
Replace CSS `data-theme` attribute with React Native's `Appearance.getColorScheme()` + a theme context/Zustand slice. Colors are stored in a typed theme object instead of CSS variables.

#### [NEW] `src/room.ts`
Port `room.js` with no structural changes needed. Replace DOM interactions with Zustand state.

#### [NEW] `src/constants.ts`
Direct port of `constants.js`. No changes needed.

---

### Phase 7 — Share & Deep Links

#### Replace PWA sharing with native share sheet
- `Share.share({ url: ... })` from React Native core replaces `navigator.share()`.
- Room code deep links via **Expo Router** universal links (`?room=XXXX`).

#### Remove PWA-specific features
These browser features are dropped entirely (native equivalents handle them automatically):
- Service Worker / Workbox (offline caching) → Expo handles app bundling natively
- `beforeinstallprompt` / "Install App" button → distributed via App Store / Play Store
- `BroadcastChannel` → not applicable in native
- Fullscreen API → native apps are always fullscreen

---

## Key Dependency Mapping

| PWA | React Native Expo |
|---|---|
| `maplibre-gl` | `@rnmapbox/maps` (Option A) or `react-native-maps` (Option B) |
| `navigator.geolocation` | `expo-location` |
| `navigator.wakeLock` | `expo-keep-awake` |
| `localStorage` | `@react-native-async-storage/async-storage` |
| `navigator.share()` | `Share` from `react-native` |
| `navigator.onLine` | `@react-native-community/netinfo` |
| `vite-plugin-pwa` / SW | *(dropped — native app)* |
| `BroadcastChannel` | *(dropped — not applicable)* |
| `document.getElementById` | Zustand state + React components |
| CSS variables / themes | React Native StyleSheet + Zustand theme slice |
| `@turf/nearest-point-on-line` | OSRM `/nearest` API (see road snap replacement) |
| `fetch` (OSRM routes) | `fetch` *(unchanged)* |
| `firebase` JS SDK | `firebase` JS SDK *(unchanged)* |

---

## Verification Plan

### Automated Tests
- None initially (parity verification done manually).

### Manual Verification
1. **Join screen**: Can create/join a room, pick an emoji, enter a name.
2. **GPS tracking**: Location updates appear on map in real-time; accuracy indicator updates.
3. **Multi-user**: Two devices in the same room can see each other's markers moving.
4. **Sharing toggle**: Toggling sharing off hides marker from others; distance chips update.
5. **Route**: Tap map to set destination; route line appears and recalculates as you move.
6. **Follow mode**: Tapping a member marker follows that member's camera.
7. **Nav mode**: Nav mode activates arrow marker and rotates map with heading.
8. **Offline nav**: Offline mode works without a room code / Firebase connection.
9. **Reconnect**: Dropping and restoring network reconnects Firebase presence cleanly.
10. **Dark mode**: Theme switches correctly between light and dark.

### Build Verification
- `eas build --platform android --profile preview` produces an installable APK.
- `eas build --platform ios --profile preview` produces a TestFlight build.
