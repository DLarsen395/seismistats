import { useEffect, useRef, useCallback } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';
import type { ETSEvent } from '../types/event';

// Milliseconds per day
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Event with opacity for fading
export interface ETSEventWithOpacity extends ETSEvent {
  opacity: number;
}

interface UsePlaybackProps {
  events: ETSEvent[];
  onFilteredEventsChange: (events: ETSEventWithOpacity[], currentTime: Date | null) => void;
}

export const usePlayback = ({ events, onFilteredEventsChange }: UsePlaybackProps) => {
  const { 
    isPlaying, 
    speed,  // days per second
    currentTime, 
    startTime, 
    endTime,
    rangeStart,
    rangeEnd,
    fadeOutDuration, // seconds of real-time fade
    showAllEvents,
    setCurrentTime, 
    setTimeRange 
  } = usePlaybackStore();
  
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  
  // Use refs for values that change during animation to avoid effect restarts
  const currentTimeRef = useRef(currentTime);
  const rangeEndRef = useRef(rangeEnd);
  const speedRef = useRef(speed);
  
  // Keep refs in sync
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { rangeEndRef.current = rangeEnd; }, [rangeEnd]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Initialize time range from events
  useEffect(() => {
    if (events.length === 0) return;
    
    const times = events
      .map(e => new Date(e.properties.time).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    
    if (times.length > 0) {
      const start = new Date(times[0]);
      const end = new Date(times[times.length - 1]);
      setTimeRange(start, end);
    }
  }, [events, setTimeRange]);

  // Filter events based on current playback time with opacity for fading
  const getFilteredEvents = useCallback((): ETSEventWithOpacity[] => {
    if (showAllEvents || !currentTime) {
      return events.map(e => ({ ...e, opacity: 0.8 }));
    }

    const currentMs = currentTime.getTime();
    // Calculate fade window based on speed and fadeOutDuration (seconds)
    // fadeOutDuration seconds at current speed = X days
    const fadeWindowDays = fadeOutDuration * speed;
    const fadeWindowMs = fadeWindowDays * MS_PER_DAY;
    const windowStart = currentMs - fadeWindowMs;

    // Only include events within range
    const effectiveStart = rangeStart?.getTime() || startTime?.getTime() || 0;
    const effectiveEnd = rangeEnd?.getTime() || endTime?.getTime() || Infinity;

    return events
      .filter(event => {
        const eventTime = new Date(event.properties.time).getTime();
        // Must be within user-selected range and within current playback window
        return eventTime >= effectiveStart && 
               eventTime <= effectiveEnd &&
               eventTime <= currentMs && 
               eventTime >= windowStart;
      })
      .map(event => {
        const eventTime = new Date(event.properties.time).getTime();
        // Calculate opacity: 1.0 for new events, fading to 0 at windowStart
        const age = currentMs - eventTime;
        const opacity = Math.max(0.1, Math.min(0.9, 1 - (age / fadeWindowMs)));
        return { ...event, opacity };
      });
  }, [events, currentTime, fadeOutDuration, speed, showAllEvents, rangeStart, rangeEnd, startTime, endTime]);

  // Animation loop - only restart when isPlaying changes
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTickRef.current) {
        lastTickRef.current = timestamp;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentT = currentTimeRef.current;
      const endT = rangeEndRef.current;
      const spd = speedRef.current;

      if (!currentT || !endT) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaMs = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      // Calculate time advancement
      const secondsElapsed = deltaMs / 1000;
      const daysAdvanced = secondsElapsed * spd;
      const msAdvanced = daysAdvanced * MS_PER_DAY;

      const newTime = new Date(currentT.getTime() + msAdvanced);

      if (newTime >= endT) {
        setCurrentTime(endT);
        usePlaybackStore.getState().pause();
      } else {
        setCurrentTime(newTime);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    lastTickRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, setCurrentTime]);

  // Update filtered events when playback state changes
  useEffect(() => {
    const filtered = getFilteredEvents();
    onFilteredEventsChange(filtered, showAllEvents ? null : currentTime);
  }, [currentTime, showAllEvents, getFilteredEvents, onFilteredEventsChange]);

  return {
    currentTime,
    startTime,
    endTime,
    rangeStart,
    rangeEnd,
    isPlaying,
    speed,
    showAllEvents,
    filteredEvents: getFilteredEvents(),
  };
};
