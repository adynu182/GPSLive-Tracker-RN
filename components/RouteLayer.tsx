import React from 'react';
import MapboxGL from '@rnmapbox/maps';
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
        <MapboxGL.ShapeSource
          id="route-src"
          shape={{
            type: 'Feature',
            properties: {},
            geometry: routeGeometry as any,
          }}
        >
          <MapboxGL.LineLayer
            id="route-lyr"
            style={{
              lineColor:   '#4a90d9',
              lineWidth:   6,
              lineOpacity: 0.85,
              lineCap:     'round',
              lineJoin:    'round',
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Destination pin */}
      <MapboxGL.PointAnnotation
        id="route-dest"
        coordinate={[routeDest.lng, routeDest.lat]}
      >
        <MapboxGL.Callout title="Tujuan" />
      </MapboxGL.PointAnnotation>
    </>
  );
}
