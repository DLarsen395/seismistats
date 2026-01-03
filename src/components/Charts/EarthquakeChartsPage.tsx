/**
 * Main container page for Earthquake Charts view
 */

import { useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { fillMissingDays } from '../../services/usgs-earthquake-api';
import { ChartFilters } from './ChartFilters';
import { EarthquakeSummary } from './EarthquakeSummary';
import { RechartsBarChart } from './RechartsBarChart';
import { MagnitudeDistributionChart } from './MagnitudeDistributionChart';
import { EnergyReleaseChart } from './EnergyReleaseChart';
import { CacheStatusPanel } from './CacheStatusPanel';
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

  // Auto-refresh hook - active when on this page
  const { isRefreshing, newEventsFound } = useAutoRefresh(true);

  // Time grouping for top chart
  const [topChartGrouping, setTopChartGrouping] = useState<TimeGrouping>('day');

  // Calculate days in range for smart chart defaults
  const daysInRange = useMemo(() => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (24 * 60 * 60 * 1000));
    }
    const option = TIME_RANGE_OPTIONS.find(o => o.value === timeRange);
    return option?.days || 30;
  }, [timeRange, customStartDate, customEndDate]);

  // Calculate the actual date range for filling in missing days
  // IMPORTANT: endDate must always be TODAY (current local date)
  // Not memoized to ensure it always uses the current date
  const dateRange = (() => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const startDate = subDays(new Date(), daysInRange);
    startDate.setHours(0, 0, 0, 0); // Start of that day
    return { startDate, endDate };
  })();

  // Update top chart grouping when date range changes
  useEffect(() => {
    setTopChartGrouping(getSmartGrouping(daysInRange));
  }, [daysInRange]);

  // Fetch data on mount if not already loaded
  useEffect(() => {
    if (!lastFetched) {
      fetchEarthquakes();
    }
  }, [fetchEarthquakes, lastFetched]);

  // Aggregate data for top chart based on selected grouping
  // Fill in missing days when grouped by day
  const topChartData = useMemo(() => {
    // === DEBUG OUTPUT ===
    console.group('🔍 Chart Data Debug');
    console.log('Current Date:', new Date().toISOString());
    console.log('Time Range:', timeRange);
    console.log('Days in Range:', daysInRange);
    console.log('Date Range:', {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    });
    console.log('Min Magnitude Filter:', minMagnitude);
    console.log('Max Magnitude Filter:', maxMagnitude);
    console.log('Total Earthquakes:', earthquakes.length);
    console.log('Daily Aggregates Count:', dailyAggregates.length);
    console.log('Top Chart Grouping:', topChartGrouping);

    // Log M4+ earthquakes in the data
    const m4Plus = earthquakes.filter(eq => (eq.properties.mag ?? 0) >= 4);
    console.log(`M4+ Earthquakes (${m4Plus.length}):`, m4Plus.map(eq => ({
      mag: eq.properties.mag,
      time: new Date(eq.properties.time).toISOString(),
      localTime: new Date(eq.properties.time).toLocaleString(),
      place: eq.properties.place,
    })));

    // Log first and last few daily aggregates
    if (dailyAggregates.length > 0) {
      console.log('First 5 Daily Aggregates:', dailyAggregates.slice(0, 5));
      console.log('Last 5 Daily Aggregates:', dailyAggregates.slice(-5));
    }
    console.groupEnd();
    // === END DEBUG OUTPUT ===

    if (topChartGrouping === 'day') {
      // Fill in all days in the range, even those with no earthquakes
      const filled = fillMissingDays(dailyAggregates, dateRange.startDate, dateRange.endDate);
      console.log('📊 Filled Chart Data:', {
        totalDays: filled.length,
        first5: filled.slice(0, 5),
        last5: filled.slice(-5),
        daysWithEvents: filled.filter(d => d.count > 0).length,
      });
      return filled;
    }
    // Aggregate by the selected time period
    return aggregateByTimePeriod(earthquakes, topChartGrouping);
  }, [earthquakes, dailyAggregates, topChartGrouping, dateRange, timeRange, daysInRange, minMagnitude, maxMagnitude]);

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
    parts.push(`Earthquakes by ${groupLabels[topChartGrouping]}`);

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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Time grouping buttons */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {TIME_GROUPING_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTopChartGrouping(option.value)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        color: topChartGrouping === option.value ? '#111827' : '#9ca3af',
                        backgroundColor: topChartGrouping === option.value ? '#60a5fa' : 'transparent',
                        border: '1px solid',
                        borderColor: topChartGrouping === option.value ? '#60a5fa' : '#374151',
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
            </div>

            {/* Error state */}
          {error && (
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
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && dailyAggregates.length === 0 && (
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
          earthquakes={earthquakes}
          title="Magnitude Distribution Over Time"
          height={280}
          daysInRange={daysInRange}
          dateRange={dateRange}
        />

        {/* Energy Release Chart - always show */}
        <EnergyReleaseChart
          earthquakes={earthquakes}
          title="Seismic Energy Released"
          height={280}
          daysInRange={daysInRange}
          dateRange={dateRange}
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
        <EarthquakeSummary />

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
