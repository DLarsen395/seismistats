import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { ETSEvent } from '../../types/event';
import type { ETSEventWithOpacity } from '../../hooks/usePlayback';
import { MAP_STYLES, type MapStyleKey } from '../../config/mapStyles';

// USGS Plate Boundaries tile service
const PLATE_BOUNDARIES_TILES = 'https://earthquake.usgs.gov/arcgis/rest/services/eq/map_plateboundaries/MapServer/tile/{z}/{y}/{x}';

interface MapContainerProps {
  events: ETSEventWithOpacity[];
  currentStyle: MapStyleKey;
  showPlateBoundaries: boolean;
}

export const MapContainer: React.FC<MapContainerProps> = ({ 
  events, 
  currentStyle, 
  showPlateBoundaries,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const currentStyleRef = useRef(currentStyle);

  // Add custom layers (plate boundaries + events)
  const addCustomLayers = (mapInstance: maplibregl.Map, eventsData: ETSEventWithOpacity[], showBoundaries: boolean) => {
    // Add plate boundaries layer
    if (!mapInstance.getSource('plate-boundaries')) {
      mapInstance.addSource('plate-boundaries', {
        type: 'raster',
        tiles: [PLATE_BOUNDARIES_TILES],
        tileSize: 256,
        attribution: '© USGS Earthquake Hazards Program',
      });

      mapInstance.addLayer({
        id: 'plate-boundaries-layer',
        type: 'raster',
        source: 'plate-boundaries',
        paint: {
          'raster-opacity': 0.8,
        },
        layout: {
          visibility: showBoundaries ? 'visible' : 'none',
        },
      });
    }

    // Add events source and layer
    if (eventsData.length > 0 && !mapInstance.getSource('events')) {
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: eventsData.map(event => ({
          type: 'Feature' as const,
          geometry: event.geometry,
          properties: {
            ...event.properties,
            opacity: event.opacity,
          },
        })),
      };

      mapInstance.addSource('events', {
        type: 'geojson',
        data: geojsonData,
      });

      mapInstance.addLayer({
        id: 'events-circle',
        type: 'circle',
        source: 'events',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'magnitude'], 0.5],
            0.4, 3,
            1.9, 10.5
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'depth'], 35],
            25, '#FFA500',
            30, '#FF6B35',
            35, '#FF3366',
            40, '#E91E63',
            45, '#9C27B0'
          ],
          'circle-opacity': ['coalesce', ['get', 'opacity'], 0.8],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 0.8],
        },
      });

      // Add hover effect
      mapInstance.on('mouseenter', 'events-circle', () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', 'events-circle', () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      // Add click handler for popups
      mapInstance.on('click', 'events-circle', (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties as ETSEvent['properties'];

        new maplibregl.Popup({ className: 'dark-popup' })
          .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`
            <div style="padding: 12px; color: #f3f4f6;">
              <h3 style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px; color: #fff;">Event #${props.id}</h3>
              <div style="font-size: 0.875rem; line-height: 1.6;">
                <p><strong>Magnitude:</strong> ${props.magnitude ?? 'N/A'}</p>
                <p><strong>Depth:</strong> ${props.depth?.toFixed(1) ?? 'N/A'} km</p>
                <p><strong>Energy:</strong> ${props.energy?.toLocaleString() ?? 'N/A'}</p>
                <p><strong>Duration:</strong> ${props.duration ?? 'N/A'}s</p>
                <p><strong>Stations:</strong> ${props.num_stas ?? 'N/A'}</p>
                <p><strong>Time:</strong> ${props.time ? new Date(props.time).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          `)
          .addTo(mapInstance);
      });
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      try {
        const mapInstance = new maplibregl.Map({
          container: mapContainer.current,
          style: MAP_STYLES[currentStyle].url,
          center: [-124.0, 44.5],
          zoom: 5.2,
        });

        mapRef.current = mapInstance;
        currentStyleRef.current = currentStyle;

        mapInstance.on('load', () => {
          addCustomLayers(mapInstance, events, showPlateBoundaries);
          setMapLoaded(true);
        });

        mapInstance.on('error', (e) => {
          // Ignore tile fetch errors - non-critical
          const errorMessage = e.error?.message || '';
          if (errorMessage.includes('Failed to fetch') || 
              errorMessage.includes('AJAXError') ||
              errorMessage.includes('tile')) {
            console.warn('Non-critical tile error (ignored):', errorMessage);
            return;
          }
          console.error('MapLibre error:', e);
          setMapError(`Map error: ${e.error?.message || JSON.stringify(e)}`);
        });

        mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setMapError(`Failed to initialize map: ${err}`);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle style changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (currentStyle === currentStyleRef.current) return;

    const mapInstance = mapRef.current;
    currentStyleRef.current = currentStyle;

    // Save current view
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    const bearing = mapInstance.getBearing();
    const pitch = mapInstance.getPitch();

    // Capture current state for closure
    const currentEvents = [...events];
    const currentShowBoundaries = showPlateBoundaries;

    mapInstance.setStyle(MAP_STYLES[currentStyle].url);

    mapInstance.once('style.load', () => {
      // Restore view
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
      mapInstance.setBearing(bearing);
      mapInstance.setPitch(pitch);

      // Re-add custom layers
      addCustomLayers(mapInstance, currentEvents, currentShowBoundaries);
    });
  }, [currentStyle, mapLoaded, events, showPlateBoundaries]);

  // Toggle plate boundaries visibility
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded) return;

    try {
      if (mapInstance.getLayer('plate-boundaries-layer')) {
        mapInstance.setLayoutProperty(
          'plate-boundaries-layer',
          'visibility',
          showPlateBoundaries ? 'visible' : 'none'
        );
      }
    } catch {
      // Layer might not exist yet
    }
  }, [showPlateBoundaries, mapLoaded]);

  // Update events data
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || events.length === 0) return;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: events.map(event => ({
        type: 'Feature' as const,
        geometry: event.geometry,
        properties: {
          ...event.properties,
          opacity: event.opacity,
        },
      })),
    };

    try {
      const source = mapInstance.getSource('events') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojsonData);
      }
    } catch (e) {
      console.log('Error updating events:', e);
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
