'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ActivityMapDarkProps {
  polyline: string;
  revealAnimation?: boolean;
  className?: string;
}

function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

export default function ActivityMapDark({ polyline, revealAnimation = false, className = '' }: ActivityMapDarkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const coords = decodePolyline(polyline);
    if (coords.length === 0) return;

    const center = coords[Math.floor(coords.length / 2)];

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
      center,
      zoom: 12,
      interactive: true,
      attributionControl: false,
    });

    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current.on('load', () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      // Fit bounds first
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 48, animate: false });

      // Add glow layer (wider, dimmer)
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });

      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#fb923c',
          'line-width': 12,
          'line-opacity': 0.15,
          'line-blur': 4,
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#fb923c',
          'line-width': 3,
          'line-opacity': 0,
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });

      if (revealAnimation) {
        // Animate route drawing
        const STEPS = 120;
        const DURATION = 2200;
        let step = 0;
        const start = performance.now();

        const animate = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 2);
          step = Math.floor(eased * STEPS);

          // Fade in opacity as route draws
          map.setPaintProperty('route-line', 'line-opacity', Math.min(progress * 2, 0.9));
          map.setPaintProperty('route-glow', 'line-opacity', Math.min(progress * 0.3, 0.15));

          // Draw route progressively by slicing coordinates
          const visibleCoords = coords.slice(0, Math.max(2, Math.floor(eased * coords.length)));
          (map.getSource('route') as maplibregl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: visibleCoords },
          });

          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      } else {
        map.setPaintProperty('route-line', 'line-opacity', 0.9);
        map.setPaintProperty('route-glow', 'line-opacity', 0.15);
      }

      // Start/end markers
      if (coords.length > 0) {
        new maplibregl.Marker({ color: '#10b981', scale: 0.7 })
          .setLngLat(coords[0])
          .addTo(map);
        new maplibregl.Marker({ color: '#fb923c', scale: 0.7 })
          .setLngLat(coords[coords.length - 1])
          .addTo(map);
      }
    });

    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [polyline, revealAnimation]);

  return <div ref={containerRef} className={`w-full h-full rounded-2xl overflow-hidden ${className}`} />;
}
