  /**
 * USGS Earthquake API Service
 *
 * Fetches earthquake data from the USGS FDSN Event API.
 * Supports filtering by date range, magnitude, and US geographic regions.
 *
 * @see https://earthquake.usgs.gov/fdsnws/event/1/
 */

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * USGS Earthquake feature properties
 */
export interface EarthquakeProperties {
  /** Magnitude of the earthquake */
  mag: number | null;
  /** Location description */
  place: string | null;
  /** Time of the earthquake in milliseconds since epoch */
  time: number;
  /** Time updated in milliseconds since epoch */
  updated: number;
  /** Timezone offset in minutes */
  tz: number | null;
  /** URL to USGS event page */
  url: string;
  /** URL to event details */
  detail: string;
  /** Felt reports count */
  felt: number | null;
  /** Community Determined Intensity */
  cdi: number | null;
  /** Modified Mercalli Intensity */
  mmi: number | null;
  /** Alert level: green, yellow, orange, red */
  alert: 'green' | 'yellow' | 'orange' | 'red' | null;
  /** Review status: automatic, reviewed, deleted */
  status: 'automatic' | 'reviewed' | 'deleted';
  /** Tsunami flag: 1 = tsunami warning issued */
  tsunami: 0 | 1;
  /** Significance (0-1000) */
  sig: number;
  /** Network that reported the event */
  net: string;
  /** Network event code */
  code: string;
  /** Comma-separated list of contributing networks */
  ids: string;
  /** Comma-separated list of sources */
  sources: string;
  /** Comma-separated list of product types */
  types: string;
  /** Number of seismic stations used */
  nst: number | null;
  /** Horizontal distance to nearest station (degrees) */
  dmin: number | null;
  /** Root-mean-square travel time residual */
  rms: number | null;
  /** Largest azimuthal gap between stations (degrees) */
  gap: number | null;
  /** Magnitude type (e.g., ml, md, mb, mw) */
  magType: string | null;
  /** Event type (e.g., earthquake, quarry blast) */
  type: string;
  /** Event title */
  title: string;
}

/**
 * GeoJSON Point geometry for earthquake location
 */
export interface EarthquakeGeometry {
  type: 'Point';
  /** [longitude, latitude, depth in km] */
  coordinates: [number, number, number];
}

/**
 * Single earthquake feature in GeoJSON format
 */
export interface EarthquakeFeature {
  type: 'Feature';
  properties: EarthquakeProperties;
  geometry: EarthquakeGeometry;
  id: string;
}

/**
 * USGS GeoJSON response metadata
 */
export interface EarthquakeMetadata {
  /** Time the request was generated (ms since epoch) */
  generated: number;
  /** API URL used */
  url: string;
  /** Title of the query */
  title: string;
  /** HTTP status code */
  status: number;
  /** API version */
  api: string;
  /** Number of earthquakes returned */
  count: number;
}

/**
 * Complete USGS GeoJSON earthquake response
 */
export interface USGSEarthquakeResponse {
  type: 'FeatureCollection';
  metadata: EarthquakeMetadata;
  features: EarthquakeFeature[];
  /** Bounding box: [minLon, minLat, minDepth, maxLon, maxLat, maxDepth] */
  bbox?: [number, number, number, number, number, number];
}

/**
 * Geographic bounding box for API queries
 */
export interface GeoBounds {
  minlatitude: number;
  maxlatitude: number;
  minlongitude: number;
  maxlongitude: number;
}

/**
 * US Region identifier
 */
export type USRegion =
  | 'continental'
  | 'alaska'
  | 'hawaii'
  | 'puerto_rico_usvi'
  | 'guam';

/**
 * Query parameters for earthquake API
 */
export interface EarthquakeQueryParams {
  /** Start date (ISO string or Date) */
  starttime?: string | Date;
  /** End date (ISO string or Date) */
  endtime?: string | Date;
  /** Minimum magnitude */
  minmagnitude?: number;
  /** Maximum magnitude */
  maxmagnitude?: number;
  /** Minimum depth in km */
  mindepth?: number;
  /** Maximum depth in km */
  maxdepth?: number;
  /** Maximum number of results (default: 20000) */
  limit?: number;
  /** Order by: time, time-asc, magnitude, magnitude-asc */
  orderby?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
  /** Specific US regions to query (if empty, queries all) */
  regions?: USRegion[];
  /** Geographic bounds (overrides regions if provided) */
  bounds?: GeoBounds;
}

/**
 * Daily earthquake aggregation for charting
 */
export interface DailyEarthquakeAggregate {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Total number of earthquakes */
  count: number;
  /** Average magnitude */
  avgMagnitude: number;
  /** Maximum magnitude */
  maxMagnitude: number;
  /** Minimum magnitude */
  minMagnitude: number;
  /** Total seismic energy (approximation based on magnitude) */
  totalEnergy: number;
}

/**
 * Error response from the API
 */
export class USGSApiError extends Error {
  status?: number;
  statusText?: string;
  
  constructor(
    message: string,
    status?: number,
    statusText?: string
  ) {
    super(message);
    this.name = 'USGSApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

// =============================================================================
// Constants
// =============================================================================

/** Base URL for USGS FDSN Event API */
const USGS_API_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

/**
 * Geographic bounds for US regions
 */
export const US_REGION_BOUNDS: Record<USRegion, GeoBounds> = {
  continental: {
    minlatitude: 24.396,
    maxlatitude: 49.384,
    minlongitude: -125.0,
    maxlongitude: -66.93,
  },
  alaska: {
    minlatitude: 51.0,
    maxlatitude: 71.5,
    minlongitude: -180.0,
    maxlongitude: -130.0,
  },
  hawaii: {
    minlatitude: 18.5,
    maxlatitude: 28.5,
    minlongitude: -178.5,
    maxlongitude: -154.5,
  },
  puerto_rico_usvi: {
    minlatitude: 17.5,
    maxlatitude: 18.6,
    minlongitude: -68.0,
    maxlongitude: -64.5,
  },
  guam: {
    minlatitude: 13.0,
    maxlatitude: 14.0,
    minlongitude: 144.0,
    maxlongitude: 145.5,
  },
};

/** All US regions */
export const ALL_US_REGIONS: USRegion[] = [
  'continental',
  'alaska',
  'hawaii',
  'puerto_rico_usvi',
  'guam',
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats a date for the USGS API (ISO 8601 format)
 *
 * @param date - Date to format
 * @returns ISO 8601 formatted date string
 */
function formatDateForApi(date: string | Date): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString();
}

/**
 * Builds query string from parameters
 *
 * @param params - Object with key-value pairs
 * @returns URL query string
 */
function buildQueryString(params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}

/**
 * Calculates approximate seismic energy from magnitude
 * Using the Gutenberg-Richter energy formula: log10(E) = 1.5M + 4.8
 *
 * @param magnitude - Earthquake magnitude
 * @returns Energy in joules
 */
export function calculateSeismicEnergy(magnitude: number): number {
  return Math.pow(10, 1.5 * magnitude + 4.8);
}

/**
 * Deduplicates earthquake features by their ID
 *
 * @param features - Array of earthquake features
 * @returns Deduplicated array
 */
function deduplicateFeatures(
  features: EarthquakeFeature[]
): EarthquakeFeature[] {
  const seen = new Set<string>();
  return features.filter((feature) => {
    if (seen.has(feature.id)) {
      return false;
    }
    seen.add(feature.id);
    return true;
  });
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetches earthquakes for a single geographic region
 *
 * @param params - Query parameters including bounds
 * @returns Promise resolving to USGS earthquake response
 * @throws USGSApiError on fetch failure
 */
async function fetchEarthquakesForRegion(
  params: EarthquakeQueryParams & { bounds: GeoBounds }
): Promise<USGSEarthquakeResponse> {
  const queryParams: Record<string, string | number> = {
    format: 'geojson',
  };

  // Add date range
  if (params.starttime) {
    queryParams.starttime = formatDateForApi(params.starttime);
  }
  if (params.endtime) {
    queryParams.endtime = formatDateForApi(params.endtime);
  }

  // Add magnitude filters
  if (params.minmagnitude !== undefined) {
    queryParams.minmagnitude = params.minmagnitude;
  }
  if (params.maxmagnitude !== undefined) {
    queryParams.maxmagnitude = params.maxmagnitude;
  }

  // Add depth filters
  if (params.mindepth !== undefined) {
    queryParams.mindepth = params.mindepth;
  }
  if (params.maxdepth !== undefined) {
    queryParams.maxdepth = params.maxdepth;
  }

  // Add result limit
  if (params.limit !== undefined) {
    queryParams.limit = params.limit;
  }

  // Add ordering
  if (params.orderby) {
    queryParams.orderby = params.orderby;
  }

  // Add geographic bounds
  queryParams.minlatitude = params.bounds.minlatitude;
  queryParams.maxlatitude = params.bounds.maxlatitude;
  queryParams.minlongitude = params.bounds.minlongitude;
  queryParams.maxlongitude = params.bounds.maxlongitude;

  const url = `${USGS_API_BASE_URL}?${buildQueryString(queryParams)}`;

  // Retry logic with exponential backoff for rate limiting
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await fetch(url);

      if (!response.ok) {
        // Check for rate limiting (HTTP 429) or server errors
        if (response.status === 429 || response.status >= 500) {
          throw new USGSApiError(
            `USGS API rate limited or server error: ${response.statusText}`,
            response.status,
            response.statusText
          );
        }
        throw new USGSApiError(
          `USGS API request failed: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      const data: USGSEarthquakeResponse = await response.json();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a CORS or network error (often due to rate limiting)
      const isCorsOrNetworkError = lastError.message.includes('CORS') || 
                                   lastError.message.includes('Failed to fetch') ||
                                   lastError.message.includes('NetworkError');
      
      // Only retry on rate limit, server errors, or network issues
      if (error instanceof USGSApiError && error.status && error.status < 500 && error.status !== 429) {
        throw error; // Don't retry client errors
      }
      
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries + 1} attempts failed for ${url}`);
        if (isCorsOrNetworkError) {
          throw new USGSApiError(
            `USGS API temporarily unavailable (possible rate limiting). Please try again in a few minutes or select a shorter time range.`
          );
        }
        throw error;
      }
      // Continue to next retry
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new USGSApiError('Unknown error');
}

/**
 * Fetches earthquakes from USGS API with support for multiple US regions
 *
 * This function can query multiple geographic regions (continental US, Alaska,
 * Hawaii, Puerto Rico/USVI, Guam) and merge the results.
 *
 * @param params - Query parameters for earthquake search
 * @returns Promise resolving to merged earthquake response
 * @throws USGSApiError on fetch failure
 *
 * @example
 * ```typescript
 * // Fetch all US earthquakes in the last 7 days, magnitude 2.5+
 * const earthquakes = await fetchUSGSEarthquakes({
 *   starttime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 *   endtime: new Date(),
 *   minmagnitude: 2.5,
 *   regions: ['continental', 'alaska', 'hawaii'],
 * });
 * ```
 */
export async function fetchUSGSEarthquakes(
  params: EarthquakeQueryParams = {}
): Promise<USGSEarthquakeResponse> {
  // If specific bounds are provided, use them directly
  if (params.bounds) {
    return fetchEarthquakesForRegion({ ...params, bounds: params.bounds });
  }

  // Determine which regions to query
  const regions = params.regions?.length ? params.regions : ALL_US_REGIONS;

  // Fetch data for each region SEQUENTIALLY to avoid rate limiting
  // This is slower but much more reliable for large date ranges
  const responses: USGSEarthquakeResponse[] = [];
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    try {
      const response = await fetchEarthquakesForRegion({
        ...params,
        bounds: US_REGION_BOUNDS[region],
      });
      responses.push(response);
      
      // Small delay between region requests to be nice to the API
      if (i < regions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error fetching region ${region}:`, error);
      throw error;
    }
  }

  try {
    // Merge all features and deduplicate
    const allFeatures = responses.flatMap((response) => response.features);
    const uniqueFeatures = deduplicateFeatures(allFeatures);

    // Sort by time (most recent first) if not already ordered differently
    if (!params.orderby || params.orderby === 'time') {
      uniqueFeatures.sort(
        (a, b) => b.properties.time - a.properties.time
      );
    } else if (params.orderby === 'time-asc') {
      uniqueFeatures.sort(
        (a, b) => a.properties.time - b.properties.time
      );
    } else if (params.orderby === 'magnitude') {
      uniqueFeatures.sort(
        (a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0)
      );
    } else if (params.orderby === 'magnitude-asc') {
      uniqueFeatures.sort(
        (a, b) => (a.properties.mag ?? 0) - (b.properties.mag ?? 0)
      );
    }

    // Build merged response
    const mergedResponse: USGSEarthquakeResponse = {
      type: 'FeatureCollection',
      metadata: {
        generated: Date.now(),
        url: USGS_API_BASE_URL,
        title: `USGS Earthquakes (${regions.join(', ')})`,
        status: 200,
        api: '1.14.1',
        count: uniqueFeatures.length,
      },
      features: uniqueFeatures,
    };

    return mergedResponse;
  } catch (error) {
    if (error instanceof USGSApiError) {
      throw error;
    }
    throw new USGSApiError(
      `Failed to fetch earthquake data from multiple regions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetches earthquakes without geographic filtering (worldwide)
 *
 * Use this when you want to fetch global earthquake data or prefer
 * to filter by location client-side.
 *
 * @param params - Query parameters (bounds and regions are ignored)
 * @returns Promise resolving to earthquake response
 * @throws USGSApiError on fetch failure
 *
 * @example
 * ```typescript
 * // Fetch all magnitude 5+ earthquakes worldwide in the last 30 days
 * const earthquakes = await fetchWorldwideEarthquakes({
 *   starttime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
 *   minmagnitude: 5.0,
 * });
 * ```
 */
export async function fetchWorldwideEarthquakes(
  params: Omit<EarthquakeQueryParams, 'bounds' | 'regions'> = {}
): Promise<USGSEarthquakeResponse> {
  const queryParams: Record<string, string | number> = {
    format: 'geojson',
  };

  if (params.starttime) {
    queryParams.starttime = formatDateForApi(params.starttime);
  }
  if (params.endtime) {
    queryParams.endtime = formatDateForApi(params.endtime);
  }
  if (params.minmagnitude !== undefined) {
    queryParams.minmagnitude = params.minmagnitude;
  }
  if (params.maxmagnitude !== undefined) {
    queryParams.maxmagnitude = params.maxmagnitude;
  }
  if (params.mindepth !== undefined) {
    queryParams.mindepth = params.mindepth;
  }
  if (params.maxdepth !== undefined) {
    queryParams.maxdepth = params.maxdepth;
  }
  if (params.limit !== undefined) {
    queryParams.limit = params.limit;
  }
  if (params.orderby) {
    queryParams.orderby = params.orderby;
  }

  const url = `${USGS_API_BASE_URL}?${buildQueryString(queryParams)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new USGSApiError(
        `USGS API request failed: ${response.statusText}`,
        response.status,
        response.statusText
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof USGSApiError) {
      throw error;
    }
    throw new USGSApiError(
      `Failed to fetch worldwide earthquake data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Data Aggregation Functions
// =============================================================================

/**
 * Aggregates earthquake data by day for charting purposes
 *
 * @param earthquakes - Array of earthquake features
 * @returns Array of daily aggregates sorted by date ascending
 *
 * @example
 * ```typescript
 * const response = await fetchUSGSEarthquakes({ ... });
 * const dailyData = aggregateEarthquakesByDay(response.features);
 *
 * // Use with charting library
 * const chartData = dailyData.map(d => ({
 *   x: d.date,
 *   y: d.count,
 * }));
 * ```
 */
export function aggregateEarthquakesByDay(
  earthquakes: EarthquakeFeature[]
): DailyEarthquakeAggregate[] {
  // Optimized: compute aggregates in single pass without storing individual values
  interface DayStats {
    count: number;
    sumMag: number;
    maxMag: number;
    minMag: number;
    totalEnergy: number;
  }
  
  const dailyMap = new Map<string, DayStats>();

  for (const eq of earthquakes) {
    // Extract UTC date from timestamp (USGS times are in UTC)
    // eq.properties.time is milliseconds since epoch
    const d = new Date(eq.properties.time);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    
    const magnitude = eq.properties.mag ?? 0;
    const energy = calculateSeismicEnergy(magnitude);

    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.count++;
      existing.sumMag += magnitude;
      existing.totalEnergy += energy;
      if (magnitude > existing.maxMag) existing.maxMag = magnitude;
      if (magnitude < existing.minMag) existing.minMag = magnitude;
    } else {
      dailyMap.set(dateKey, {
        count: 1,
        sumMag: magnitude,
        maxMag: magnitude,
        minMag: magnitude,
        totalEnergy: energy,
      });
    }
  }

  // Convert to aggregates
  const aggregates: DailyEarthquakeAggregate[] = [];

  for (const [date, stats] of dailyMap.entries()) {
    aggregates.push({
      date,
      count: stats.count,
      avgMagnitude: stats.sumMag / stats.count,
      maxMagnitude: stats.maxMag,
      minMagnitude: stats.minMag,
      totalEnergy: stats.totalEnergy,
    });
  }

  // Sort by date ascending
  aggregates.sort((a, b) => a.date.localeCompare(b.date));

  return aggregates;
}

/**
 * Fill in missing days in a daily aggregate array with zero values.
 * Ensures all days in a date range are represented, even if no earthquakes occurred.
 *
 * @param aggregates - Existing daily aggregates (may have gaps)
 * @param startDate - Start of the date range
 * @param endDate - End of the date range (inclusive)
 * @returns Array with all days filled in, including days with 0 events
 *
 * @example
 * ```typescript
 * const filled = fillMissingDays(
 *   aggregates,
 *   new Date('2026-01-01'),
 *   new Date('2026-01-07')
 * );
 * // Returns 7 entries, one for each day
 * ```
 */
export function fillMissingDays(
  aggregates: DailyEarthquakeAggregate[],
  startDate: Date,
  endDate: Date
): DailyEarthquakeAggregate[] {
  // Create a map for quick lookup of existing aggregates
  const aggregateMap = new Map<string, DailyEarthquakeAggregate>();
  for (const agg of aggregates) {
    aggregateMap.set(agg.date, agg);
  }

  const result: DailyEarthquakeAggregate[] = [];
  
  // Work in UTC - create dates at UTC midnight
  const current = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate()
  ));
  
  const end = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    23, 59, 59, 999
  ));

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const existing = aggregateMap.get(dateKey);
    if (existing) {
      result.push(existing);
    } else {
      // Create empty entry for this day
      result.push({
        date: dateKey,
        count: 0,
        avgMagnitude: 0,
        maxMagnitude: 0,
        minMagnitude: 0,
        totalEnergy: 0,
      });
    }

    // Move to next day (add 24 hours in ms)
    current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return result;
}

/**
 * Filters earthquake features to only include events within US territories
 *
 * Use this when fetching worldwide data but only want US earthquakes.
 *
 * @param earthquakes - Array of earthquake features
 * @param regions - Optional specific regions to filter (default: all US regions)
 * @returns Filtered array of earthquakes within specified regions
 */
export function filterEarthquakesToUSRegions(
  earthquakes: EarthquakeFeature[],
  regions: USRegion[] = ALL_US_REGIONS
): EarthquakeFeature[] {
  const bounds = regions.map((region) => US_REGION_BOUNDS[region]);

  return earthquakes.filter((eq) => {
    const [lon, lat] = eq.geometry.coordinates;

    return bounds.some(
      (b) =>
        lat >= b.minlatitude &&
        lat <= b.maxlatitude &&
        lon >= b.minlongitude &&
        lon <= b.maxlongitude
    );
  });
}

/**
 * Groups earthquakes by magnitude range for distribution analysis
 *
 * @param earthquakes - Array of earthquake features
 * @returns Object with magnitude ranges as keys and counts as values
 */
export function groupEarthquakesByMagnitudeRange(
  earthquakes: EarthquakeFeature[]
): Record<string, number> {
  const ranges: Record<string, number> = {
    'micro (<2.0)': 0,
    'minor (2.0-2.9)': 0,
    'light (3.0-3.9)': 0,
    'moderate (4.0-4.9)': 0,
    'strong (5.0-5.9)': 0,
    'major (6.0-6.9)': 0,
    'great (≥7.0)': 0,
  };

  for (const eq of earthquakes) {
    const mag = eq.properties.mag ?? 0;

    if (mag < 2.0) {
      ranges['micro (<2.0)']++;
    } else if (mag < 3.0) {
      ranges['minor (2.0-2.9)']++;
    } else if (mag < 4.0) {
      ranges['light (3.0-3.9)']++;
    } else if (mag < 5.0) {
      ranges['moderate (4.0-4.9)']++;
    } else if (mag < 6.0) {
      ranges['strong (5.0-5.9)']++;
    } else if (mag < 7.0) {
      ranges['major (6.0-6.9)']++;
    } else {
      ranges['great (≥7.0)']++;
    }
  }

  return ranges;
}

/**
 * Gets summary statistics for a collection of earthquakes
 *
 * @param earthquakes - Array of earthquake features
 * @returns Summary statistics object
 */
export function getEarthquakeSummary(earthquakes: EarthquakeFeature[]): {
  total: number;
  avgMagnitude: number;
  maxMagnitude: number;
  minMagnitude: number;
  avgDepth: number;
  maxDepth: number;
  dateRange: { start: Date; end: Date } | null;
  largestEvent: EarthquakeFeature | null;
} {
  if (earthquakes.length === 0) {
    return {
      total: 0,
      avgMagnitude: 0,
      maxMagnitude: 0,
      minMagnitude: 0,
      avgDepth: 0,
      maxDepth: 0,
      dateRange: null,
      largestEvent: null,
    };
  }

  // Use reduce instead of Math.max/min spread to avoid stack overflow with large arrays
  let maxMag = -Infinity;
  let minMag = Infinity;
  let sumMag = 0;
  let maxDepth = -Infinity;
  let sumDepth = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;
  let largestEvent: EarthquakeFeature | null = null;

  for (const eq of earthquakes) {
    const mag = eq.properties.mag ?? 0;
    const depth = eq.geometry.coordinates[2];
    const time = eq.properties.time;

    sumMag += mag;
    sumDepth += depth;

    if (mag > maxMag) {
      maxMag = mag;
      largestEvent = eq;
    }
    if (mag < minMag) minMag = mag;
    if (depth > maxDepth) maxDepth = depth;
    if (time < minTime) minTime = time;
    if (time > maxTime) maxTime = time;
  }

  return {
    total: earthquakes.length,
    avgMagnitude: sumMag / earthquakes.length,
    maxMagnitude: maxMag,
    minMagnitude: minMag,
    avgDepth: sumDepth / earthquakes.length,
    maxDepth,
    dateRange: {
      start: new Date(minTime),
      end: new Date(maxTime),
    },
    largestEvent,
  };
}
