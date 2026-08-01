# GPSLive-Tracker Migration Complete

The migration from the Vanilla JS PWA to an Expo React Native application is now complete! All logic and UI components have been ported successfully and type-checked via TypeScript.

## What Was Done

> [!NOTE]
> All core features from the PWA have been brought over, but architecture has been adapted to follow React Native best practices.

1. **State Management**: Migrated from a bare mutable object to a **Zustand** store (`src/state.ts`), giving us reactive UI updates across all components.
2. **Screens (Expo Router)**: 
   - `app/index.tsx`: The Join Room screen with avatar selection and room code creation.
   - `app/tracker.tsx`: The main map screen tracking all members.
3. **Map Rendering (`@rnmapbox/maps`)**: Integrated MapLibre natively using `@rnmapbox/maps`.
   - Built the `MapView.tsx` with native components for markers (`PointAnnotation`) and routes (`LineLayer`).
4. **GPS Tracking**: Swapped `navigator.geolocation` for `expo-location`. Added proper background permissions in `app.json`.
5. **Background execution**: Replaced web wake-locks with `expo-keep-awake` to ensure the screen doesn't turn off while driving/tracking.
6. **Persistence**: Swapped `localStorage` for `@react-native-async-storage/async-storage` with Promise-based logic to handle asynchronous reads.
7. **Type Safety**: Entire codebase is now in strict TypeScript, fixing numerous potential runtime crashes (especially around AsyncStorage types and dark-mode fallback inferences).

## Technical Adjustments

> [!IMPORTANT]
> - The web-based "Road Snap" using `queryRenderedFeatures()` has been dropped for V1 since it isn't supported directly by the native SDK. GPS points show up exactly where the device reports them.
> - The OSRM routing remains functional via standard `fetch()` API calls to calculate navigation paths to a tapped destination on the map.

## Next Steps: Verification

The codebase compiles with 0 TypeScript errors. Next, you should verify the native build:

1. Create a development build or run via Expo Go:
   ```bash
   npx expo start
   ```
2. **Check the Join Screen**: Ensure avatars and the room code generator work.
3. **Check the Map**: Start a session and make sure MapLibre loads the base tiles. Test the route building by tapping on the map.
4. **Permissions**: Make sure Android/iOS prompt for GPS location permissions.

If you encounter any issues on real devices with the MapLibre view or routing, let me know and we can refine the map logic further!
