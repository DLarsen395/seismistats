/**
 * Zustand store for earthquake data and chart settings
 */

import { create } from 'zustand';
import { subDays } from 'date-fns';
import type {
  EarthquakeFeature,
  DailyEarthquakeAggregate,
} from '../services/usgs-earthquake-api';
import type {
  TimeRange,
  RegionScope,
  AppView,
} from '../types/earthquake';
import { USGS_DATA_RANGE } from '../types/earthquake';
import {
  fetchUSGSEarthquakes,
  fetchWorldwideEarthquakes,
  aggregateEarthquakesByDay,
  getEarthquakeSummary,
} from '../services/usgs-earthquake-api';
import {
  queryCache,
  storeEarthquakes,
  type CacheQuery,
} from '../services/earthquake-cache';
import { useCacheStore } from './cacheStore';

// Check if V2 API mode is enabled
const USE_API = import.meta.env.VITE_USE_API === 'true';

interface EarthquakeSummary {
  total: number;
  avgMagnitude: number;
  maxMagnitude: number;
  minMagnitude: number;
  avgDepth: number;
  maxDepth: number;
  dateRange: { start: Date; end: Date } | null;
  largestEvent: EarthquakeFeature | null;
}

interface EarthquakeStore {
  // Current app view
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Earthquake data
  earthquakes: EarthquakeFeature[];
  dailyAggregates: DailyEarthquakeAggregate[];
  summary: EarthquakeSummary | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;

  // Track what magnitude range the currently loaded data covers
  // Used to avoid refetching when filtering to a subset
  loadedMinMagnitude: number | null;
  loadedMaxMagnitude: number | null;
  loadedTimeRange: TimeRange | null;
  loadedRegionScope: RegionScope | null;

  // Filter settings - now with min AND max magnitude
  minMagnitude: number;
  maxMagnitude: number;
  timeRange: TimeRange;
  regionScope: RegionScope;

  // Custom date range (used when timeRange === 'custom')
  customStartDate: Date | null;
  customEndDate: Date | null;

  // Actions
  setMinMagnitude: (mag: number) => void;
  setMaxMagnitude: (mag: number) => void;
  setTimeRange: (range: TimeRange) => void;
  setRegionScope: (scope: RegionScope) => void;
  setCustomDateRange: (startDate: Date, endDate: Date) => void;

  // Data fetching
  fetchEarthquakes: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Auto-refresh top-off (fetches only new events since last known)
  topOffRecentEvents: () => Promise<number>;  // Returns count of new events
}

/**
 * Get number of days for a time range
 */
function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case '7days': return 7;
    case '30days': return 30;
    case '90days': return 90;
    case '365days': return 365;
    case '2years': return 730;
    case '5years': return 1825;
    case '10years': return 3650;
    case '15years': return 5475;
    case '20years': return 7300;
    case '25years': return 9125;
    case 'custom': return 0;  // Will use custom dates
    default: return 30;
  }
}

/**
 * Progress callback for chunk fetching
 */
interface FetchProgress {
  currentChunk: number;
  totalChunks: number;
  currentChunkStart: string;
  currentChunkEnd: string;
  eventsFound: number;
  message: string;
}

/**
 * Progress callback for stale day fetching
 */
interface StaleDayProgress {
  currentDay: number;
  totalDays: number;
  currentDate: string;
  eventsFound: number;
}

/**
 * Callback to receive intermediate data during fetching
 */
interface IntermediateDataCallback {
  (features: EarthquakeFeature[]): void;
}

/**
 * Fetch only specific stale days (not a continuous range)
 * This is much more efficient when cache has partial data
 */
async function fetchStaleDays(
  staleDays: string[],
  regionScope: RegionScope,
  minMagnitude: number,
  maxMagnitude: number | undefined,
  onProgress?: (progress: StaleDayProgress) => void,
  onIntermediateData?: IntermediateDataCallback,
): Promise<EarthquakeFeature[]> {
  const allFeatures: EarthquakeFeature[] = [];
  const seenIds = new Set<string>();
  const fetchFn = regionScope === 'us' ? fetchUSGSEarthquakes : fetchWorldwideEarthquakes;

  // Sort stale days to group consecutive days for batch fetching
  const sortedDays = [...staleDays].sort();

  // Determine max range size based on magnitude to avoid hitting 20k API limit
  // Lower magnitudes have more events per day, so use smaller ranges
  // Each US region query returns up to 20k events, and we query 5 regions
  // Typical daily counts: M-2+ ~300-600/day per region, M0+ ~150-350, M2+ ~30-100
  let maxRangeDays: number;
  if (minMagnitude >= 6) {
    maxRangeDays = 3650; // 10 years - very few M6+ events
  } else if (minMagnitude >= 5) {
    maxRangeDays = 365; // 1 year
  } else if (minMagnitude >= 4) {
    maxRangeDays = 180; // 6 months
  } else if (minMagnitude >= 3) {
    maxRangeDays = 60; // 2 months
  } else if (minMagnitude >= 2) {
    maxRangeDays = 14; // 2 weeks - ~10k events, well under 20k limit
  } else if (minMagnitude >= 1) {
    maxRangeDays = 7; // 1 week
  } else if (minMagnitude >= 0) {
    maxRangeDays = 5; // 5 days - ~2k events, safe margin
  } else {
    // For negative magnitudes, use 3 days - daily counts are ~300-600 per region
    // 3 days * 600 * 5 regions = 9k, well under 20k limit
    maxRangeDays = 3;
  }

  // Group consecutive days into ranges, respecting max range size
  const ranges: { start: string; end: string }[] = [];
  let rangeStart = sortedDays[0];
  let rangeEnd = sortedDays[0];
  let rangeDayCount = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(rangeEnd);
    const currDate = new Date(sortedDays[i]);
    const dayDiff = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);

    if (dayDiff === 1 && rangeDayCount < maxRangeDays) {
      // Consecutive day and within limit, extend range
      rangeEnd = sortedDays[i];
      rangeDayCount++;
    } else {
      // Either gap in days or hit max range size, start new range
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = sortedDays[i];
      rangeEnd = sortedDays[i];
      rangeDayCount = 1;
    }
  }
  // Don't forget the last range
  if (rangeStart) {
    ranges.push({ start: rangeStart, end: rangeEnd });
  }

  let daysFetched = 0;
  let rangesFetched = 0;

  for (const range of ranges) {
    const startDate = new Date(range.start);
    // Add 1 day to end to make it inclusive
    const endDate = new Date(range.end);
    endDate.setDate(endDate.getDate() + 1);

    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

    onProgress?.({
      currentDay: daysFetched + 1,
      totalDays: staleDays.length,
      currentDate: rangeDays > 1 ? `${range.start} to ${range.end}` : range.start,
      eventsFound: allFeatures.length,
    });

    try {
      const response = await fetchFn({
        starttime: startDate,
        endtime: endDate,
        minmagnitude: minMagnitude > -2 ? minMagnitude : undefined,
        maxmagnitude: maxMagnitude && maxMagnitude < 10 ? maxMagnitude : undefined,
        limit: 20000,
      });

      // Deduplicate as we go
      for (const feature of response.features) {
        if (!seenIds.has(feature.id)) {
          seenIds.add(feature.id);
          allFeatures.push(feature);
        }
      }

      daysFetched += rangeDays;
      rangesFetched++;

      // Update intermediate data for progressive chart updates
      // Throttle to every 5 ranges to balance responsiveness vs memory
      const isLastRange = ranges.indexOf(range) === ranges.length - 1;
      if (onIntermediateData && (rangesFetched % 5 === 0 || isLastRange)) {
        onIntermediateData(allFeatures);
      }

      // Small delay between ranges to avoid rate limiting (only if more ranges to fetch)
      if (ranges.indexOf(range) < ranges.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (err) {
      console.error(`Error fetching range ${range.start} to ${range.end}:`, err);
      throw err;
    }
  }

  return allFeatures;
}

/**
 * Fetch data in chunks to avoid API limits for large date ranges
 * USGS API can return max 20000 events per query
 */
async function fetchInChunks(
  startDate: Date,
  endDate: Date,
  regionScope: RegionScope,
  minMagnitude: number,
  maxMagnitude: number | undefined,
  onProgress?: (progress: FetchProgress) => void,
  onIntermediateData?: IntermediateDataCallback,
): Promise<EarthquakeFeature[]> {
  const allFeatures: EarthquakeFeature[] = [];
  const seenIds = new Set<string>();

  // Calculate total days
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

  // Determine chunk size based on magnitude filter AND time range
  // For short time ranges (< 14 days), we can be more aggressive with chunk sizes
  // since we won't hit the 20k limit as easily
  let chunkSizeDays: number;
  const isShortRange = totalDays <= 14;

  if (minMagnitude >= 6) {
    chunkSizeDays = 3650; // 10 years - very few M6+ events
  } else if (minMagnitude >= 5) {
    chunkSizeDays = 365; // 1 year - few M5+ events
  } else if (minMagnitude >= 4) {
    chunkSizeDays = 180; // 6 months - moderate M4+ events
  } else if (minMagnitude >= 3) {
    chunkSizeDays = isShortRange ? 14 : 60; // 2 weeks or 2 months
  } else if (minMagnitude >= 2) {
    chunkSizeDays = isShortRange ? 7 : 14; // 1 week or 2 weeks
  } else if (minMagnitude >= 1) {
    chunkSizeDays = isShortRange ? 7 : 7; // 1 week
  } else if (minMagnitude >= 0) {
    chunkSizeDays = isShortRange ? 3 : 3; // 3 days
  } else {
    // For negative magnitudes (-2 to -1), there can be thousands per day
    // For short ranges, try 2 days; for long ranges, use 1 day
    chunkSizeDays = isShortRange ? 2 : 1;
  }

  // Calculate number of chunks
  const totalChunks = Math.max(1, Math.ceil(totalDays / chunkSizeDays));

  // If total days <= chunk size, just do one request
  if (totalDays <= chunkSizeDays) {
    onProgress?.({
      currentChunk: 1,
      totalChunks: 1,
      currentChunkStart: startDate.toISOString().split('T')[0],
      currentChunkEnd: endDate.toISOString().split('T')[0],
      eventsFound: 0,
      message: 'Fetching earthquake data...',
    });

    const fetchFn = regionScope === 'us' ? fetchUSGSEarthquakes : fetchWorldwideEarthquakes;
    const response = await fetchFn({
      starttime: startDate,
      endtime: endDate,
      minmagnitude: minMagnitude > -2 ? minMagnitude : undefined,
      maxmagnitude: maxMagnitude && maxMagnitude < 10 ? maxMagnitude : undefined,
      limit: 20000,
    });
    return response.features;
  }

  // Split into chunks
  let chunkStart = new Date(startDate);
  let chunkNumber = 0;
  const fetchFn = regionScope === 'us' ? fetchUSGSEarthquakes : fetchWorldwideEarthquakes;

  while (chunkStart < endDate) {
    chunkNumber++;
    const chunkEnd = new Date(Math.min(
      chunkStart.getTime() + chunkSizeDays * 24 * 60 * 60 * 1000,
      endDate.getTime()
    ));

    const chunkStartStr = chunkStart.toISOString().split('T')[0];
    const chunkEndStr = chunkEnd.toISOString().split('T')[0];

    // Report progress BEFORE fetching
    onProgress?.({
      currentChunk: chunkNumber,
      totalChunks,
      currentChunkStart: chunkStartStr,
      currentChunkEnd: chunkEndStr,
      eventsFound: allFeatures.length,
      message: `Fetching ${chunkStartStr} to ${chunkEndStr}...`,
    });

    try {
      const response = await fetchFn({
        starttime: chunkStart,
        endtime: chunkEnd,
        minmagnitude: minMagnitude > -2 ? minMagnitude : undefined,
        maxmagnitude: maxMagnitude && maxMagnitude < 10 ? maxMagnitude : undefined,
        limit: 20000,
      });

      // Deduplicate as we go
      for (const feature of response.features) {
        if (!seenIds.has(feature.id)) {
          seenIds.add(feature.id);
          allFeatures.push(feature);
        }
      }

      // Call intermediate data callback less frequently to avoid memory pressure
      // Only update every 10 chunks and don't sort (saves memory with large datasets)
      if (onIntermediateData && chunkNumber % 10 === 0) {
        // Pass current data without copying - aggregation functions will handle it
        onIntermediateData(allFeatures);
      }

      // Minimal delay between requests - USGS API can handle rapid requests
      // Only add delay if we have many chunks to avoid rate limiting on very large queries
      if (chunkEnd < endDate && totalChunks > 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (err) {
      console.error(`Error fetching chunk ${chunkStart.toISOString()} to ${chunkEnd.toISOString()}:`, err);
      throw err;
    }

    chunkStart = chunkEnd;
  }

  // Sort by time descending (most recent first)
  allFeatures.sort((a, b) => b.properties.time - a.properties.time);

  return allFeatures;
}

export const useEarthquakeStore = create<EarthquakeStore>((set, get) => ({
  // Initial state - Charts is the default view
  currentView: 'earthquake-charts',
  earthquakes: [],
  dailyAggregates: [],
  summary: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // Track what data is currently loaded (for avoiding redundant fetches)
  loadedMinMagnitude: null,
  loadedMaxMagnitude: null,
  loadedTimeRange: null,
  loadedRegionScope: null,

  // Default filter settings - now M4+ to M9+ (no upper limit)
  minMagnitude: 4,
  maxMagnitude: 10,  // 10 = no upper limit
  timeRange: '7days',  // Default to 7 days for fast initial load
  regionScope: 'us',

  // Custom date range (for 'custom' timeRange)
  customStartDate: null,
  customEndDate: null,

  // View setter
  setCurrentView: (view) => set({ currentView: view }),

  // Filter setters - use client-side filtering when possible to avoid refetch
  setMinMagnitude: (mag) => {
    const { maxMagnitude, loadedMinMagnitude, loadedMaxMagnitude, loadedTimeRange, loadedRegionScope,
            earthquakes, timeRange, regionScope } = get();

    // Ensure min doesn't exceed max
    const newMin = mag;
    const newMax = mag > maxMagnitude ? mag : maxMagnitude;
    set({ minMagnitude: newMin, maxMagnitude: newMax });

    // Check if we can filter client-side:
    // - Same time range and region
    // - New magnitude range is a SUBSET of loaded data
    if (loadedMinMagnitude !== null && loadedMaxMagnitude !== null &&
        loadedTimeRange === timeRange && loadedRegionScope === regionScope &&
        newMin >= loadedMinMagnitude && newMax <= loadedMaxMagnitude &&
        earthquakes.length > 0) {
      // Filter existing data client-side instead of refetching
      const filtered = earthquakes.filter(eq => {
        const m = eq.properties.mag ?? 0;
        return m >= newMin && m <= newMax;
      });
      const dailyAggregates = aggregateEarthquakesByDay(filtered);
      const summary = getEarthquakeSummary(filtered);
      set({ dailyAggregates, summary });
    } else {
      // Need to fetch new data
      get().fetchEarthquakes();
    }
  },

  setMaxMagnitude: (mag) => {
    const { minMagnitude, loadedMinMagnitude, loadedMaxMagnitude, loadedTimeRange, loadedRegionScope,
            earthquakes, timeRange, regionScope } = get();

    // Ensure max doesn't go below min
    const newMax = mag;
    const newMin = mag < minMagnitude ? mag : minMagnitude;
    set({ maxMagnitude: newMax, minMagnitude: newMin });

    // Check if we can filter client-side
    if (loadedMinMagnitude !== null && loadedMaxMagnitude !== null &&
        loadedTimeRange === timeRange && loadedRegionScope === regionScope &&
        newMin >= loadedMinMagnitude && newMax <= loadedMaxMagnitude &&
        earthquakes.length > 0) {
      // Filter existing data client-side
      const filtered = earthquakes.filter(eq => {
        const m = eq.properties.mag ?? 0;
        return m >= newMin && m <= newMax;
      });
      const dailyAggregates = aggregateEarthquakesByDay(filtered);
      const summary = getEarthquakeSummary(filtered);
      set({ dailyAggregates, summary });
    } else {
      // Need to fetch new data
      get().fetchEarthquakes();
    }
  },

  setTimeRange: (range) => {
    set({ timeRange: range });
    // Don't auto-fetch for 'custom' - wait for date selection
    if (range !== 'custom') {
      get().fetchEarthquakes();
    }
  },

  setRegionScope: (scope) => {
    set({ regionScope: scope });
    get().fetchEarthquakes();
  },

  // Custom date range setter
  setCustomDateRange: (startDate, endDate) => {
    set({
      customStartDate: startDate,
      customEndDate: endDate,
      timeRange: 'custom',
    });
    get().fetchEarthquakes();
  },

  // Fetch earthquake data based on current filters
  fetchEarthquakes: async () => {
    // In V2 API mode, skip client-side fetching - data comes from server
    if (USE_API) {
      console.log('[earthquakeStore] V2 API mode - skipping client-side fetch');
      return;
    }

    const { minMagnitude, maxMagnitude, timeRange, regionScope, customStartDate, customEndDate, isLoading } = get();
    const cacheStore = useCacheStore.getState();

    // Prevent concurrent fetches
    if (isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    // Show initial processing message
    cacheStore.setProgress({
      operation: 'validating',
      currentStep: 0,
      totalSteps: 0,
      message: 'Preparing to fetch data...',
      startedAt: Date.now(),
    });

    try {
      let startTime: Date;
      let endTime: Date;

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startTime = customStartDate;
        endTime = customEndDate;
      } else {
        const days = getTimeRangeDays(timeRange);
        startTime = subDays(new Date(), days);
        endTime = new Date();
      }

      // Clamp dates to valid USGS data range
      const earliestAllowed = USGS_DATA_RANGE.earliestDate;
      const latestAllowed = USGS_DATA_RANGE.getLatestDate();

      if (startTime < earliestAllowed) {
        startTime = earliestAllowed;
      }
      if (endTime > latestAllowed) {
        endTime = latestAllowed;
      }

      // Validate date range
      if (startTime >= endTime) {
        throw new Error('Start date must be before end date');
      }

      let earthquakes: EarthquakeFeature[] = [];

      // Progress callback for fetch operations
      const handleFetchProgress = (progress: { currentChunk: number; totalChunks: number; currentChunkStart: string; currentChunkEnd: string; eventsFound: number; message: string }) => {
        cacheStore.setProgress({
          operation: 'fetching',
          currentStep: progress.currentChunk,
          totalSteps: progress.totalChunks,
          message: progress.message,
          startedAt: cacheStore.progress.startedAt || Date.now(),
          currentDate: `${progress.currentChunkStart} → ${progress.currentChunkEnd}`,
          eventsLoaded: progress.eventsFound,
        });
      };

      // Check cache first if enabled
      if (cacheStore.isEnabled) {
        const cacheQuery: CacheQuery = {
          startDate: startTime,
          endDate: endTime,
          minMagnitude,
          maxMagnitude,
          regionScope,
        };

        cacheStore.setProgress({
          operation: 'validating',
          currentStep: 0,
          totalSteps: 0,
          message: 'Checking cache...',
          startedAt: Date.now(),
        });

        const cacheResult = await queryCache(cacheQuery);

        if (cacheResult.isComplete) {
          // All data from cache!
          earthquakes = cacheResult.earthquakes;
        } else {
          // Need to fetch missing/stale days - but ONLY those days, not the full range!
          const { staleDays, earthquakes: cachedEarthquakes } = cacheResult;

          // Update progress
          cacheStore.setProgress({
            operation: 'fetching',
            currentStep: 0,
            totalSteps: staleDays.length,
            message: `Fetching ${staleDays.length} missing days...`,
            startedAt: Date.now(),
          });

          // Handler to progressively update UI during stale day fetches
          // Merges cached data with fresh data as it streams in
          const handleIntermediateData = (freshFeaturesSoFar: EarthquakeFeature[]) => {
            // Combine cached earthquakes with fresh ones fetched so far
            const combinedFeatures = [...cachedEarthquakes, ...freshFeaturesSoFar];
            const dailyAggregates = aggregateEarthquakesByDay(combinedFeatures);
            const summary = getEarthquakeSummary(combinedFeatures);
            set({
              earthquakes: combinedFeatures,  // Update for charts that need raw data
              dailyAggregates,
              summary,
            });
            // Note: Cache stats are NOT updated here because data isn't stored yet.
            // The progress banner shows live eventsLoaded count instead.
          };

          // Show cached data immediately while fetching missing days
          if (cachedEarthquakes.length > 0) {
            handleIntermediateData([]);
          }

          // Fetch ONLY the stale days
          const freshEarthquakes = await fetchStaleDays(
            staleDays,
            regionScope,
            minMagnitude,
            maxMagnitude,
            (progress) => {
              cacheStore.setProgress({
                operation: 'fetching',
                currentStep: progress.currentDay,
                totalSteps: progress.totalDays,
                message: `Fetching ${progress.currentDate}...`,
                startedAt: cacheStore.progress.startedAt || Date.now(),
                currentDate: progress.currentDate,
                eventsLoaded: cachedEarthquakes.length + progress.eventsFound,
              });
            },
            handleIntermediateData,  // Progressive chart updates
          );

          // Store ONLY the fresh data in cache
          if (freshEarthquakes.length > 0) {
            cacheStore.setProgress({
              operation: 'storing',
              currentStep: 0,
              totalSteps: 1,
              message: 'Caching new data...',
              startedAt: Date.now(),
            });

            await storeEarthquakes(freshEarthquakes, cacheQuery, (progress) => {
              cacheStore.setProgress(progress);
            });
          }

          // Merge cached + fresh earthquakes
          earthquakes = [...cachedEarthquakes, ...freshEarthquakes];

          // Refresh cache stats
          cacheStore.refreshStats();
        }
      } else {
        // Cache disabled, fetch directly with progress
        // Handler to progressively update UI during long fetches
        const handleIntermediateData = (intermediateFeatures: EarthquakeFeature[]) => {
          const dailyAggregates = aggregateEarthquakesByDay(intermediateFeatures);
          const summary = getEarthquakeSummary(intermediateFeatures);
          set({
            earthquakes: intermediateFeatures,  // Update for charts that need raw data
            dailyAggregates,
            summary,
          });
        };

        earthquakes = await fetchInChunks(
          startTime,
          endTime,
          regionScope,
          minMagnitude,
          maxMagnitude,
          handleFetchProgress,
          handleIntermediateData,
        );
      }

      // Reset progress
      cacheStore.setProgress({
        operation: 'idle',
        currentStep: 0,
        totalSteps: 0,
        message: '',
        startedAt: null,
      });

      // Refresh cache info to update last updated timestamp
      cacheStore.refreshInfo();
      cacheStore.refreshStats();

      // Update last auto-refresh timestamp (for the "Last auto-refresh" display)
      // This ensures it shows a time even after initial load
      cacheStore.updateLastAutoRefresh();

      const dailyAggregates = aggregateEarthquakesByDay(earthquakes);
      const summary = getEarthquakeSummary(earthquakes);

      set({
        earthquakes,
        dailyAggregates,
        summary,
        isLoading: false,
        lastFetched: new Date(),
        // Track what data was loaded for client-side filtering optimization
        loadedMinMagnitude: minMagnitude,
        loadedMaxMagnitude: maxMagnitude,
        loadedTimeRange: timeRange,
        loadedRegionScope: regionScope,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch earthquake data';
      set({
        error: message,
        isLoading: false,
      });

      // Reset cache progress on error
      useCacheStore.getState().setProgress({
        operation: 'idle',
        currentStep: 0,
        totalSteps: 0,
        message: '',
        startedAt: null,
      });

      console.error('Error fetching earthquakes:', err);
    }
  },

  // Force refresh data
  refreshData: async () => {
    await get().fetchEarthquakes();
  },

  /**
   * Top-off fetch: Get only NEW events since the most recent event in current data.
   * This is used for auto-refresh to quickly check for new earthquakes.
   * Returns the count of new events found.
   */
  topOffRecentEvents: async () => {
    const { earthquakes, regionScope, minMagnitude, maxMagnitude, isLoading } = get();
    const cacheStore = useCacheStore.getState();

    // Don't run if a manual fetch is in progress
    if (isLoading) {
      return 0;
    }

    // If no earthquakes loaded yet, can't top off - need initial fetch
    if (earthquakes.length === 0) {
      return 0;
    }

    try {
      // Find the most recent event timestamp
      let newestTimestamp = 0;
      for (const eq of earthquakes) {
        const time = eq.properties.time;
        if (time > newestTimestamp) {
          newestTimestamp = time;
        }
      }

      // Start from 1ms after the newest event to avoid duplicates
      const startTime = new Date(newestTimestamp + 1);
      const endTime = new Date();

      // If start time is in the future or same as now, nothing to fetch
      if (startTime >= endTime) {
        return 0;
      }

      // Use the appropriate fetch function based on region
      const fetchFn = regionScope === 'us' ? fetchUSGSEarthquakes : fetchWorldwideEarthquakes;

      // Fetch new events (this should be very fast - small time window)
      const response = await fetchFn({
        starttime: startTime,
        endtime: endTime,
        minmagnitude: minMagnitude,
        maxmagnitude: maxMagnitude === 10 ? undefined : maxMagnitude,
      });

      const newFeatures = response.features;

      if (newFeatures.length === 0) {
        return 0;
      }

      // Deduplicate against existing earthquakes
      const existingIds = new Set(earthquakes.map(eq => eq.id));
      const trulyNewFeatures = newFeatures.filter(eq => !existingIds.has(eq.id));

      if (trulyNewFeatures.length === 0) {
        return 0;
      }

      // Merge new events into existing data
      const mergedEarthquakes = [...earthquakes, ...trulyNewFeatures];

      // Sort by time (newest first for consistency)
      mergedEarthquakes.sort((a, b) => b.properties.time - a.properties.time);

      // Store new events in cache if caching is enabled
      if (cacheStore.isEnabled) {
        await storeEarthquakes(trulyNewFeatures, {
          startDate: startTime,
          endDate: endTime,
          minMagnitude,
          maxMagnitude,
          regionScope,
        });
      }

      // Update aggregates and summary
      const dailyAggregates = aggregateEarthquakesByDay(mergedEarthquakes);
      const summary = getEarthquakeSummary(mergedEarthquakes);

      set({
        earthquakes: mergedEarthquakes,
        dailyAggregates,
        summary,
        lastFetched: new Date(),
      });

      // Refresh cache stats
      cacheStore.refreshStats();

      return trulyNewFeatures.length;
    } catch (err) {
      console.error('Error during top-off fetch:', err);
      return 0;
    }
  },
}));
