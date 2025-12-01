import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { ETSEvent } from '../../types/event';
import type { ETSEventWithOpacity } from '../../hooks/usePlayback';
import { MAP_STYLES, type MapStyleKey } from '../../config/mapStyles';

// Plate boundaries are bundled as a static file (no CORS issues in production)
const PLATE_BOUNDARIES_URL = '/plate-boundaries.json';

// Cache for plate boundaries data (fetched once, reused across style changes)
let plateBoundariesCache: GeoJSON.FeatureCollection | null = null;

// Fetch plate boundaries from static file
async function fetchPlateBoundaries(): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(PLATE_BOUNDARIES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch plate boundaries: ${response.status}`);
  }
  const data: GeoJSON.FeatureCollection = await response.json();
  console.log(`Plate boundaries loaded: ${data.features?.length ?? 0} features`);
  return data;
}

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
  
  // Track current style to detect changes
  const currentStyleRef = useRef(currentStyle);
  // Track if we're in the middle of a style change
  const isStyleChanging = useRef(false);
  // Track if layers have been added
  const layersInitialized = useRef(false);

  // Safe cleanup of all custom layers/sources
  const cleanupLayers = useCallback((mapInstance: maplibregl.Map) => {
    try {
      // Remove layers first (must be done before sources)
      if (mapInstance.getLayer('events-circle')) {
        mapInstance.removeLayer('events-circle');
      }
      if (mapInstance.getLayer('plate-boundaries-layer')) {
        mapInstance.removeLayer('plate-boundaries-layer');
      }
      // Then remove sources
      if (mapInstance.getSource('events')) {
        mapInstance.removeSource('events');
      }
      if (mapInstance.getSource('plate-boundaries')) {
        mapInstance.removeSource('plate-boundaries');
      }
    } catch (e) {
      // Ignore errors during cleanup
      console.log('Cleanup warning (can be ignored):', e);
    }
    layersInitialized.current = false;
  }, []);

  // Add plate boundaries layer (vector GeoJSON for crisp rendering at all zoom levels)
  const addPlateBoundariesLayer = useCallback(async (mapInstance: maplibregl.Map, visible: boolean) => {
    if (mapInstance.getSource('plate-boundaries')) return;
    
    try {
      // Fetch GeoJSON data if not cached (bundled static file, no CORS issues)
      if (!plateBoundariesCache) {
        console.log('Loading plate boundaries from static file...');
        plateBoundariesCache = await fetchPlateBoundaries();
      }

      // Guard against null (should never happen after successful fetch)
      if (!plateBoundariesCache) {
        throw new Error('Failed to load plate boundaries data');
      }

      // Add as GeoJSON source (vector data)
      mapInstance.addSource('plate-boundaries', {
        type: 'geojson',
        data: plateBoundariesCache,
      });

      // Add line layer for plate boundaries (crisp at any zoom level)
      mapInstance.addLayer({
        id: 'plate-boundaries-layer',
        type: 'line',
        source: 'plate-boundaries',
        paint: {
          // Color based on boundary type
          'line-color': [
            'match',
            ['get', 'LABEL'],
            'Convergent Boundary', '#ff4444',  // Red for subduction
            'Divergent Boundary', '#44ff44',   // Green for spreading
            'Transform Boundary', '#ffaa00',   // Orange for transform
            '#ff6666'  // Default red
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,    // Width 1 at zoom 0
            5, 1.5,  // Width 1.5 at zoom 5
            10, 2,   // Width 2 at zoom 10
            15, 3    // Width 3 at zoom 15
          ],
          'line-opacity': 0.9,
        },
        layout: {
          visibility: visible ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    } catch (e) {
      console.error('Error adding plate boundaries layer:', e);
    }
  }, []);

  // Add events layer
  const addEventsLayer = useCallback((mapInstance: maplibregl.Map, eventsData: ETSEventWithOpacity[]) => {
    if (eventsData.length === 0) return;
    if (mapInstance.getSource('events')) return;

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
    } catch (e) {
      console.error('Error adding events layer:', e);
    }
  }, []);

  // Initialize all custom layers
  const initializeLayers = useCallback(async (mapInstance: maplibregl.Map, eventsData: ETSEventWithOpacity[], showBoundaries: boolean) => {
    // Always clean up first to ensure fresh state
    cleanupLayers(mapInstance);
    
    // Add plate boundaries first (below events)
    await addPlateBoundariesLayer(mapInstance, showBoundaries);
    // Add events on top (even if empty - we'll update data later)
    if (eventsData.length > 0) {
      addEventsLayer(mapInstance, eventsData);
    }
    
    layersInitialized.current = true;
  }, [addPlateBoundariesLayer, addEventsLayer, cleanupLayers]);

  // Initialize map - only runs once
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
          initializeLayers(mapInstance, events, showPlateBoundaries);
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layersInitialized.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle style changes - completely reinitialize layers
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded) return;
    if (currentStyle === currentStyleRef.current) return;
    if (isStyleChanging.current) return;

    isStyleChanging.current = true;
    currentStyleRef.current = currentStyle;

    // Save current view state
    const center = mapInstance.getCenter();
    const zoom = mapInstance.getZoom();
    const bearing = mapInstance.getBearing();
    const pitch = mapInstance.getPitch();

    // Capture current data for closure
    const currentEvents = [...events];
    const currentShowBoundaries = showPlateBoundaries;

    // Clean up existing layers before style change
    cleanupLayers(mapInstance);

    // Change the style
    mapInstance.setStyle(MAP_STYLES[currentStyle].url);

    // Wait for style to fully load before adding layers
    const handleStyleData = () => {
      if (!mapInstance.isStyleLoaded()) return;
      
      // Remove this listener
      mapInstance.off('styledata', handleStyleData);
      
      // Restore view
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
      mapInstance.setBearing(bearing);
      mapInstance.setPitch(pitch);

      // Small delay to ensure style internals are ready
      setTimeout(() => {
        // Re-add all layers
        initializeLayers(mapInstance, currentEvents, currentShowBoundaries);
        isStyleChanging.current = false;
      }, 50);
    };

    mapInstance.on('styledata', handleStyleData);

  }, [currentStyle, mapLoaded, events, showPlateBoundaries, cleanupLayers, initializeLayers]);

  // Toggle plate boundaries visibility - simple visibility change only
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || isStyleChanging.current) return;

    const layer = mapInstance.getLayer('plate-boundaries-layer');
    if (layer) {
      try {
        mapInstance.setLayoutProperty(
          'plate-boundaries-layer',
          'visibility',
          showPlateBoundaries ? 'visible' : 'none'
        );
      } catch (e) {
        console.warn('Could not toggle plate boundaries visibility:', e);
      }
    } else if (showPlateBoundaries && layersInitialized.current) {
      // Layer should exist but doesn't - re-add it
      addPlateBoundariesLayer(mapInstance, true);
    }
  }, [showPlateBoundaries, mapLoaded, addPlateBoundariesLayer]);

  // Update events data - just update the source data
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || isStyleChanging.current) return;

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
      } else if (layersInitialized.current && events.length > 0) {
        // Source doesn't exist but should - add it
        addEventsLayer(mapInstance, events);
      }
    } catch (e) {
      console.warn('Error updating events:', e);
    }
  }, [events, mapLoaded, addEventsLayer]);

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
