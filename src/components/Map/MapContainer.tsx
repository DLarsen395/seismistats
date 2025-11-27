import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { ETSEvent } from '../../types/event';

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapContainerProps {
  events: ETSEvent[];
}

export const MapContainer: React.FC<MapContainerProps> = ({ events }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-123.0, 47.0], // Pacific Northwest
      zoom: 6.5,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Set map loaded state
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Cleanup on unmount
    return () => {
      map.current?.remove();
    };
  }, []);

  // Add events to map when loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || events.length === 0) return;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: events as GeoJSON.Feature[],
    };

    // Add source if it doesn't exist
    if (!map.current.getSource('events')) {
      map.current.addSource('events', {
        type: 'geojson',
        data: geojsonData,
      });

      // Add circle layer for events
      map.current.addLayer({
        id: 'events-circle',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'magnitude'],
            0.4, 4,
            1.9, 14
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'magnitude'],
            0.4, '#10B981',  // Green
            0.7, '#F59E0B',  // Yellow
            1.2, '#F97316',  // Orange
            1.5, '#EF4444'   // Red
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Add hover effect
      map.current.on('mouseenter', 'events-circle', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', 'events-circle', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      // Add click handler for popups
      map.current.on('click', 'events-circle', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties as ETSEvent['properties'];

        new mapboxgl.Popup()
          .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`
            <div class="p-3">
              <h3 class="font-bold text-lg mb-2">Event #${props.id}</h3>
              <div class="space-y-1 text-sm">
                <p><strong>Magnitude:</strong> ${props.magnitude}</p>
                <p><strong>Depth:</strong> ${props.depth.toFixed(1)} km</p>
                <p><strong>Energy:</strong> ${props.energy.toLocaleString()}</p>
                <p><strong>Duration:</strong> ${props.duration}s</p>
                <p><strong>Stations:</strong> ${props.num_stas}</p>
                <p><strong>Time:</strong> ${new Date(props.time).toLocaleString()}</p>
              </div>
            </div>
          `)
          .addTo(map.current!);
      });
    } else {
      // Update existing source
      const source = map.current.getSource('events') as mapboxgl.GeoJSONSource;
      source.setData(geojsonData);
    }
  }, [events, mapLoaded]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};