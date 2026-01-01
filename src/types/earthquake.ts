/**
 * TypeScript types for Earthquake Charts feature
 * 
 * Core earthquake types are defined in the USGS API service.
 * This file contains chart-specific types and constants.
 */

// =============================================================================
// USGS Data Availability Constants
// =============================================================================

/**
 * USGS earthquake data availability:
 * - Comprehensive global data starts from ~1973
 * - US data with some gaps goes back to ~1900  
 * - Historical significant earthquakes back to ~1568
 * 
 * We silently clamp queries to 1500-01-01 as the earliest date.
 * The API won't return data for future dates.
 */
export const USGS_DATA_RANGE = {
  /** Earliest date we query (USGS has data back to ~1568) */
  earliestDate: new Date('1500-01-01'),
  /** Latest allowed date (today) - computed dynamically */
  getLatestDate: () => new Date(),
  /** Earliest year for display */
  earliestYear: 1500,
} as const;

// Re-export types from the service for convenience
export type {
  EarthquakeProperties,
  EarthquakeGeometry,
  EarthquakeFeature,
  USGSEarthquakeResponse,
  EarthquakeMetadata,
  GeoBounds,
  USRegion,
  EarthquakeQueryParams,
  DailyEarthquakeAggregate,
} from '../services/usgs-earthquake-api';

/**
 * Chart library options
 */
export type ChartLibrary = 'recharts' | 'chartjs';

/**
 * App view/page options
 */
export type AppView = 'ets-events' | 'earthquake-charts';

/**
 * Magnitude filter option for min/max selectors
 */
export interface MagnitudeOption {
  label: string;
  value: number;
}

/**
 * Min magnitude options (-2 through 9)
 * Earthquakes can have negative magnitudes
 */
export const MIN_MAGNITUDE_OPTIONS: MagnitudeOption[] = [
  { label: 'M-2', value: -2 },
  { label: 'M-1', value: -1 },
  { label: 'M0', value: 0 },
  { label: 'M1', value: 1 },
  { label: 'M2', value: 2 },
  { label: 'M3', value: 3 },
  { label: 'M4', value: 4 },
  { label: 'M5', value: 5 },
  { label: 'M6', value: 6 },
  { label: 'M7', value: 7 },
  { label: 'M8', value: 8 },
  { label: 'M9', value: 9 },
];

/**
 * Max magnitude options (0 through 10)
 * 10 effectively means "no upper limit"
 */
export const MAX_MAGNITUDE_OPTIONS: MagnitudeOption[] = [
  { label: 'M0', value: 0 },
  { label: 'M1', value: 1 },
  { label: 'M2', value: 2 },
  { label: 'M3', value: 3 },
  { label: 'M4', value: 4 },
  { label: 'M5', value: 5 },
  { label: 'M6', value: 6 },
  { label: 'M7', value: 7 },
  { label: 'M8', value: 8 },
  { label: 'M9', value: 9 },
  { label: 'M9+', value: 10 },
];

/**
 * Time range options for earthquake queries
 */
export type TimeRange = '7days' | '30days' | '90days' | '365days' | '2years' | '5years' | '10years' | '15years' | '20years' | '25years' | 'custom';

/**
 * Time range configuration
 */
export interface TimeRangeOption {
  label: string;
  value: TimeRange;
  days: number;
}

/**
 * Available time range options
 */
export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: 'Last 7 Days', value: '7days', days: 7 },
  { label: 'Last 30 Days', value: '30days', days: 30 },
  { label: 'Last 90 Days', value: '90days', days: 90 },
  { label: 'Last Year', value: '365days', days: 365 },
  { label: 'Last 2 Years', value: '2years', days: 730 },
  { label: 'Last 5 Years', value: '5years', days: 1825 },
  { label: 'Last 10 Years', value: '10years', days: 3650 },
  { label: 'Last 15 Years', value: '15years', days: 5475 },
  { label: 'Last 20 Years', value: '20years', days: 7300 },
  { label: 'Last 25 Years', value: '25years', days: 9125 },
  { label: 'Custom Range', value: 'custom', days: 0 },
];

/**
 * Region scope options
 */
export type RegionScope = 'us' | 'worldwide';

/**
 * Region scope configuration
 */
export interface RegionScopeOption {
  label: string;
  value: RegionScope;
}

/**
 * Available region scope options
 */
export const REGION_SCOPE_OPTIONS: RegionScopeOption[] = [
  { label: 'United States', value: 'us' },
  { label: 'Worldwide', value: 'worldwide' },
];

// =============================================================================
// Magnitude Distribution Chart Types
// =============================================================================

/**
 * Time grouping for magnitude distribution chart
 */
export type TimeGrouping = 'week' | 'month' | 'year';

/**
 * Magnitude range definition
 */
export interface MagnitudeRange {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
}

/**
 * Standard magnitude ranges for distribution charts
 * Colors go from cool (low magnitude) to hot (high magnitude)
 */
export const MAGNITUDE_RANGES: MagnitudeRange[] = [
  { key: 'm_neg2', label: 'M-2 to <-1', min: -2, max: -1, color: '#6366f1' },  // indigo
  { key: 'm_neg1', label: 'M-1 to <0', min: -1, max: 0, color: '#8b5cf6' },   // violet
  { key: 'm0', label: 'M0 to <1', min: 0, max: 1, color: '#a855f7' },         // purple
  { key: 'm1', label: 'M1 to <2', min: 1, max: 2, color: '#06b6d4' },         // cyan
  { key: 'm2', label: 'M2 to <3', min: 2, max: 3, color: '#22c55e' },         // green
  { key: 'm3', label: 'M3 to <4', min: 3, max: 4, color: '#84cc16' },         // lime
  { key: 'm4', label: 'M4 to <5', min: 4, max: 5, color: '#eab308' },         // yellow
  { key: 'm5', label: 'M5 to <6', min: 5, max: 6, color: '#f97316' },         // orange
  { key: 'm6', label: 'M6 to <7', min: 6, max: 7, color: '#ef4444' },         // red
  { key: 'm7', label: 'M7 to <8', min: 7, max: 8, color: '#dc2626' },         // red-600
  { key: 'm8', label: 'M8 to <9', min: 8, max: 9, color: '#b91c1c' },         // red-700
  { key: 'm9', label: 'M9+', min: 9, max: 10, color: '#7f1d1d' },             // red-900
];

/**
 * Time grouping options for UI
 */
export const TIME_GROUPING_OPTIONS: { value: TimeGrouping; label: string }[] = [
  { value: 'week', label: 'By Week' },
  { value: 'month', label: 'By Month' },
  { value: 'year', label: 'By Year' },
];
