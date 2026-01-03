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
    case 'day':
      return date.toISOString().split('T')[0];
    default:
      return date.toISOString().split('T')[0];
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
    case 'day':
      return new Date(key);
    default:
      return new Date(key);
  }
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

  // If dateRange provided and grouping is 'day', fill in missing days
  if (dateRange && grouping === 'day') {
    const { startDate, endDate } = dateRange;
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
      const periodKey = current.toISOString().split('T')[0];
      if (!aggregations.has(periodKey)) {
        aggregations.set(periodKey, new Map());
      }
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
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
 * @returns Aggregated data points matching DailyEarthquakeAggregate format
 */
export function aggregateByTimePeriod(
  earthquakes: EarthquakeFeature[],
  grouping: TimeGrouping
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
      avgMagnitude: stats.sumMag / stats.count,
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
  /** Average magnitude for the period */
  avgMagnitude: number;
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

  // If dateRange provided and grouping is 'day', fill in missing days
  if (dateRange && grouping === 'day') {
    const { startDate, endDate } = dateRange;
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
      const periodKey = current.toISOString().split('T')[0];
      if (!aggregations.has(periodKey)) {
        aggregations.set(periodKey, {
          count: 0,
          sumMag: 0,
          totalEnergy: 0,
        });
      }
      current.setTime(current.getTime() + 24 * 60 * 60 * 1000);
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
      avgEnergy: stats.totalEnergy / stats.count,
      count: stats.count,
      avgMagnitude: stats.sumMag / stats.count,
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