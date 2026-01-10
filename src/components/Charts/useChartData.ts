/**
 * Custom hook for fetching chart data
 *
 * Uses the V2 API when VITE_USE_API=true, otherwise uses local store data.
 * This provides a seamless transition between V1 and V2 architectures.
 *
 * IMPORTANT: All API queries use UTC dates for consistency with USGS data.
 * Display formatting is handled separately based on user timezone preference.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import { formatDateUTC } from '../../utils/dateUtils';
import {
  USE_API,
  fetchDailyCounts,
  fetchMagnitudeDistribution,
  fetchEnergyRelease,
  fetchSummaryStats,
  type ApiDailyCount,
  type ApiMagnitudeDistribution,
  type ApiEnergyRelease,
  type ApiSummaryStats,
  type ChartQueryParams,
} from '../../services/api';
import type { TimeGrouping, MagnitudeTimeDataPoint, EnergyDataPoint } from './magnitudeDistributionUtils';
import {
  aggregateByTimePeriod,
  aggregateByTimePeriodAndMagnitude,
  aggregateEnergyByTimePeriod,
  generateAllPeriodKeys,
  getPeriodKey,
  getDateFromPeriodKey,
  formatPeriodLabel,
  MAGNITUDE_RANGES,
} from './magnitudeDistributionUtils';
import type { DailyEarthquakeAggregate } from '../../services/usgs-earthquake-api';
import { fillMissingDays } from '../../services/usgs-earthquake-api';

interface UseChartDataOptions {
  startDate: Date;
  endDate: Date;
  minMagnitude: number;
  maxMagnitude: number;
  timeGrouping: TimeGrouping;
}

interface ChartData {
  dailyCounts: DailyEarthquakeAggregate[];
  magnitudeDistribution: MagnitudeTimeDataPoint[];
  energyRelease: EnergyDataPoint[];
  summaryStats: ApiSummaryStats | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Map TimeGrouping to API aggregation parameter
 */
function timeGroupingToAggregation(grouping: TimeGrouping): 'daily' | 'weekly' | 'monthly' | 'yearly' {
  switch (grouping) {
    case 'day': return 'daily';
    case 'week': return 'weekly';
    case 'month': return 'monthly';
    case 'year': return 'yearly';
  }
}

/**
 * Fill in missing periods for daily counts data from API
 * Ensures ALL periods in the date range have entries, even if count is 0
 */
function fillMissingPeriodsForDailyCounts(
  data: DailyEarthquakeAggregate[],
  startDate: Date,
  endDate: Date,
  grouping: TimeGrouping
): DailyEarthquakeAggregate[] {
  // Build a map of existing data by period key
  const existingByKey = new Map<string, DailyEarthquakeAggregate>();
  for (const item of data) {
    // Parse the date from the item as LOCAL time and get its period key
    const itemDate = parseLocalDate(item.date);
    const key = getPeriodKey(itemDate, grouping);
    existingByKey.set(key, item);
  }

  // Generate all period keys for the range
  const allKeys = generateAllPeriodKeys(startDate, endDate, grouping);

  // Build result with all periods
  return allKeys.map(key => {
    const existing = existingByKey.get(key);
    if (existing) {
      return existing;
    }
    // Create empty entry for missing period
    const periodDate = getDateFromPeriodKey(key, grouping);
    return {
      date: formatPeriodLabel(periodDate, grouping),
      count: 0,
      avgMagnitude: 0,
      maxMagnitude: 0,
      minMagnitude: 0,
      totalEnergy: 0,
    };
  });
}

/**
 * Fill in missing periods for magnitude distribution data from API
 */
function fillMissingPeriodsForMagDist(
  data: MagnitudeTimeDataPoint[],
  startDate: Date,
  endDate: Date,
  grouping: TimeGrouping
): MagnitudeTimeDataPoint[] {
  // Build a map of existing data by period key
  const existingByKey = new Map<string, MagnitudeTimeDataPoint>();
  for (const item of data) {
    if (item.date) {
      const key = getPeriodKey(item.date, grouping);
      existingByKey.set(key, item);
    }
  }

  // Generate all period keys for the range
  const allKeys = generateAllPeriodKeys(startDate, endDate, grouping);

  // Build result with all periods
  return allKeys.map(key => {
    const existing = existingByKey.get(key);
    if (existing) {
      return existing;
    }
    // Create empty entry for missing period
    const periodDate = getDateFromPeriodKey(key, grouping);
    const emptyPoint: MagnitudeTimeDataPoint = {
      period: formatPeriodLabel(periodDate, grouping),
      date: periodDate,
    };
    // Initialize all magnitude ranges to 0
    for (const range of MAGNITUDE_RANGES) {
      emptyPoint[range.key] = 0;
    }
    return emptyPoint;
  });
}

/**
 * Fill in missing periods for energy release data from API
 */
function fillMissingPeriodsForEnergy(
  data: EnergyDataPoint[],
  startDate: Date,
  endDate: Date,
  grouping: TimeGrouping
): EnergyDataPoint[] {
  // Build a map of existing data by period key
  const existingByKey = new Map<string, EnergyDataPoint>();
  for (const item of data) {
    // Parse date from period label or use date property if available
    const itemDate = (item as { date?: Date }).date || new Date(item.period);
    if (!isNaN(itemDate.getTime())) {
      const key = getPeriodKey(itemDate, grouping);
      existingByKey.set(key, item);
    }
  }

  // Generate all period keys for the range
  const allKeys = generateAllPeriodKeys(startDate, endDate, grouping);

  // Build result with all periods
  return allKeys.map(key => {
    const existing = existingByKey.get(key);
    if (existing) {
      return existing;
    }
    // Create empty entry for missing period
    const periodDate = getDateFromPeriodKey(key, grouping);
    return {
      period: formatPeriodLabel(periodDate, grouping),
      totalEnergy: 0,
      avgEnergy: 0,
      count: 0,
      avgMagnitude: null,
    };
  });
}

/**
 * Parse a date string as LOCAL time (not UTC)
 * Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
 */
function parseLocalDate(dateStr: string): Date {
  // Extract just the date part
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  // Create date using local timezone (months are 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Convert API daily counts to store format
 */
function apiDailyCountsToAggregates(data: ApiDailyCount[]): DailyEarthquakeAggregate[] {
  return data.map(d => ({
    date: d.date.split('T')[0], // "2026-01-04"
    count: d.count,
    avgMagnitude: d.avgMagnitude ?? 0,
    maxMagnitude: d.maxMagnitude ?? 0,
    minMagnitude: 0, // API doesn't return this yet
    totalEnergy: 0, // Calculated separately in energy chart
  }));
}

/**
 * Convert API magnitude distribution to chart format
 *
 * API returns ranges like "M2 to M3", "M6+"
 * Chart expects keys like "mag_2_3", "mag_6_7"
 */
function apiMagDistToChartData(data: ApiMagnitudeDistribution[], grouping: TimeGrouping): MagnitudeTimeDataPoint[] {
  return data.map(d => {
    // Parse as local date to avoid timezone issues
    const date = parseLocalDate(d.date);
    let period: string;

    switch (grouping) {
      case 'day':
        period = format(date, 'MMM d, yyyy');
        break;
      case 'week':
        period = `Week of ${format(date, 'MMM d, yyyy')}`;
        break;
      case 'month':
        period = format(date, 'MMM yyyy');
        break;
      case 'year':
        period = format(date, 'yyyy');
        break;
    }

    // Map API ranges to our magnitude range keys
    const point: MagnitudeTimeDataPoint = {
      period,
      date,
      // Initialize all ranges to 0
      ...Object.fromEntries(MAGNITUDE_RANGES.map(r => [r.key, 0])),
    };

    // Map API response ranges to our keys
    // API uses "M-2 to M0" which spans our mag_n2_n1 AND mag_n1_0
    // For now, put it all in mag_n1_0 since negative magnitudes are rare
    point['mag_n1_0'] = d.ranges['M-2 to M0'] || 0;
    point['mag_0_1'] = d.ranges['M0 to M1'] || 0;
    point['mag_1_2'] = d.ranges['M1 to M2'] || 0;
    point['mag_2_3'] = d.ranges['M2 to M3'] || 0;
    point['mag_3_4'] = d.ranges['M3 to M4'] || 0;
    point['mag_4_5'] = d.ranges['M4 to M5'] || 0;
    point['mag_5_6'] = d.ranges['M5 to M6'] || 0;
    // API groups M6+ together, split it into our finer ranges
    // For now put all in mag_6_7 since M7+ is very rare
    point['mag_6_7'] = d.ranges['M6+'] || 0;

    return point;
  });
}

/**
 * Convert API energy release to chart format
 */
function apiEnergyToChartData(data: ApiEnergyRelease[], grouping: TimeGrouping): EnergyDataPoint[] {
  return data.map(d => {
    // Parse as local date to avoid timezone issues
    const date = parseLocalDate(d.date);
    let period: string;

    switch (grouping) {
      case 'day':
        period = format(date, 'MMM d, yyyy');
        break;
      case 'week':
        period = `Week of ${format(date, 'MMM d, yyyy')}`;
        break;
      case 'month':
        period = format(date, 'MMM yyyy');
        break;
      case 'year':
        period = format(date, 'yyyy');
        break;
    }

    return {
      period,
      date,
      totalEnergy: d.totalEnergyJoules,
      avgEnergy: d.eventCount > 0 ? d.totalEnergyJoules / d.eventCount : 0,
      count: d.eventCount,
      avgMagnitude: d.avgMagnitude ?? 0,
    };
  });
}

/**
 * Hook to fetch chart data from API or use local store data
 */
export function useChartData(options: UseChartDataOptions): ChartData {
  const { startDate, endDate, minMagnitude, maxMagnitude, timeGrouping } = options;

  // Convert dates to UTC strings for API queries
  // This ensures consistency with USGS data (all stored in UTC)
  const startDateStr = formatDateUTC(startDate);
  const endDateStr = formatDateUTC(endDate);

  // Local state for API data
  const [apiDailyCounts, setApiDailyCounts] = useState<DailyEarthquakeAggregate[]>([]);
  const [apiMagDist, setApiMagDist] = useState<MagnitudeTimeDataPoint[]>([]);
  const [apiEnergy, setApiEnergy] = useState<EnergyDataPoint[]>([]);
  const [apiSummary, setApiSummary] = useState<ApiSummaryStats | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Store data (V1 mode)
  const {
    earthquakes,
    dailyAggregates,
    isLoading: storeLoading,
    error: storeError,
  } = useEarthquakeStore();

  // Filtered earthquakes for V1 mode
  const filteredEarthquakes = useMemo(() => {
    return earthquakes.filter(eq => {
      const m = eq.properties.mag ?? 0;
      return m >= minMagnitude && m <= maxMagnitude;
    });
  }, [earthquakes, minMagnitude, maxMagnitude]);

  // Fetch from API when USE_API is true
  const fetchFromApi = useCallback(async () => {
    if (!USE_API) return;

    setIsLoadingApi(true);
    setApiError(null);

    const params: ChartQueryParams = {
      startDate: startDateStr,
      endDate: endDateStr,
      minMagnitude,
      maxMagnitude: maxMagnitude < 10 ? maxMagnitude : undefined,
      aggregation: timeGroupingToAggregation(timeGrouping),
    };

    try {
      // Fetch all chart data in parallel (including summary stats)
      const [dailyRes, magRes, energyRes, summaryRes] = await Promise.all([
        fetchDailyCounts(params),
        fetchMagnitudeDistribution(params),
        fetchEnergyRelease({ ...params, minMagnitude: Math.max(minMagnitude, 2.5) }),
        fetchSummaryStats(params),
      ]);

      if (dailyRes.success && dailyRes.data) {
        // Convert API data and fill in ALL missing periods
        const converted = apiDailyCountsToAggregates(dailyRes.data);
        const filled = fillMissingPeriodsForDailyCounts(converted, startDate, endDate, timeGrouping);
        setApiDailyCounts(filled);
      }

      if (magRes.success && magRes.data) {
        // Convert API data and fill in ALL missing periods
        const converted = apiMagDistToChartData(magRes.data, timeGrouping);
        const filled = fillMissingPeriodsForMagDist(converted, startDate, endDate, timeGrouping);
        setApiMagDist(filled);
      }

      if (energyRes.success && energyRes.data) {
        // Convert API data and fill in ALL missing periods
        const converted = apiEnergyToChartData(energyRes.data, timeGrouping);
        const filled = fillMissingPeriodsForEnergy(converted, startDate, endDate, timeGrouping);
        setApiEnergy(filled);
      }

      if (summaryRes.success && summaryRes.data) {
        setApiSummary(summaryRes.data);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      console.error('[useChartData] API error:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, [startDateStr, endDateStr, minMagnitude, maxMagnitude, timeGrouping]);

  // Fetch from API when parameters change
  useEffect(() => {
    if (USE_API) {
      fetchFromApi();
    }
  }, [fetchFromApi]);

  // Compute local data for V1 mode
  // Always pass dateRange to ensure ALL periods are shown (including zero-earthquake periods)
  const dateRange = { startDate, endDate };

  const localDailyCounts = useMemo(() => {
    if (USE_API) return [];
    if (timeGrouping === 'day') {
      return fillMissingDays(dailyAggregates, startDate, endDate);
    }
    return aggregateByTimePeriod(filteredEarthquakes, timeGrouping, dateRange);
  }, [dailyAggregates, filteredEarthquakes, timeGrouping, startDate, endDate]);

  const localMagDist = useMemo(() => {
    if (USE_API) return [];
    return aggregateByTimePeriodAndMagnitude(filteredEarthquakes, timeGrouping, dateRange);
  }, [filteredEarthquakes, timeGrouping, startDate, endDate]);

  const localEnergy = useMemo(() => {
    if (USE_API) return [];
    // Filter to M2.5+ for energy chart (smaller quakes add noise)
    const energyFiltered = filteredEarthquakes.filter(eq => (eq.properties.mag ?? 0) >= 2.5);
    return aggregateEnergyByTimePeriod(energyFiltered, timeGrouping, dateRange);
  }, [filteredEarthquakes, timeGrouping, startDate, endDate]);

  // Return appropriate data based on mode
  if (USE_API) {
    return {
      dailyCounts: apiDailyCounts,
      magnitudeDistribution: apiMagDist,
      energyRelease: apiEnergy,
      summaryStats: apiSummary,
      isLoading: isLoadingApi,
      error: apiError,
    };
  }

  return {
    dailyCounts: localDailyCounts,
    magnitudeDistribution: localMagDist,
    energyRelease: localEnergy,
    summaryStats: null, // V1 mode doesn't have summary stats (computed locally if needed)
    isLoading: storeLoading,
    error: storeError,
  };
}

/**
 * Check if V2 API mode is enabled
 */
export function useIsApiMode(): boolean {
  return USE_API;
}
