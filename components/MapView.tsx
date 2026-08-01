import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useStore, getState } from '../src/state';
import { getCurrentMapStyleUrl } from '../src/theme';
import MemberMarker from './MemberMarker';
import RouteLayer from './RouteLayer';
import { requestRoute } from '../src/session';


interface Props {
  onMapDrag?: () => void;
  onMapTap?: (lng: number, lat: number) => void;
}

export default function MapView({ onMapDrag, onMapTap }: Props) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const mapRef    = useRef<MapLibreGL.MapView>(null);

  const members    = useStore((s) => s.members);
  const myId       = useStore((s) => s.myId);
  const myLat      = useStore((s) => s.myLat);
  const myLng      = useStore((s) => s.myLng);
  const myHeading  = useStore((s) => s.myHeading);
  const navMode    = useStore((s) => s.navMode);
  const followedUid = useStore((s) => s.followedUid);
  const firstFix   = useStore((s) => s.firstFix);
  const routeMode  = useStore((s) => s.routeMode);

  const styleUrl   = getCurrentMapStyleUrl();

  // ── Follow camera ──────────────────────────────────────────────
  useEffect(() => {
    if (!cameraRef.current) return;

    if (followedUid && members[followedUid]) {
      const m = members[followedUid];
      if (m.lat != null && m.lng != null) {
        cameraRef.current.flyTo([m.lng, m.lat], 800);
        return;
      }
    }

    if (navMode && myLat != null && myLng != null) {
      cameraRef.current.setCamera({
        centerCoordinate: [myLng, myLat],
        heading:          myHeading ?? 0,
        animationDuration: 500,
      });
      return;
    }

    if (firstFix && myLat != null && myLng != null) {
      cameraRef.current.flyTo([myLng, myLat], 800);
      useStore.getState().set({ firstFix: false });
    }
  }, [myLat, myLng, myHeading, navMode, followedUid, firstFix]);

  // ── Map tap → set route destination ──────────────────────────
  const handlePress = useCallback((e: any) => {
    const { geometry } = e;
    if (!geometry?.coordinates) return;
    const [lng, lat] = geometry.coordinates;

    if (routeMode === 'picking') {
      const state = getState();
      if (state.myLat == null) return;
      useStore.getState().set({
        routeDest:     { lat, lng },
        routeMode:     'active',
        routeLastCalc: null,
      });
      requestRoute(state.myLat, state.myLng!, lat, lng);
    }

    onMapTap?.(lng, lat);
  }, [routeMode, onMapTap]);

  // ── Drag → cancel follow ──────────────────────────────────────
  const handleRegionWillChange = useCallback((e: any) => {
    if (e.properties?.isUserInteraction) {
      onMapDrag?.();
    }
  }, [onMapDrag]);

  return (
    <MapLibreGL.MapView
      ref={mapRef}
      style={styles.map}
      styleURL={styleUrl}
      onPress={handlePress}
      onRegionWillChange={handleRegionWillChange}
      compassEnabled
      compassFadeWhenNorth
      scaleBarEnabled={false}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [106.827, -6.175], // Jakarta
          zoomLevel: 14,
        }}
      />

      {/* Member markers */}
      {Object.keys(members).map((uid) => {
        const m = members[uid];
        if (m.lat == null || m.lng == null) return null;
        return (
          <MapLibreGL.PointAnnotation
            key={uid}
            id={`member-${uid}`}
            coordinate={[m.lng, m.lat]}
          >
            <MemberMarker uid={uid} />
          </MapLibreGL.PointAnnotation>
        );
      })}

      {/* Route polyline + destination pin */}
      <RouteLayer />
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
