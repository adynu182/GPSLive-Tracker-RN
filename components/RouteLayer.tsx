import React from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useStore } from '../src/state';

/**
 * RouteLayer — renders the OSRM route GeoJSON line on the MapLibre map.
 * Also renders a destination pin (PointAnnotation) when a route is active.
 */
export default function RouteLayer() {
  const routeMode     = useStore((s) => s.routeMode);
  const routeDest     = useStore((s) => s.routeDest);
  const routeGeometry = useStore((s) => (s as any).routeGeometry);

  if (routeMode !== 'active' || !routeDest) return null;

  return (
    <>
      {/* Route polyline */}
      {routeGeometry && (
        <MapLibreGL.ShapeSource
          id="route-src"
          shape={{
            type: 'Feature',
            properties: {},
            geometry: routeGeometry as any,
          }}
        >
          <MapLibreGL.LineLayer
            id="route-lyr"
            style={{
              lineColor:   '#4a90d9',
              lineWidth:   6,
              lineOpacity: 0.85,
              lineCap:     'round',
              lineJoin:    'round',
            }}
          />
        </MapLibreGL.ShapeSource>
      )}

      {/* Destination pin */}
      <MapLibreGL.PointAnnotation
        id="route-dest"
        coordinate={[routeDest.lng, routeDest.lat]}
      >
        <MapLibreGL.Callout title="Tujuan" />
      </MapLibreGL.PointAnnotation>
    </>
  );
}
