/**
 * Custom hook for fetching chart data
 * 
 * Uses the V2 API when VITE_USE_API=true, otherwise uses local store data.
 * This provides a seamless transition between V1 and V2 architectures.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import {
  USE_API,
  fetchDailyCounts,
  fetchMagnitudeDistribution,
  fetchEnergyRelease,
  type ApiDailyCount,
  type ApiMagnitudeDistribution,
  type ApiEnergyRelease,
  type ChartQueryParams,
} from '../../services/api';
import type { TimeGrouping, MagnitudeTimeDataPoint, EnergyDataPoint } from './magnitudeDistributionUtils';
import {
  aggregateByTimePeriod,
  aggregateByTimePeriodAndMagnitude,
  aggregateEnergyByTimePeriod,
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
 */
function apiMagDistToChartData(data: ApiMagnitudeDistribution[], grouping: TimeGrouping): MagnitudeTimeDataPoint[] {
  return data.map(d => {
    const date = new Date(d.date);
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
    point['mag_n2_n1'] = d.ranges['M-2 to M0'] || 0;
    point['mag_0_1'] = d.ranges['M0 to M1'] || 0;
    point['mag_1_2'] = d.ranges['M1 to M2'] || 0;
    point['mag_2_3'] = d.ranges['M2 to M3'] || 0;
    point['mag_3_4'] = d.ranges['M3 to M4'] || 0;
    point['mag_4_5'] = d.ranges['M4 to M5'] || 0;
    point['mag_5_6'] = d.ranges['M5 to M6'] || 0;
    point['mag_6_7'] = d.ranges['M6+'] || 0;
    // Note: API groups M6+ together, we might want to update API to split further

    return point;
  });
}

/**
 * Convert API energy release to chart format
 */
function apiEnergyToChartData(data: ApiEnergyRelease[], grouping: TimeGrouping): EnergyDataPoint[] {
  return data.map(d => {
    const date = new Date(d.date);
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

  // Local state for API data
  const [apiDailyCounts, setApiDailyCounts] = useState<DailyEarthquakeAggregate[]>([]);
  const [apiMagDist, setApiMagDist] = useState<MagnitudeTimeDataPoint[]>([]);
  const [apiEnergy, setApiEnergy] = useState<EnergyDataPoint[]>([]);
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
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      minMagnitude,
      maxMagnitude: maxMagnitude < 10 ? maxMagnitude : undefined,
      aggregation: timeGroupingToAggregation(timeGrouping),
    };

    try {
      // Fetch all chart data in parallel
      const [dailyRes, magRes, energyRes] = await Promise.all([
        fetchDailyCounts(params),
        fetchMagnitudeDistribution(params),
        fetchEnergyRelease({ ...params, minMagnitude: Math.max(minMagnitude, 2.5) }),
      ]);

      if (dailyRes.success && dailyRes.data) {
        setApiDailyCounts(apiDailyCountsToAggregates(dailyRes.data));
      }

      if (magRes.success && magRes.data) {
        setApiMagDist(apiMagDistToChartData(magRes.data, timeGrouping));
      }

      if (energyRes.success && energyRes.data) {
        setApiEnergy(apiEnergyToChartData(energyRes.data, timeGrouping));
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      console.error('[useChartData] API error:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, [startDate, endDate, minMagnitude, maxMagnitude, timeGrouping]);

  // Fetch from API when parameters change
  useEffect(() => {
    if (USE_API) {
      fetchFromApi();
    }
  }, [fetchFromApi]);

  // Compute local data for V1 mode
  const localDailyCounts = useMemo(() => {
    if (USE_API) return [];
    if (timeGrouping === 'day') {
      return fillMissingDays(dailyAggregates, startDate, endDate);
    }
    return aggregateByTimePeriod(filteredEarthquakes, timeGrouping);
  }, [dailyAggregates, filteredEarthquakes, timeGrouping, startDate, endDate]);

  const localMagDist = useMemo(() => {
    if (USE_API) return [];
    return aggregateByTimePeriodAndMagnitude(filteredEarthquakes, timeGrouping);
  }, [filteredEarthquakes, timeGrouping]);

  const localEnergy = useMemo(() => {
    if (USE_API) return [];
    // Filter to M2.5+ for energy chart (smaller quakes add noise)
    const energyFiltered = filteredEarthquakes.filter(eq => (eq.properties.mag ?? 0) >= 2.5);
    return aggregateEnergyByTimePeriod(energyFiltered, timeGrouping);
  }, [filteredEarthquakes, timeGrouping]);

  // Return appropriate data based on mode
  if (USE_API) {
    return {
      dailyCounts: apiDailyCounts,
      magnitudeDistribution: apiMagDist,
      energyRelease: apiEnergy,
      isLoading: isLoadingApi,
      error: apiError,
    };
  }

  return {
    dailyCounts: localDailyCounts,
    magnitudeDistribution: localMagDist,
    energyRelease: localEnergy,
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
