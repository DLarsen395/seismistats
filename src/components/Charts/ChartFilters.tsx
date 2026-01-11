/**
 * Filter controls for earthquake charts
 */

import { useState, useRef, useEffect } from 'react';
import { subYears } from 'date-fns';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import { useCacheStore } from '../../stores/cacheStore';
import { AutoRefreshIndicator } from './AutoRefreshIndicator';
import { TimezoneToggle } from '../Controls/TimezoneToggle';
import { useIsApiMode } from './useChartData';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  MIN_MAGNITUDE_OPTIONS,
  MAX_MAGNITUDE_OPTIONS,
  TIME_RANGE_OPTIONS,
  REGION_SCOPE_OPTIONS,
} from '../../types/earthquake';
import { TIME_GROUPING_OPTIONS, type TimeGrouping } from './magnitudeDistributionUtils';

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'white',
  backgroundColor: 'rgba(55, 65, 81, 0.8)',
  border: '1px solid rgba(75, 85, 99, 0.5)',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '100px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginBottom: '0.25rem',
  display: 'block',
};

interface ChartFiltersProps {
  /** Whether auto-refresh is currently in progress */
  isAutoRefreshing?: boolean;
  /** Number of new events found by auto-refresh */
  newEventsFound?: number;
  /** Current time grouping for charts */
  chartGrouping?: TimeGrouping;
  /** Callback to change time grouping */
  onChartGroupingChange?: (grouping: TimeGrouping) => void;
}

export function ChartFilters({
  isAutoRefreshing = false,
  newEventsFound = 0,
  chartGrouping = 'day',
  onChartGroupingChange,
}: ChartFiltersProps) {
  const isApiMode = useIsApiMode();
  const {
    minMagnitude,
    maxMagnitude,
    timeRange,
    regionScope,
    customStartDate,
    customEndDate,
    setMinMagnitude,
    setMaxMagnitude,
    setTimeRange,
    setRegionScope,
    setCustomDateRange,
    isLoading,
  } = useEarthquakeStore();

  // Local state for custom date inputs
  const [startDate, setStartDate] = useState<Date | undefined>(
    customStartDate || subYears(new Date(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    customEndDate || new Date()
  );

  const handleApplyCustomRange = () => {
    if (startDate && endDate && startDate <= endDate) {
      setCustomDateRange(startDate, endDate);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        alignItems: 'flex-end',
      }}
    >
      {/* Time Range */}
      <div>
        <label htmlFor="time-range-select" style={labelStyle}>Time Range</label>
        <select
          id="time-range-select"
          name="timeRange"
          title="Select time range for earthquake data"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          disabled={isLoading}
          style={{
            ...selectStyle,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {TIME_RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Range - only shown when 'custom' is selected */}
      {timeRange === 'custom' && (
        <>
          <DatePicker
            date={startDate}
            onDateChange={setStartDate}
            label="Start Date"
            placeholder="Pick start date"
            disabled={isLoading}
            toDate={endDate || new Date()}
          />
          <DatePicker
            date={endDate}
            onDateChange={setEndDate}
            label="End Date"
            placeholder="Pick end date"
            disabled={isLoading}
            fromDate={startDate}
            toDate={new Date()}
          />
          <Button
            onClick={handleApplyCustomRange}
            disabled={isLoading}
            className="self-end"
          >
            Apply
          </Button>
        </>
      )}

      {/* Min Magnitude Filter */}
      <div>
        <label htmlFor="min-magnitude-select" style={labelStyle}>Min Magnitude</label>
        <select
          id="min-magnitude-select"
          name="minMagnitude"
          title="Minimum earthquake magnitude filter"
          value={minMagnitude}
          onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
          disabled={isLoading}
          style={{
            ...selectStyle,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {MIN_MAGNITUDE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}+
            </option>
          ))}
        </select>
      </div>

      {/* Max Magnitude Filter */}
      <div>
        <label htmlFor="max-magnitude-select" style={labelStyle}>Max Magnitude</label>
        <select
          id="max-magnitude-select"
          name="maxMagnitude"
          title="Maximum earthquake magnitude filter"
          value={maxMagnitude}
          onChange={(e) => setMaxMagnitude(parseFloat(e.target.value))}
          disabled={isLoading}
          style={{
            ...selectStyle,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {MAX_MAGNITUDE_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.value < minMagnitude}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Region Scope */}
      <div>
        <label htmlFor="region-scope-select" style={labelStyle}>Region</label>
        <select
          id="region-scope-select"
          name="regionScope"
          title="Geographic region filter"
          value={regionScope}
          onChange={(e) => setRegionScope(e.target.value as typeof regionScope)}
          disabled={isLoading}
          style={{
            ...selectStyle,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {REGION_SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chart Grouping - shown in V2 API mode */}
      {isApiMode && onChartGroupingChange && (
        <div>
          <label htmlFor="chart-grouping-select" style={labelStyle}>Group By</label>
          <select
            id="chart-grouping-select"
            name="chartGrouping"
            title="Time period grouping for charts"
            value={chartGrouping}
            onChange={(e) => onChartGroupingChange(e.target.value as TimeGrouping)}
            style={selectStyle}
          >
            {TIME_GROUPING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Timezone Toggle - allows switching between UTC and local time display */}
      <div>
        <label style={labelStyle}>Display Time</label>
        <TimezoneToggle />
      </div>

      {/* Spacer to push auto-refresh indicator to the right */}
      <div style={{ flex: 1 }} />

      {/* Auto-refresh indicator - right side of panel */}
      <AutoRefreshIndicator
        isRefreshing={isAutoRefreshing}
        newEventsFound={newEventsFound}
        containerHeight={40}
      />

      {/* Fetch Progress - embedded at bottom of filters panel */}
      <FetchProgressBar />
    </div>
  );
}

/**
 * Fetch Progress Bar Component
 * Shows progress when earthquake data is being fetched/cached
 */
function FetchProgressBar() {
  const { progress } = useCacheStore();
  const { isLoading } = useEarthquakeStore();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingStartRef = useRef<number | null>(null);

  const hasProgress = progress.operation !== 'idle';
  const shouldShow = hasProgress || isLoading;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (shouldShow) {
      const startTime = progress.startedAt || loadingStartRef.current || Date.now();
      if (!loadingStartRef.current && isLoading) {
        loadingStartRef.current = Date.now();
      }

      const initialElapsed = Math.round((Date.now() - startTime) / 1000);

      intervalRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTime) / 1000));
      }, 1000);

      requestAnimationFrame(() => {
        setElapsed(initialElapsed);
      });
    } else {
      loadingStartRef.current = null;
      requestAnimationFrame(() => {
        setElapsed(0);
      });
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldShow, progress.startedAt, isLoading]);

  if (!shouldShow) {
    return null;
  }

  const percentage = progress.totalSteps > 0
    ? Math.round((progress.currentStep / progress.totalSteps) * 100)
    : 0;

  const getMessage = () => {
    if (progress.operation !== 'idle' && progress.message) {
      return progress.message;
    }
    if (isLoading) {
      return 'Loading earthquake data...';
    }
    return 'Processing...';
  };

  const getOperationLabel = () => {
    if (progress.operation === 'fetching') return 'Fetching';
    if (progress.operation === 'storing') return 'Caching';
    if (progress.operation === 'validating') return 'Preparing';
    if (isLoading) return 'Loading';
    return 'Processing';
  };

  return (
    <div
      style={{
        width: '100%',
        marginTop: '0.5rem',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderRadius: '0.375rem',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '1rem',
          height: '1rem',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          borderTopColor: '#60a5fa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          flexShrink: 0,
        }}
      />

      {/* Progress info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#93c5fd', fontSize: '0.75rem', fontWeight: 500 }}>
            {getOperationLabel()}
          </span>
          {progress.totalSteps > 1 && (
            <span style={{ color: '#60a5fa', fontSize: '0.7rem', fontWeight: 500 }}>
              Step {progress.currentStep} of {progress.totalSteps}
            </span>
          )}
          {progress.currentDate && (
            <span style={{ color: '#60a5fa', fontSize: '0.7rem' }}>
              {progress.currentDate}
            </span>
          )}
          <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>
            {getMessage()}
          </span>
        </div>

        {/* Progress bar */}
        {progress.totalSteps > 0 && (
          <div
            style={{
              marginTop: '0.25rem',
              height: '3px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                backgroundColor: '#60a5fa',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Indeterminate progress bar */}
        {progress.totalSteps === 0 && (
          <div
            style={{
              marginTop: '0.25rem',
              height: '3px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                height: '100%',
                width: '30%',
                backgroundColor: '#60a5fa',
                animation: 'indeterminate 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Stats - fixed layout to prevent jumping */}
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, fontSize: '0.7rem', minWidth: '140px', justifyContent: 'flex-end' }}>
        <span style={{ color: '#86efac', fontWeight: 500, minWidth: '70px', textAlign: 'right' }}>
          {(progress.eventsLoaded ?? 0).toLocaleString()} events
        </span>
        <span style={{ color: '#9ca3af', minWidth: '32px', textAlign: 'right' }}>
          {progress.totalSteps > 0 ? `${percentage}%` : '0%'}
        </span>
        <span style={{ color: '#6b7280', minWidth: '24px', textAlign: 'right' }}>
          {elapsed}s
        </span>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes indeterminate {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
