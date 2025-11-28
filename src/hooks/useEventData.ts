import { useState, useEffect } from 'react';
import type { ETSEvent } from '../types/event';
import { fetchTremorEvents, getPresetDateRange, getRecommendedSpeed } from '../services/tremor-api';
import { usePlaybackStore } from '../stores/playbackStore';

export const useEventData = () => {
  const [events, setEvents] = useState<ETSEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dataRangePreset = usePlaybackStore((state) => state.dataRangePreset);
  const setSpeed = usePlaybackStore((state) => state.setSpeed);
  const setTimeRange = usePlaybackStore((state) => state.setTimeRange);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get date range for preset
        const { starttime, endtime } = getPresetDateRange(dataRangePreset);
        
        // Fetch from PNSN Tremor API
        const data = await fetchTremorEvents({ starttime, endtime });
        
        // Validate data
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON format from API');
        }
        
        setEvents(data.features);
        
        // Set recommended speed for this preset
        const recommendedSpeed = getRecommendedSpeed(dataRangePreset);
        setSpeed(recommendedSpeed);
        
        // Set time range from actual data if available
        if (data.features.length > 0) {
          const times = data.features.map(e => new Date(e.properties.time).getTime());
          const minTime = new Date(Math.min(...times));
          const maxTime = new Date(Math.max(...times));
          setTimeRange(minTime, maxTime);
        } else {
          // No events - use the requested date range
          const { starttime, endtime } = getPresetDateRange(dataRangePreset);
          setTimeRange(new Date(starttime), new Date(endtime));
        }
        
      } catch (err) {
        console.error('Failed to load events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event data');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [dataRangePreset, setSpeed, setTimeRange]);

  return { events, isLoading, error };
};