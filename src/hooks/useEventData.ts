import { useState, useEffect } from 'react';
import type { ETSEvent, ETSEventCollection } from '../types/event';

export const useEventData = () => {
  const [events, setEvents] = useState<ETSEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/ETS_events.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ETSEventCollection = await response.json();
        
        // Validate data
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON format');
        }
        
        setEvents(data.features);
        setError(null);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event data');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  return { events, isLoading, error };
};