import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { ETSEvent } from '../../types/event';

// Set Mapbox access token
const token = import.meta.env.VITE_MAPBOX_TOKEN;
console.log('Mapbox token loaded:', token ? 'Yes (length: ' + token.length + ')' : 'NO TOKEN!');
mapboxgl.accessToken = token;

interface MapContainerProps {
  events: ETSEvent[];
}

export const MapContainer: React.FC<MapContainerProps> = ({ events }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!token) {
      setMapError('Mapbox token is missing. Please add VITE_MAPBOX_TOKEN to .env file.');
      return;
    }

    console.log('Initializing map with container:', mapContainer.current);
    console.log('Container dimensions:', mapContainer.current.offsetWidth, 'x', mapContainer.current.offsetHeight);

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap'
            }
          },
          layers: [{
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }]
        },
        center: [-123.0, 47.0], // Pacific Northwest
        zoom: 6.5,
        pitch: 0,
        bearing: 0,
      });

      console.log('Map instance created');

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Listen to all relevant events
      map.current.on('load', () => {
        console.log('Map load event fired!');
        setMapLoaded(true);
      });

      map.current.on('style.load', () => {
        console.log('Map style.load event fired!');
      });

      map.current.on('idle', () => {
        console.log('Map idle event fired');
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setMapError(`Failed to initialize map: ${err}`);
    }

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
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      
      {/* Error state */}
      {mapError && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#111827'
        }}>
          <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: 'rgba(127, 29, 29, 0.5)', borderRadius: '0.5rem' }}>
            <p style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '0.5rem' }}>Map Error</p>
            <p style={{ color: '#d1d5db' }}>{mapError}</p>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {!mapLoaded && !mapError && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#111827'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{ 
              width: '3rem', 
              height: '3rem', 
              border: '2px solid transparent',
              borderBottomColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#9ca3af' }}>Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};