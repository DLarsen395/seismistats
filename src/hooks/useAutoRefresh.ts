/**
 * Auto-refresh hook for earthquake data
 * Manages periodic top-off fetching of new events
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCacheStore } from '../stores/cacheStore';
import { useEarthquakeStore } from '../stores/earthquakeStore';

// Thresholds for determining refresh strategy when there's been a gap
const GAP_THRESHOLD_FULL_REFRESH_MS = 28 * 24 * 60 * 60 * 1000;  // 28 days - historical boundary
const GAP_THRESHOLD_NORMAL_REFRESH_MS = 24 * 60 * 60 * 1000;     // 24 hours - stale data threshold

export interface AutoRefreshCallbacks {
  /** Called when auto-refresh starts */
  onRefreshStart?: () => void;
  /** Called when auto-refresh completes */
  onRefreshComplete?: (newEventsCount: number) => void;
  /** Called when auto-refresh encounters an error */
  onRefreshError?: (error: Error) => void;
}

/**
 * Hook to manage auto-refresh of earthquake data.
 * Only active when on the Charts page and auto-refresh is enabled.
 *
 * @param isActive - Whether auto-refresh should be active (e.g., on Charts page)
 * @param callbacks - Optional callbacks for refresh lifecycle events
 */
export function useAutoRefresh(isActive: boolean, callbacks?: AutoRefreshCallbacks) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessingRef = useRef(false);

  const {
    autoRefresh,
    setAutoRefreshState,
    updateLastAutoRefresh,
    isEnabled: cacheEnabled,
  } = useCacheStore();

  const {
    isLoading: manualFetchInProgress,
    earthquakes,
    topOffRecentEvents,
    fetchEarthquakes,
  } = useEarthquakeStore();

  /**
   * Determine the appropriate refresh strategy based on gap since last refresh
   */
  const determineRefreshStrategy = useCallback((): 'top-off' | 'normal' | 'full' | 'skip' => {
    const { lastAutoRefresh, interval } = autoRefresh;
    const now = Date.now();

    // If never refreshed, need initial data load
    if (!lastAutoRefresh) {
      return 'skip';  // Let the initial fetch handle this
    }

    const gap = now - lastAutoRefresh;
    const intervalMs = interval * 60 * 1000;

    // If gap is less than interval, skip (too soon)
    if (gap < intervalMs * 0.9) {  // 90% of interval to account for timer drift
      return 'skip';
    }

    // If gap is more than 28 days, historical data boundary crossed - need full refresh
    if (gap >= GAP_THRESHOLD_FULL_REFRESH_MS) {
      return 'full';
    }

    // If gap is more than 24 hours, recent data may be stale - use normal refresh
    if (gap >= GAP_THRESHOLD_NORMAL_REFRESH_MS) {
      return 'normal';
    }

    // Otherwise, just do a quick top-off
    return 'top-off';
  }, [autoRefresh]);

  /**
   * Perform the auto-refresh
   */
  const performRefresh = useCallback(async () => {
    // Guard against concurrent refreshes
    if (isProcessingRef.current) {
      return;
    }

    // Don't refresh if manual fetch is in progress
    if (manualFetchInProgress) {
      return;
    }

    // Don't refresh if no earthquake data loaded yet
    if (earthquakes.length === 0) {
      return;
    }

    const strategy = determineRefreshStrategy();

    if (strategy === 'skip') {
      return;
    }

    isProcessingRef.current = true;
    setAutoRefreshState({ isRefreshing: true, newEventsFound: 0 });
    callbacks?.onRefreshStart?.();

    try {
      let newEventsCount = 0;

      if (strategy === 'top-off') {
        // Quick top-off: just fetch new events since last known
        newEventsCount = await topOffRecentEvents();
      } else {
        // Normal or full refresh: do a complete fetch (cache will handle optimization)
        const previousCount = earthquakes.length;
        await fetchEarthquakes();
        const newCount = useEarthquakeStore.getState().earthquakes.length;
        newEventsCount = Math.max(0, newCount - previousCount);
      }

      updateLastAutoRefresh();
      setAutoRefreshState({
        isRefreshing: false,
        newEventsFound: newEventsCount
      });
      callbacks?.onRefreshComplete?.(newEventsCount);
    } catch (error) {
      console.error('Auto-refresh error:', error);
      setAutoRefreshState({ isRefreshing: false, newEventsFound: 0 });
      callbacks?.onRefreshError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    manualFetchInProgress,
    earthquakes.length,
    determineRefreshStrategy,
    topOffRecentEvents,
    fetchEarthquakes,
    updateLastAutoRefresh,
    setAutoRefreshState,
    callbacks,
  ]);

  /**
   * Check if we should do an immediate refresh on activation
   * (handles the case where page hasn't been opened for a while)
   */
  const checkInitialRefresh = useCallback(async () => {
    if (!autoRefresh.enabled || !cacheEnabled) {
      return;
    }

    const strategy = determineRefreshStrategy();

    // If there's a meaningful gap, do an immediate refresh
    if (strategy !== 'skip') {
      // Small delay to let the page settle
      setTimeout(() => {
        performRefresh();
      }, 1000);
    }
  }, [autoRefresh.enabled, cacheEnabled, determineRefreshStrategy, performRefresh]);

  // Set up the interval timer
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if conditions are met
    if (!isActive || !autoRefresh.enabled || !cacheEnabled) {
      return;
    }

    // Check for initial refresh when becoming active
    checkInitialRefresh();

    // Set up the interval
    const intervalMs = autoRefresh.interval * 60 * 1000;
    intervalRef.current = setInterval(() => {
      performRefresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isActive,
    autoRefresh.enabled,
    autoRefresh.interval,
    cacheEnabled,
    checkInitialRefresh,
    performRefresh,
  ]);

  // Clear new events count after a delay (for indicator animation to complete)
  useEffect(() => {
    if (autoRefresh.newEventsFound > 0) {
      const timer = setTimeout(() => {
        setAutoRefreshState({ newEventsFound: 0 });
      }, 7000);  // 3 pulses × 2s each + 1s buffer
      return () => clearTimeout(timer);
    }
  }, [autoRefresh.newEventsFound, setAutoRefreshState]);

  return {
    isRefreshing: autoRefresh.isRefreshing,
    newEventsFound: autoRefresh.newEventsFound,
    lastAutoRefresh: autoRefresh.lastAutoRefresh,
    performRefresh,  // Expose for manual trigger if needed
  };
}
