/**
 * Magnitude Distribution Chart Types and Utilities
 *
 * Helper functions and constants for magnitude distribution visualization.
 */

import type { EarthquakeFeature, DailyEarthquakeAggregate } from '../../services/usgs-earthquake-api';
import { calculateSeismicEnergy } from '../../services/usgs-earthquake-api';

// =============================================================================
// Types
// =============================================================================

/**
 * Time grouping options
 */
export type TimeGrouping = 'day' | 'week' | 'month' | 'year';

/**
 * Magnitude range definition
 */
export interface MagnitudeRange {
  /** Unique key for the range */
  key: string;
  /** Display label */
  label: string;
  /** Minimum magnitude (inclusive) */
  min: number;
  /** Maximum magnitude (exclusive) */
  max: number;
  /** Color for the range */
  color: string;
}

/**
 * Aggregated data point for the chart
 */
export interface MagnitudeTimeDataPoint {
  /** Time period label */
  period: string;
  /** Full date for sorting */
  date: Date;
  /** Count for each magnitude range (keyed by range key) */
  [key: string]: number | string | Date;
}

/**
 * Chart configuration
 */
export interface MagnitudeDistributionConfig {
  timeGrouping: TimeGrouping;
  enabledRanges: Set<string>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Dark mode color palette
 */
export const MAGNITUDE_CHART_COLORS = {
  background: '#1f2937',  // gray-800
  grid: '#374151',        // gray-700
  text: '#d1d5db',        // gray-300
  textMuted: '#9ca3af',   // gray-400
  tooltip: {
    bg: '#1f2937',
    border: '#374151',
    text: '#f3f4f6',
  },
};

/**
 * Magnitude ranges with color scheme (from cool to hot)
 * Covers -2 to 9+ as requested
 */
export const MAGNITUDE_RANGES: MagnitudeRange[] = [
  { key: 'mag_n2_n1', label: '-2 to <-1', min: -2, max: -1, color: '#6366f1' },   // indigo-500
  { key: 'mag_n1_0', label: '-1 to <0', min: -1, max: 0, color: '#8b5cf6' },      // violet-500
  { key: 'mag_0_1', label: '0 to <1', min: 0, max: 1, color: '#a855f7' },         // purple-500
  { key: 'mag_1_2', label: '1 to <2', min: 1, max: 2, color: '#06b6d4' },         // cyan-500
  { key: 'mag_2_3', label: '2 to <3', min: 2, max: 3, color: '#22c55e' },         // green-500
  { key: 'mag_3_4', label: '3 to <4', min: 3, max: 4, color: '#84cc16' },         // lime-500
  { key: 'mag_4_5', label: '4 to <5', min: 4, max: 5, color: '#eab308' },         // yellow-500
  { key: 'mag_5_6', label: '5 to <6', min: 5, max: 6, color: '#f97316' },         // orange-500
  { key: 'mag_6_7', label: '6 to <7', min: 6, max: 7, color: '#ef4444' },         // red-500
  { key: 'mag_7_8', label: '7 to <8', min: 7, max: 8, color: '#dc2626' },         // red-600
  { key: 'mag_8_9', label: '8 to <9', min: 8, max: 9, color: '#b91c1c' },         // red-700
  { key: 'mag_9_plus', label: '9+', min: 9, max: Infinity, color: '#7f1d1d' },    // red-900
];

/**
 * Time grouping options
 */
export const TIME_GROUPING_OPTIONS: { value: TimeGrouping; label: string }[] = [
  { value: 'day', label: 'By Day' },
  { value: 'week', label: 'By Week' },
  { value: 'month', label: 'By Month' },
  { value: 'year', label: 'By Year' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the magnitude range key for a given magnitude
 */
export function getMagnitudeRangeKey(magnitude: number | null): string | null {
  if (magnitude === null || isNaN(magnitude)) return null;

  for (const range of MAGNITUDE_RANGES) {
    if (magnitude >= range.min && magnitude < range.max) {
      return range.key;
    }
  }

  // Handle edge case for exactly 9+
  if (magnitude >= 9) return 'mag_9_plus';

  return null;
}

/**
 * Get week number and year from a date
 */
export function getWeekKey(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Format period label based on grouping
 */
export function formatPeriodLabel(date: Date, grouping: TimeGrouping): string {
  switch (grouping) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    case 'week': {
      // Format as date of the week start instead of "YYYY Wnn"
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Get period key for grouping (used for aggregation)
 */
export function getPeriodKey(date: Date, grouping: TimeGrouping): string {
  switch (grouping) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    case 'week': {
      const { year, week } = getWeekKey(date);
      return `${year}-W${week.toString().padStart(2, '0')}`;
    }
    case 'day': {
      // Use LOCAL date components, not UTC (toISOString uses UTC which can be wrong timezone)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    default: {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
}

/**
 * Get start date for a period key (for sorting)
 */
export function getDateFromPeriodKey(key: string, grouping: TimeGrouping): Date {
  switch (grouping) {
    case 'year':
      return new Date(parseInt(key), 0, 1);
    case 'month': {
      const [year, month] = key.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    case 'week': {
      // Parse "YYYY-Wnn" format
      const match = key.match(/(\d{4})-W(\d{2})/);
      if (match) {
        const year = parseInt(match[1]);
        const week = parseInt(match[2]);
        // Get first day of the year, then add weeks
        const jan4 = new Date(year, 0, 4);
        const dayOfWeek = jan4.getDay() || 7;
        const firstMonday = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
        return new Date(firstMonday.getTime() + (week - 1) * 7 * 86400000);
      }
      return new Date();
    }
    case 'day': {
      // Parse YYYY-MM-DD as LOCAL time, not UTC
      // new Date("2026-01-03") parses as UTC midnight which is wrong timezone
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day);  // Local midnight
    }
    default: {
      // Parse YYYY-MM-DD as LOCAL time
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }
}

/**
 * Generate all period keys for a date range and grouping type
 * Ensures charts show ALL time periods, including those with 0 events
 *
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param grouping - Time grouping (day, week, month, year)
 * @returns Array of period keys covering the entire date range
 */
export function generateAllPeriodKeys(
  startDate: Date,
  endDate: Date,
  grouping: TimeGrouping
): string[] {
  const keys: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  switch (grouping) {
    case 'day':
      while (current <= end) {
        keys.push(getPeriodKey(current, 'day'));
        current.setDate(current.getDate() + 1);
      }
      break;

    case 'week': {
      // Start from beginning of the week containing startDate
      const firstDayOfWeek = current.getDay(); // 0 = Sunday
      current.setDate(current.getDate() - firstDayOfWeek); // Move to Sunday
      while (current <= end) {
        keys.push(getPeriodKey(current, 'week'));
        current.setDate(current.getDate() + 7);
      }
      break;
    }

    case 'month':
      current.setDate(1); // Start at first of month
      while (current <= end) {
        keys.push(getPeriodKey(current, 'month'));
        current.setMonth(current.getMonth() + 1);
      }
      break;

    case 'year':
      current.setMonth(0, 1); // Start at Jan 1
      while (current <= end) {
        keys.push(getPeriodKey(current, 'year'));
        current.setFullYear(current.getFullYear() + 1);
      }
      break;
  }

  return keys;
}

/**
 * Aggregate earthquakes by time period and magnitude range
 *
 * @param earthquakes - Array of earthquake features from USGS API
 * @param grouping - How to group time periods (year, month, week, or day)
 * @param dateRange - Optional date range to fill in missing periods with zeros
 * @returns Aggregated data points for chart visualization
 */
export function aggregateByTimePeriodAndMagnitude(
  earthquakes: EarthquakeFeature[],
  grouping: TimeGrouping,
  dateRange?: { startDate: Date; endDate: Date }
): MagnitudeTimeDataPoint[] {
  // Map to store aggregations: periodKey -> { rangeKey -> count }
  const aggregations = new Map<string, Map<string, number>>();

  // Process each earthquake
  for (const eq of earthquakes) {
    const magnitude = eq.properties.mag;
    const rangeKey = getMagnitudeRangeKey(magnitude);

    if (!rangeKey) continue;

    const date = new Date(eq.properties.time);
    const periodKey = getPeriodKey(date, grouping);

    if (!aggregations.has(periodKey)) {
      aggregations.set(periodKey, new Map());
    }

    const periodCounts = aggregations.get(periodKey)!;
    periodCounts.set(rangeKey, (periodCounts.get(rangeKey) || 0) + 1);
  }

  // Fill in ALL missing periods based on date range and grouping
  // This ensures charts show 0 values for periods with no earthquakes
  if (dateRange) {
    const allPeriodKeys = generateAllPeriodKeys(
      dateRange.startDate,
      dateRange.endDate,
      grouping
    );
    for (const periodKey of allPeriodKeys) {
      if (!aggregations.has(periodKey)) {
        aggregations.set(periodKey, new Map()); // Empty map = 0 for all ranges
      }
    }
  }

  // Convert to array and sort by date
  const result: MagnitudeTimeDataPoint[] = [];

  for (const [periodKey, counts] of aggregations) {
    const dataPoint: MagnitudeTimeDataPoint = {
      period: formatPeriodLabel(getDateFromPeriodKey(periodKey, grouping), grouping),
      date: getDateFromPeriodKey(periodKey, grouping),
    };

    // Initialize all ranges to 0
    for (const range of MAGNITUDE_RANGES) {
      dataPoint[range.key] = 0;
    }

    // Fill in actual counts
    for (const [rangeKey, count] of counts) {
      dataPoint[rangeKey] = count;
    }

    result.push(dataPoint);
  }

  // Sort by date
  result.sort((a, b) => a.date.getTime() - b.date.getTime());

  return result;
}

/**
 * Get statistics for visible magnitude ranges
 */
export function getMagnitudeDistributionStats(
  data: MagnitudeTimeDataPoint[],
  enabledRanges: Set<string>
): {
  totalEvents: number;
  maxInPeriod: number;
  avgPerPeriod: number;
  periodCount: number;
} {
  const activeRanges = MAGNITUDE_RANGES.filter(r => enabledRanges.has(r.key));

  let totalEvents = 0;
  let maxInPeriod = 0;

  for (const point of data) {
    let periodSum = 0;
    for (const range of activeRanges) {
      periodSum += (point[range.key] as number) || 0;
    }
    totalEvents += periodSum;
    maxInPeriod = Math.max(maxInPeriod, periodSum);
  }

  return {
    totalEvents,
    maxInPeriod,
    avgPerPeriod: data.length > 0 ? Math.round(totalEvents / data.length) : 0,
    periodCount: data.length,
  };
}
/**
 * Aggregate earthquakes by time period (week, month, year)
 * Returns data in the same format as DailyEarthquakeAggregate for use with bar charts
 * Optimized: computes stats in single pass without storing individual values
 *
 * @param earthquakes - Array of earthquake features from USGS API
 * @param grouping - How to group time periods (day, week, month, or year)
 * @param dateRange - Optional date range to fill in missing periods with zeros
 * @returns Aggregated data points matching DailyEarthquakeAggregate format
 */
export function aggregateByTimePeriod(
  earthquakes: EarthquakeFeature[],
  grouping: TimeGrouping,
  dateRange?: { startDate: Date; endDate: Date }
): DailyEarthquakeAggregate[] {
  // Optimized stats tracking - no intermediate arrays
  interface PeriodStats {
    count: number;
    sumMag: number;
    maxMag: number;
    minMag: number;
    totalEnergy: number;
  }

  const aggregations = new Map<string, PeriodStats>();

  // Process each earthquake
  for (const eq of earthquakes) {
    const magnitude = eq.properties.mag ?? 0;
    const energy = calculateSeismicEnergy(magnitude);

    const date = new Date(eq.properties.time);
    const periodKey = getPeriodKey(date, grouping);

    const existing = aggregations.get(periodKey);
    if (existing) {
      existing.count++;
      existing.sumMag += magnitude;
      existing.totalEnergy += energy;
      if (magnitude > existing.maxMag) existing.maxMag = magnitude;
      if (magnitude < existing.minMag) existing.minMag = magnitude;
    } else {
      aggregations.set(periodKey, {
        count: 1,
        sumMag: magnitude,
        maxMag: magnitude,
        minMag: magnitude,
        totalEnergy: energy,
      });
    }
  }

  // Fill in ALL missing periods based on date range and grouping
  // This ensures charts show 0 values for periods with no earthquakes
  if (dateRange) {
    const allPeriodKeys = generateAllPeriodKeys(
      dateRange.startDate,
      dateRange.endDate,
      grouping
    );
    for (const periodKey of allPeriodKeys) {
      if (!aggregations.has(periodKey)) {
        aggregations.set(periodKey, {
          count: 0,
          sumMag: 0,
          maxMag: 0,
          minMag: 0,
          totalEnergy: 0,
        });
      }
    }
  }

  // Convert to DailyEarthquakeAggregate format
  // Sort keys first, then build result in order
  const sortedKeys = Array.from(aggregations.keys()).sort();

  const result: DailyEarthquakeAggregate[] = sortedKeys.map(periodKey => {
    const stats = aggregations.get(periodKey)!;
    const periodDate = getDateFromPeriodKey(periodKey, grouping);
    const dateLabel = formatPeriodLabel(periodDate, grouping);

    return {
      date: dateLabel,
      count: stats.count,
      avgMagnitude: stats.count > 0 ? stats.sumMag / stats.count : 0,
      maxMagnitude: stats.maxMag,
      minMagnitude: stats.minMag,
      totalEnergy: stats.totalEnergy,
    };
  });

  return result;
}

// =============================================================================
// Energy Chart Data Types and Functions
// =============================================================================

/**
 * Data point for the energy release chart
 */
export interface EnergyDataPoint {
  /** Period label (formatted date) */
  period: string;
  /** Total seismic energy released in Joules */
  totalEnergy: number;
  /** Average seismic energy per earthquake in Joules */
  avgEnergy: number;
  /** Number of earthquakes in this period */
  count: number;
  /** Average magnitude for the period (null if no earthquakes) */
  avgMagnitude: number | null;
}

/**
 * Aggregate earthquakes by time period for energy visualization
 *
 * @param earthquakes - Array of earthquake features from USGS API
 * @param grouping - How to group time periods (day, week, month, or year)
 * @param dateRange - Optional date range to fill in missing periods with zeros
 * @returns Energy data points for chart
 */
export function aggregateEnergyByTimePeriod(
  earthquakes: EarthquakeFeature[],
  grouping: TimeGrouping,
  dateRange?: { startDate: Date; endDate: Date }
): EnergyDataPoint[] {
  interface PeriodStats {
    count: number;
    sumMag: number;
    totalEnergy: number;
  }

  const aggregations = new Map<string, PeriodStats>();

  // Process each earthquake
  for (const eq of earthquakes) {
    const magnitude = eq.properties.mag ?? 0;
    const energy = calculateSeismicEnergy(magnitude);

    const date = new Date(eq.properties.time);
    const periodKey = getPeriodKey(date, grouping);

    const existing = aggregations.get(periodKey);
    if (existing) {
      existing.count++;
      existing.sumMag += magnitude;
      existing.totalEnergy += energy;
    } else {
      aggregations.set(periodKey, {
        count: 1,
        sumMag: magnitude,
        totalEnergy: energy,
      });
    }
  }

  // Fill in ALL missing periods based on date range and grouping
  // This ensures charts show 0 values for periods with no earthquakes
  if (dateRange) {
    const allPeriodKeys = generateAllPeriodKeys(
      dateRange.startDate,
      dateRange.endDate,
      grouping
    );
    for (const periodKey of allPeriodKeys) {
      if (!aggregations.has(periodKey)) {
        aggregations.set(periodKey, {
          count: 0,
          sumMag: 0,
          totalEnergy: 0,
        });
      }
    }
  }

  // Convert to EnergyDataPoint format, sorted by date
  const sortedKeys = Array.from(aggregations.keys()).sort();

  return sortedKeys.map(periodKey => {
    const stats = aggregations.get(periodKey)!;
    const periodDate = getDateFromPeriodKey(periodKey, grouping);
    const dateLabel = formatPeriodLabel(periodDate, grouping);

    return {
      period: dateLabel,
      totalEnergy: stats.totalEnergy,
      avgEnergy: stats.count > 0 ? stats.totalEnergy / stats.count : 0,
      count: stats.count,
      // Return null for days with no earthquakes (Recharts will show gap in line)
      avgMagnitude: stats.count > 0 ? stats.sumMag / stats.count : null,
    };
  });
}

/**
 * Format energy value to human-readable string with SI prefixes
 * Uses Joules with appropriate prefix (J, kJ, MJ, GJ, TJ, PJ, EJ)
 */
export function formatEnergy(joules: number): string {
  if (joules < 1000) {
    return `${joules.toFixed(1)} J`;
  } else if (joules < 1e6) {
    return `${(joules / 1e3).toFixed(1)} kJ`;
  } else if (joules < 1e9) {
    return `${(joules / 1e6).toFixed(1)} MJ`;
  } else if (joules < 1e12) {
    return `${(joules / 1e9).toFixed(1)} GJ`;
  } else if (joules < 1e15) {
    return `${(joules / 1e12).toFixed(1)} TJ`;
  } else if (joules < 1e18) {
    return `${(joules / 1e15).toFixed(1)} PJ`;
  } else {
    return `${(joules / 1e18).toFixed(1)} EJ`;
  }
}

/**
 * Format energy value for chart axis (shorter format)
 */
export function formatEnergyAxis(joules: number): string {
  if (joules < 1000) {
    return `${joules.toFixed(0)}`;
  } else if (joules < 1e6) {
    return `${(joules / 1e3).toFixed(0)}k`;
  } else if (joules < 1e9) {
    return `${(joules / 1e6).toFixed(0)}M`;
  } else if (joules < 1e12) {
    return `${(joules / 1e9).toFixed(0)}G`;
  } else if (joules < 1e15) {
    return `${(joules / 1e12).toFixed(0)}T`;
  } else if (joules < 1e18) {
    return `${(joules / 1e15).toFixed(0)}P`;
  } else {
    return `${(joules / 1e18).toFixed(0)}E`;
  }
}