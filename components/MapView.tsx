import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Map, Camera, Marker, MapRef, CameraRef } from '@maplibre/maplibre-react-native';
import { useStore, getState } from '../src/state';
import { MAP_STYLES, useAppTheme } from '../src/theme';
import MemberMarker from './MemberMarker';
import RouteLayer from './RouteLayer';
import { requestRoute } from '../src/session';

interface Props {
  onMapDrag?: () => void;
  onMapTap?: (lng: number, lat: number) => void;
}

export default function MapView({ onMapDrag, onMapTap }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const members = useStore((s) => s.members);
  const myLat = useStore((s) => s.myLat);
  const myLng = useStore((s) => s.myLng);
  const myHeading = useStore((s) => s.myHeading);
  const navMode = useStore((s) => s.navMode);
  const followedUid = useStore((s) => s.followedUid);
  const firstFix = useStore((s) => s.firstFix);
  const routeMode = useStore((s) => s.routeMode);
  const fitAllCounter = useStore((s) => s.fitAllCounter);
  const zoomInCounter = useStore((s) => s.zoomInCounter);
  const zoomOutCounter = useStore((s) => s.zoomOutCounter);
  const resetCompassCounter = useStore((s) => s.resetCompassCounter);
  const navZoomCounter = useStore((s) => s.navZoomCounter);

  const appTheme = useAppTheme();
  const styleUrl = MAP_STYLES[appTheme];

  // ── Follow camera ──────────────────────────────────────────────
  useEffect(() => {
    if (!cameraRef.current) return;

    if (followedUid && members[followedUid]) {
      const m = members[followedUid];
      if (m.lat != null && m.lng != null) {
        cameraRef.current.flyTo({ center: [m.lng, m.lat], duration: 800 });
        return;
      }
    }

    if (navMode && myLat != null && myLng != null) {
      cameraRef.current.easeTo({
        center: [myLng, myLat],
        bearing: myHeading ?? 0,
        pitch: 45,
        duration: 500,
      });
      return;
    }

    if (firstFix && myLat != null && myLng != null) {
      cameraRef.current.flyTo({ center: [myLng, myLat], duration: 800 });
      useStore.getState().set({ firstFix: false });
    }
  }, [myLat, myLng, myHeading, navMode, followedUid, firstFix]);

  // ── Zoom In ───────────────────────────────────────────────────
  useEffect(() => {
    if (!zoomInCounter || !mapRef.current || !cameraRef.current) return;
    (async () => {
      try {
        const zoom = await mapRef.current!.getZoom();
        cameraRef.current!.zoomTo(Math.min(zoom + 1.2, 20), { duration: 300 });
      } catch (e) { }
    })();
  }, [zoomInCounter]);

  // ── Zoom Out ──────────────────────────────────────────────────
  useEffect(() => {
    if (!zoomOutCounter || !mapRef.current || !cameraRef.current) return;
    (async () => {
      try {
        const zoom = await mapRef.current!.getZoom();
        cameraRef.current!.zoomTo(Math.max(zoom - 1.2, 1), { duration: 300 });
      } catch (e) { }
    })();
  }, [zoomOutCounter]);

  // ── Reset Compass ─────────────────────────────────────────────
  useEffect(() => {
    if (!resetCompassCounter || !cameraRef.current) return;
    cameraRef.current.zoomTo(15, { bearing: 0, pitch: 0, duration: 400 });
  }, [resetCompassCounter]);

  // ── Nav mode zoom → zoom to level 18 ─────────────────────────
  useEffect(() => {
    if (!navZoomCounter || !cameraRef.current) return;
    cameraRef.current.zoomTo(18, { duration: 500 });
  }, [navZoomCounter]);

  // ── Fit all members ────────────────────────────────────────────
  useEffect(() => {
    if (!fitAllCounter || !cameraRef.current) return;
    const activeMembers = Object.values(members).filter(
      (m) => m.lat != null && m.lng != null && m.sharing !== false,
    );

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    activeMembers.forEach((m) => {
      if (m.lat! < minLat) minLat = m.lat!;
      if (m.lat! > maxLat) maxLat = m.lat!;
      if (m.lng! < minLng) minLng = m.lng!;
      if (m.lng! > maxLng) maxLng = m.lng!;
    });

    // Minimum bounding box delta (~100m) to prevent fitBounds from zooming in beyond level 18
    const minDelta = 0.001;
    if (maxLat - minLat < minDelta) {
      const midLat = (minLat + maxLat) / 2;
      minLat = midLat - minDelta / 2;
      maxLat = midLat + minDelta / 2;
    }
    if (maxLng - minLng < minDelta) {
      const midLng = (minLng + maxLng) / 2;
      minLng = midLng - minDelta / 2;
      maxLng = midLng + minDelta / 2;
    }

    cameraRef.current.fitBounds(
      [minLng, minLat, maxLng, maxLat],
      { padding: { top: 80, bottom: 160, left: 50, right: 50 }, duration: 800 },
    );
  }, [fitAllCounter]);

  // ── Map tap → set route destination ──────────────────────────
  const handlePress = useCallback((e: any) => {
    const lngLat = e?.nativeEvent?.lngLat;
    if (!lngLat || lngLat.length < 2) return;
    const [lng, lat] = lngLat;

    if (routeMode === 'picking') {
      const state = getState();
      if (state.myLat == null) return;
      useStore.getState().set({
        routeDest: { lat, lng },
        routeMode: 'active',
        routeLastCalc: null,
      });
      requestRoute(state.myLat, state.myLng!, lat, lng);
    }

    onMapTap?.(lng, lat);
  }, [routeMode, onMapTap]);

  // ── Drag → cancel follow ──────────────────────────────────────
  const handleRegionWillChange = useCallback((e: any) => {
    if (e?.nativeEvent?.userInteraction) {
      onMapDrag?.();
    }
  }, [onMapDrag]);

  return (
    <Map
      ref={mapRef}
      style={styles.map}
      mapStyle={styleUrl}
      onPress={handlePress}
      onRegionWillChange={handleRegionWillChange}
      compass={false}
      scaleBar={false}
    >
      <Camera
        ref={cameraRef}
        maxZoom={20}
        initialViewState={{
          center: [106.827, -6.175], // Jakarta
          zoom: 14,
        }}
      />

      {/* Member markers */}
      {Object.keys(members).map((uid) => {
        const m = members[uid];
        if (m.lat == null || m.lng == null) return null;
        return (
          <Marker
            key={uid}
            id={`member-${uid}`}
            lngLat={[m.lng, m.lat]}
          >
            <MemberMarker uid={uid} />
          </Marker>
        );
      })}

      {/* Route polyline + destination pin */}
      <RouteLayer />
    </Map>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
