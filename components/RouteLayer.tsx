import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { useStore } from '../src/state';

/**
 * RouteLayer — renders the OSRM route GeoJSON line on the MapLibre map.
 * Also renders a destination pin (Marker) when a route is active.
 */
export default function RouteLayer() {
  const routeMode     = useStore((s) => s.routeMode);
  const routeDest     = useStore((s) => s.routeDest);
  const routeGeometry = useStore((s) => s.routeGeometry);

  if (routeMode !== 'active' || !routeDest) return null;

  return (
    <>
      {/* Route polyline */}
      {routeGeometry && (
        <GeoJSONSource
          id="route-src"
          data={{
            type: 'Feature',
            properties: {},
            geometry: routeGeometry as any,
          }}
        >
          <Layer
            id="route-lyr"
            type="line"
            paint={{
              'line-color':   '#4a90d9',
              'line-width':   6,
              'line-opacity': 0.85,
            }}
            layout={{
              'line-cap':  'round',
              'line-join': 'round',
            }}
          />
        </GeoJSONSource>
      )}

      {/* Destination pin */}
      <Marker
        id="route-dest"
        lngLat={[routeDest.lng, routeDest.lat]}
      >
        <View style={styles.pin}>
          <Text style={styles.pinText}>📍</Text>
        </View>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ffffff',
    elevation: 4,
  },
  pinText: { fontSize: 16 },
});
