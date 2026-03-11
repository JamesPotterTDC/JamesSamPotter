'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ActivityMapProps {
  polyline: string;
}

function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

export default function ActivityMap({ polyline }: ActivityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const coordinates = decodePolyline(polyline);
    
    if (coordinates.length === 0) {
      return;
    }

    const center = coordinates[Math.floor(coordinates.length / 2)];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.stadiamaps.com/styles/outdoors.json',
      center: center,
      zoom: 12,
    });

    if (coordinates.length > 0) {
      map.current.on('load', () => {
        if (!map.current) return;

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#FC4C02',
            'line-width': 3,
          },
        });

        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );

        map.current.fitBounds(bounds, { padding: 40 });
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [polyline]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
}
