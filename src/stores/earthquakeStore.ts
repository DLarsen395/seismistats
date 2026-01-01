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
  ChartLibrary, 
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
  
  // Filter settings - now with min AND max magnitude
  minMagnitude: number;
  maxMagnitude: number;
  timeRange: TimeRange;
  regionScope: RegionScope;
  
  // Custom date range (used when timeRange === 'custom')
  customStartDate: Date | null;
  customEndDate: Date | null;
  
  // Chart settings
  chartLibrary: ChartLibrary;
  
  // Actions
  setMinMagnitude: (mag: number) => void;
  setMaxMagnitude: (mag: number) => void;
  setTimeRange: (range: TimeRange) => void;
  setRegionScope: (scope: RegionScope) => void;
  setChartLibrary: (library: ChartLibrary) => void;
  setCustomDateRange: (startDate: Date, endDate: Date) => void;
  
  // Data fetching
  fetchEarthquakes: () => Promise<void>;
  refreshData: () => Promise<void>;
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
 * Callback to receive intermediate data during fetching
 */
interface IntermediateDataCallback {
  (features: EarthquakeFeature[]): void;
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
  
  // Determine chunk size based on magnitude filter
  // Higher min magnitude = fewer events = larger chunks possible
  // For very low magnitudes, we need MUCH smaller chunks to avoid hitting 20k limit
  let chunkSizeDays: number;
  if (minMagnitude >= 6) {
    chunkSizeDays = 3650; // 10 years - very few M6+ events
  } else if (minMagnitude >= 5) {
    chunkSizeDays = 365; // 1 year - few M5+ events
  } else if (minMagnitude >= 4) {
    chunkSizeDays = 180; // 6 months - moderate M4+ events
  } else if (minMagnitude >= 3) {
    chunkSizeDays = 60; // 2 months
  } else if (minMagnitude >= 2) {
    chunkSizeDays = 14; // 2 weeks - many M2+ events
  } else if (minMagnitude >= 1) {
    chunkSizeDays = 7; // 1 week - lots of M1+ events
  } else if (minMagnitude >= 0) {
    chunkSizeDays = 3; // 3 days - very many M0+ events
  } else {
    // For negative magnitudes (-2 to -1), there can be thousands per day
    // Use 1 day chunks to stay under 20k limit
    chunkSizeDays = 1;
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
      
      // Increased delay between requests to avoid rate limiting
      // USGS API can be sensitive to too many requests
      if (chunkEnd < endDate) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
  // Initial state
  currentView: 'ets-events',
  earthquakes: [],
  dailyAggregates: [],
  summary: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  
  // Default filter settings - now M4+ to M9+ (no upper limit)
  minMagnitude: 4,
  maxMagnitude: 10,  // 10 = no upper limit
  timeRange: '7days',  // Default to 7 days for fast initial load
  regionScope: 'us',
  
  // Custom date range (for 'custom' timeRange)
  customStartDate: null,
  customEndDate: null,
  
  // Default chart settings
  chartLibrary: 'recharts',
  
  // View setter
  setCurrentView: (view) => set({ currentView: view }),
  
  // Filter setters - refetch when filters change
  setMinMagnitude: (mag) => {
    const { maxMagnitude } = get();
    // Ensure min doesn't exceed max
    if (mag > maxMagnitude) {
      set({ minMagnitude: mag, maxMagnitude: mag });
    } else {
      set({ minMagnitude: mag });
    }
    get().fetchEarthquakes();
  },
  
  setMaxMagnitude: (mag) => {
    const { minMagnitude } = get();
    // Ensure max doesn't go below min
    if (mag < minMagnitude) {
      set({ maxMagnitude: mag, minMagnitude: mag });
    } else {
      set({ maxMagnitude: mag });
    }
    get().fetchEarthquakes();
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
  
  // Chart settings setter
  setChartLibrary: (library) => set({ chartLibrary: library }),
  
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
          // Need to fetch missing/stale days
          
          // Update progress
          cacheStore.setProgress({
            operation: 'fetching',
            currentStep: 0,
            totalSteps: cacheResult.staleDays.length,
            message: `Fetching ${cacheResult.staleDays.length} days of data...`,
            startedAt: Date.now(),
          });
          
          // Handler to progressively update UI during long fetches
          // Only update aggregates to save memory - don't store full array until complete
          const handleIntermediateData = (intermediateFeatures: EarthquakeFeature[]) => {
            const dailyAggregates = aggregateEarthquakesByDay(intermediateFeatures);
            const summary = getEarthquakeSummary(intermediateFeatures);
            set({
              dailyAggregates,
              summary,
              // Keep isLoading: true so UI knows we're still fetching
              // Don't update earthquakes array - wait until complete to save memory
            });
            // Refresh cache stats during fetch
            useCacheStore.getState().refreshStats();
          };
          
          // Fetch missing data with progress and intermediate updates
          const freshEarthquakes = await fetchInChunks(
            startTime,
            endTime,
            regionScope,
            minMagnitude,
            maxMagnitude,
            handleFetchProgress,
            handleIntermediateData,
          );
          
          // Store in cache
          cacheStore.setProgress({
            operation: 'storing',
            currentStep: 0,
            totalSteps: 1,
            message: 'Caching data...',
            startedAt: Date.now(),
          });
          
          await storeEarthquakes(freshEarthquakes, cacheQuery, (progress) => {
            cacheStore.setProgress(progress);
          });
          
          earthquakes = freshEarthquakes;
          
          // Refresh cache stats
          cacheStore.refreshStats();
        }
      } else {
        // Cache disabled, fetch directly with progress
        // Handler to progressively update UI during long fetches
        // Only update aggregates to save memory
        const handleIntermediateData = (intermediateFeatures: EarthquakeFeature[]) => {
          const dailyAggregates = aggregateEarthquakesByDay(intermediateFeatures);
          const summary = getEarthquakeSummary(intermediateFeatures);
          set({
            dailyAggregates,
            summary,
            // Don't update earthquakes array until complete to save memory
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
      
      const dailyAggregates = aggregateEarthquakesByDay(earthquakes);
      const summary = getEarthquakeSummary(earthquakes);
      
      set({
        earthquakes,
        dailyAggregates,
        summary,
        isLoading: false,
        lastFetched: new Date(),
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
}));
