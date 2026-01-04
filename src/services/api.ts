                                                                                                                                                                        /**
 * SeismiStats API Client
 * 
 * Provides typed functions to call the V2 backend API endpoints.
 * Can be used alongside or instead of direct USGS API calls.
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * API base URL - defaults to localhost:3000 for development
 * In production, this would be the deployed API URL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Whether to use the V2 API for data fetching
 * Set VITE_USE_API=true to enable
 */
export const USE_API = import.meta.env.VITE_USE_API === 'true';

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    limit?: number;
    offset?: number;
    returned?: number;
    startDate?: string;
    endDate?: string;
    aggregation?: string;
    minMagnitude?: number;
    totalBuckets?: number;
  };
}

/**
 * Earthquake record from API
 */
export interface ApiEarthquake {
  id: string;
  time: string;
  coordinates: [number, number]; // [longitude, latitude] array
  depth: number;
  magnitude: number;
  magnitudeType: string | null;
  place: string | null;
  status: string;
  tsunamiWarning: boolean;
  feltReports: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  source: string;
}

/**
 * Daily counts from API
 */
export interface ApiDailyCount {
  date: string;
  count: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
}

/**
 * Magnitude distribution from API
 */
export interface ApiMagnitudeDistribution {
  date: string;
  ranges: {
    'M-2 to M0': number;
    'M0 to M1': number;
    'M1 to M2': number;
    'M2 to M3': number;
    'M3 to M4': number;
    'M4 to M5': number;
    'M5 to M6': number;
    'M6+': number;
  };
}

/**
 * Energy release from API
 */
export interface ApiEnergyRelease {
  date: string;
  totalEnergyJoules: number;
  avgMagnitude: number | null;
  eventCount: number;
}

/**
 * Query parameters for earthquakes endpoint
 */
export interface EarthquakeQueryParams {
  startDate?: string;
  endDate?: string;
  minMagnitude?: number;
  maxMagnitude?: number;
  minDepth?: number;
  maxDepth?: number;
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  limit?: number;
  offset?: number;
  orderBy?: 'time' | 'magnitude';
  orderDir?: 'asc' | 'desc';
}

/**
 * Query parameters for chart endpoints
 */
export interface ChartQueryParams {
  startDate: string;
  endDate: string;
  minMagnitude?: number;
  maxMagnitude?: number;
  aggregation?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

// =============================================================================
// API Client Functions
// =============================================================================

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(endpoint, API_BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch('/health');
}

/**
 * Fetch earthquakes with filtering
 */
export async function fetchEarthquakesFromApi(
  params: EarthquakeQueryParams
): Promise<ApiResponse<ApiEarthquake[]>> {
  return apiFetch('/api/earthquakes', params as unknown as Record<string, string | number | undefined>);
}

/**
 * Fetch daily counts for charts
 */
export async function fetchDailyCounts(
  params: ChartQueryParams
): Promise<ApiResponse<ApiDailyCount[]>> {
  return apiFetch('/api/charts/daily-counts', params as unknown as Record<string, string | number | undefined>);
}

/**
 * Fetch magnitude distribution for charts
 */
export async function fetchMagnitudeDistribution(
  params: ChartQueryParams
): Promise<ApiResponse<ApiMagnitudeDistribution[]>> {
  return apiFetch('/api/charts/magnitude-distribution', params as unknown as Record<string, string | number | undefined>);
}

/**
 * Fetch energy release for charts
 */
export async function fetchEnergyRelease(
  params: ChartQueryParams
): Promise<ApiResponse<ApiEnergyRelease[]>> {
  return apiFetch('/api/charts/energy-release', params as unknown as Record<string, string | number | undefined>);
}

// =============================================================================
// Data Conversion Utilities
// =============================================================================

/**
 * Convert API earthquake to USGS-compatible EarthquakeFeature format
 * This allows the frontend to use either data source seamlessly
 */
export function apiEarthquakeToFeature(eq: ApiEarthquake): import('./usgs-earthquake-api').EarthquakeFeature {
  const [lng, lat] = eq.coordinates;
  
  return {
    type: 'Feature',
    id: eq.id,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat, eq.depth],
    },
    properties: {
      mag: eq.magnitude,
      place: eq.place,
      time: new Date(eq.time).getTime(),
      updated: new Date(eq.time).getTime(),
      tz: null,
      url: '',
      detail: '',
      felt: eq.feltReports,
      cdi: eq.cdi,
      mmi: eq.mmi,
      alert: eq.alert as 'green' | 'yellow' | 'orange' | 'red' | null,
      status: eq.status as 'automatic' | 'reviewed' | 'deleted',
      tsunami: eq.tsunamiWarning ? 1 : 0,
      sig: 0,
      net: eq.source.toLowerCase(),
      code: eq.id,
      ids: eq.id,
      sources: eq.source,
      types: 'origin',
      nst: null,
      dmin: null,
      rms: null,
      gap: null,
      magType: eq.magnitudeType,
      type: 'earthquake',
      title: `M ${eq.magnitude} - ${eq.place || 'Unknown location'}`,
    },
  };
}

/**
 * Convert array of API earthquakes to USGS features
 */
export function apiEarthquakesToFeatures(earthquakes: ApiEarthquake[]): import('./usgs-earthquake-api').EarthquakeFeature[] {
  return earthquakes.map(apiEarthquakeToFeature);
}
