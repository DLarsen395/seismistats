import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const prevStyleRef = useRef(currentStyle);
  const isChangingStyle = useRef(false);

  // Rebuild all custom layers - called after style load/change
  const rebuildLayers = useCallback((
    mapInstance: maplibregl.Map, 
    eventsData: ETSEventWithOpacity[], 
    plateBoundariesVisible: boolean,
    retryCount = 0
  ) => {
    console.log('rebuildLayers called:', { 
      eventsCount: eventsData.length, 
      plateBoundariesVisible,
      hasMap: !!mapInstance,
      retryCount
    });

    // Check if style is actually ready
    if (!mapInstance.isStyleLoaded()) {
      if (retryCount < 10) {
        console.log('Style not ready, retrying in 200ms...');
        setTimeout(() => rebuildLayers(mapInstance, eventsData, plateBoundariesVisible, retryCount + 1), 200);
        return;
      } else {
        console.error('Style never became ready after 10 retries');
        return;
      }
    }

    // Clear any existing custom layers first
    try {
      if (mapInstance.getLayer('events-circle')) {
        mapInstance.removeLayer('events-circle');
      }
      if (mapInstance.getSource('events')) {
        mapInstance.removeSource('events');
      }
      if (mapInstance.getLayer('plate-boundaries-layer')) {
        mapInstance.removeLayer('plate-boundaries-layer');
      }
      if (mapInstance.getSource('plate-boundaries')) {
        mapInstance.removeSource('plate-boundaries');
      }
    } catch (e) {
      console.log('Error clearing layers (expected on first load):', e);
    }

    // Add plate boundaries layer FIRST (below events)
    try {
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
          'raster-opacity': 0.7,
        },
      });

      mapInstance.setLayoutProperty(
        'plate-boundaries-layer',
        'visibility',
        plateBoundariesVisible ? 'visible' : 'none'
      );
      console.log('Plate boundaries layer added, visible:', plateBoundariesVisible);
    } catch (e) {
      console.error('Error adding plate boundaries:', e);
      // Retry if this fails
      if (retryCount < 5) {
        setTimeout(() => rebuildLayers(mapInstance, eventsData, plateBoundariesVisible, retryCount + 1), 300);
        return;
      }
    }

    // Add events layer SECOND (on top)
    if (eventsData.length > 0) {
      try {
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

        console.log('Events layer added with', eventsData.length, 'events');
      } catch (e) {
        console.error('Error adding events layer:', e);
      }
    }
  }, []);

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

        mapInstance.on('load', () => {
          console.log('Initial map load');
          rebuildLayers(mapInstance, events, showPlateBoundaries);
          setMapLoaded(true);
        });

        mapInstance.on('error', (e) => {
          // Ignore tile/source fetch errors (e.g., USGS plate boundaries service down)
          // These are non-critical and shouldn't block the map
          const errorMessage = e.error?.message || '';
          const sourceId = (e as { sourceId?: string }).sourceId;
          if (errorMessage.includes('Failed to fetch') || 
              errorMessage.includes('AJAXError') ||
              errorMessage.includes('tile') ||
              sourceId === 'plate-boundaries') {
            console.warn('Non-critical map resource error (ignored):', errorMessage);
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
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded) return;
    if (currentStyle === prevStyleRef.current) return;
    if (isChangingStyle.current) return;
    
    console.log('Style change:', prevStyleRef.current, '->', currentStyle);
    prevStyleRef.current = currentStyle;
    isChangingStyle.current = true;
    
    // Store current map state
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    const bearing = mapInstance.getBearing();
    const pitch = mapInstance.getPitch();
    
    // Capture current values for the callback
    const currentEvents = events;
    const currentShowPlateBoundaries = showPlateBoundaries;
    
    // Change the style
    mapInstance.setStyle(MAP_STYLES[currentStyle].url);
    
    // Use 'idle' event which fires when map is fully rendered
    const onIdle = () => {
      console.log('Map idle after style change, rebuilding layers');
      
      // Restore map position
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
      mapInstance.setBearing(bearing);
      mapInstance.setPitch(pitch);
      
      // Small delay to ensure style internals are ready
      setTimeout(() => {
        // Rebuild all layers with captured values
        rebuildLayers(mapInstance, currentEvents, currentShowPlateBoundaries);
        isChangingStyle.current = false;
      }, 100);
    };
    
    mapInstance.once('idle', onIdle);
    
  }, [currentStyle, mapLoaded, events, showPlateBoundaries, rebuildLayers]);

  // Toggle plate boundaries visibility (without full rebuild)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || isChangingStyle.current) return;
    
    try {
      const layer = mapInstance.getLayer('plate-boundaries-layer');
      if (layer) {
        mapInstance.setLayoutProperty(
          'plate-boundaries-layer',
          'visibility',
          showPlateBoundaries ? 'visible' : 'none'
        );
        console.log('Plate boundaries visibility set to:', showPlateBoundaries);
      }
    } catch (e) {
      console.log('Could not toggle plate boundaries:', e);
    }
  }, [showPlateBoundaries, mapLoaded]);

  // Update events data (without full rebuild if just updating source)
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || isChangingStyle.current) return;
    if (events.length === 0) return;

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
        console.log('Events source updated with', events.length, 'events');
      } else {
        // Source doesn't exist, need to rebuild
        console.log('Events source not found, rebuilding layers');
        rebuildLayers(mapInstance, events, showPlateBoundaries);
      }
    } catch (e) {
      console.log('Error updating events, rebuilding:', e);
      rebuildLayers(mapInstance, events, showPlateBoundaries);
    }
  }, [events, mapLoaded, showPlateBoundaries, rebuildLayers]);

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
