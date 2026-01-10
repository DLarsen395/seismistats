/**
 * Main container page for Earthquake Charts view
 *
 * IMPORTANT: Date ranges for API queries are calculated in UTC to match
 * USGS data storage. Display formatting respects user timezone preference.
 */

import { useEffect, useMemo, useState } from 'react';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { fillMissingDays } from '../../services/usgs-earthquake-api';
import { ChartFilters } from './ChartFilters';
import { EarthquakeSummary } from './EarthquakeSummary';
import { RechartsBarChart } from './RechartsBarChart';
import { MagnitudeDistributionChart } from './MagnitudeDistributionChart';
import { EnergyReleaseChart } from './EnergyReleaseChart';
import { CacheStatusPanel } from './CacheStatusPanel';
import { useChartData, useIsApiMode } from './useChartData';
import { TIME_RANGE_OPTIONS } from '../../types/earthquake';
import type { TimeGrouping } from './magnitudeDistributionUtils';
import { TIME_GROUPING_OPTIONS, aggregateByTimePeriod } from './magnitudeDistributionUtils';

/**
 * Get smart default time grouping based on days in range
 */
function getSmartGrouping(days: number): TimeGrouping {
  if (days <= 30) return 'day';
  if (days <= 90) return 'week';
  if (days <= 730) return 'month';
  return 'year';
}

export function EarthquakeChartsPage() {
  const {
    earthquakes,
    dailyAggregates,
    isLoading,
    error,
    lastFetched,
    fetchEarthquakes,
    regionScope,
    minMagnitude,
    maxMagnitude,
    timeRange,
    customStartDate,
    customEndDate,
  } = useEarthquakeStore();

  // Check if using V2 API mode
  const isApiMode = useIsApiMode();

  // Auto-refresh hook - active when on this page AND in V1 mode only
  // V2 API mode handles data freshness server-side
  const { isRefreshing, newEventsFound } = useAutoRefresh(!isApiMode);

  // Time grouping for all charts (shared in API mode for efficiency)
  const [chartGrouping, setChartGrouping] = useState<TimeGrouping>('day');

  // Filter earthquakes by current magnitude range (V1 mode only)
  const filteredEarthquakes = useMemo(() => {
    if (isApiMode) return []; // Not used in API mode
    return earthquakes.filter(eq => {
      const m = eq.properties.mag ?? 0;
      return m >= minMagnitude && m <= maxMagnitude;
    });
  }, [earthquakes, minMagnitude, maxMagnitude, isApiMode]);

  // Calculate days in range for smart chart defaults
  const daysInRange = useMemo(() => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (24 * 60 * 60 * 1000));
    }
    const option = TIME_RANGE_OPTIONS.find(o => o.value === timeRange);
    return option?.days || 30;
  }, [timeRange, customStartDate, customEndDate]);

  // Calculate the actual date range for chart queries
  // Uses UTC for consistency with USGS API data
  const dateRange = useMemo(() => {
    // End date: end of today in UTC (23:59:59.999)
    const now = new Date();
    const endDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    ));

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    // Start date: beginning of day (daysInRange - 1) days ago in UTC
    // Example: "Last 7 Days" with today=Jan 10 means Jan 4-10 (7 days)
    // So we subtract (7-1)=6 to get Jan 4 as start
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (daysInRange - 1),
      0, 0, 0, 0
    ));

    return { startDate, endDate };
  }, [timeRange, customStartDate, customEndDate, daysInRange]);

  // Use chart data hook (fetches from API in V2 mode, computes locally in V1 mode)
  const chartData = useChartData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    minMagnitude,
    maxMagnitude,
    timeGrouping: chartGrouping,
  });

  // Update chart grouping when date range changes
  useEffect(() => {
    setChartGrouping(getSmartGrouping(daysInRange));
  }, [daysInRange]);

  // Fetch data on mount if not already loaded (V1 mode - store needs data)
  useEffect(() => {
    if (!isApiMode && !lastFetched) {
      fetchEarthquakes();
    }
  }, [fetchEarthquakes, lastFetched, isApiMode]);

  // Aggregate data for top chart based on selected grouping (V1 mode only)
  // In API mode, this comes from chartData.dailyCounts
  const topChartData = useMemo(() => {
    if (isApiMode) {
      return chartData.dailyCounts;
    }
    if (chartGrouping === 'day') {
      // Fill in all days in the range, even those with no earthquakes
      return fillMissingDays(dailyAggregates, dateRange.startDate, dateRange.endDate);
    }
    // Aggregate by the selected time period (use filtered data)
    // Pass dateRange to fill in ALL periods including those with 0 earthquakes
    return aggregateByTimePeriod(filteredEarthquakes, chartGrouping, dateRange);
  }, [isApiMode, chartData.dailyCounts, filteredEarthquakes, dailyAggregates, chartGrouping, dateRange]);

  // Build chart title
  const getChartTitle = () => {
    const parts = [];
    // Use clean labels (TIME_GROUPING_OPTIONS has 'By Day' etc, we just want 'Day')
    const groupLabels: Record<TimeGrouping, string> = {
      day: 'Day',
      week: 'Week',
      month: 'Month',
      year: 'Year',
    };
    parts.push(`Earthquakes by ${groupLabels[chartGrouping]}`);

    // Build magnitude range string
    const minStr = `M${minMagnitude}`;
    const maxStr = maxMagnitude >= 10 ? 'M9+' : `M${maxMagnitude}`;
    if (minMagnitude === maxMagnitude) {
      parts.push(`(${minStr})`);
    } else {
      parts.push(`(${minStr} to ${maxStr})`);
    }

    parts.push('-');
    parts.push(regionScope === 'us' ? 'United States' : 'Worldwide');
    return parts.join(' ');
  };

  // Determine loading state
  const showLoading = isApiMode ? chartData.isLoading : isLoading;
  const displayError = isApiMode ? chartData.error : error;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#111827',
      }}
    >
      {/* Main content area - left side */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Pinned filter section - doesn't scroll */}
        <div style={{ padding: '0.75rem 0.75rem 0 0.75rem', flexShrink: 0 }}>
          {/* Filters with embedded progress */}
          <ChartFilters
            isAutoRefreshing={isRefreshing}
            newEventsFound={newEventsFound}
            chartGrouping={chartGrouping}
            onChartGroupingChange={setChartGrouping}
          />
        </div>

        {/* Scrollable charts area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem 0.75rem 0.75rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>

          {/* Chart area */}
          <div
            style={{
              backgroundColor: 'rgba(31, 41, 55, 0.8)',
              borderRadius: '0.5rem',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              padding: '0.75rem 1rem',
            }}
          >
            {/* Chart header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <h2
                style={{
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {getChartTitle()}
              </h2>

              {/* Time grouping buttons - only in V1 mode (V2 mode uses filter panel) */}
              {!isApiMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {TIME_GROUPING_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setChartGrouping(option.value)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          color: chartGrouping === option.value ? '#111827' : '#9ca3af',
                          backgroundColor: chartGrouping === option.value ? '#60a5fa' : 'transparent',
                          border: '1px solid',
                          borderColor: chartGrouping === option.value ? '#60a5fa' : '#374151',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error state */}
          {displayError && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '0.375rem',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#fca5a5',
                marginBottom: '1rem',
              }}
            >
              <strong>Error:</strong> {displayError}
            </div>
          )}

          {/* Loading state */}
          {showLoading && topChartData.length === 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    border: '3px solid #374151',
                    borderTopColor: '#60a5fa',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem',
                  }}
                />
                <p>Loading earthquake data...</p>
              </div>
            </div>
          )}

          {/* Chart - always show, fillMissingDays ensures all days are present */}
          <RechartsBarChart data={topChartData} />
        </div>

        {/* Magnitude Distribution Chart - always show */}
        <MagnitudeDistributionChart
          earthquakes={isApiMode ? undefined : filteredEarthquakes}
          aggregatedData={isApiMode ? chartData.magnitudeDistribution : undefined}
          title="Magnitude Distribution Over Time"
          height={280}
          daysInRange={daysInRange}
          dateRange={dateRange}
          timeGrouping={isApiMode ? chartGrouping : undefined}
          onTimeGroupingChange={isApiMode ? setChartGrouping : undefined}
        />

        {/* Energy Release Chart - always show */}
        <EnergyReleaseChart
          earthquakes={isApiMode ? undefined : filteredEarthquakes}
          aggregatedData={isApiMode ? chartData.energyRelease : undefined}
          title="Seismic Energy Released"
          height={280}
          daysInRange={daysInRange}
          dateRange={dateRange}
          timeGrouping={isApiMode ? chartGrouping : undefined}
          onTimeGroupingChange={isApiMode ? setChartGrouping : undefined}
        />
        </div>
      </div>

      {/* Right Sidebar - extends full height from header to bottom */}
      <div
        style={{
          width: '300px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1rem',
          borderLeft: '1px solid rgba(75, 85, 99, 0.3)',
          overflowY: 'auto',
        }}
      >
        <EarthquakeSummary apiStats={chartData.summaryStats} />

        {/* Cache Status Panel */}
        <CacheStatusPanel />

        {/* Info card */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(31, 41, 55, 0.8)',
            borderRadius: '0.5rem',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(75, 85, 99, 0.3)',
          }}
        >
          <h3
            style={{
              color: '#d1d5db',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            About This Data
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.5 }}>
            Earthquake data is sourced from the{' '}
            <a
              href="https://earthquake.usgs.gov/fdsnws/event/1/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60a5fa' }}
            >
              USGS Earthquake Catalog API
            </a>
            . Data is typically updated within minutes of an earthquake occurring.
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              lineHeight: 1.5,
              marginTop: '0.5rem',
            }}
          >
            <strong style={{ color: '#d1d5db' }}>Data availability:</strong> Comprehensive global coverage from 1973.
            US data with some gaps back to 1900. Historical significant earthquakes to ~1568.
          </p>
          {regionScope === 'us' && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                lineHeight: 1.5,
                marginTop: '0.5rem',
              }}
            >
              US data includes: Continental US, Alaska, Hawaii, Puerto Rico/USVI, and Guam.
            </p>
          )}

          {/* Data Mode Indicator */}
          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(75, 85, 99, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isApiMode ? '#22c55e' : '#f59e0b',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
              {isApiMode ? 'V2 Mode (Server API)' : 'V1 Mode (Client-side)'}
            </span>
          </div>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
