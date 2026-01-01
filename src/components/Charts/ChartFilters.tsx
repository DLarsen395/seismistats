/**
 * Filter controls for earthquake charts
 */

import { useState } from 'react';
import { format, subYears } from 'date-fns';
import { useEarthquakeStore } from '../../stores/earthquakeStore';
import { 
  MIN_MAGNITUDE_OPTIONS, 
  MAX_MAGNITUDE_OPTIONS,
  TIME_RANGE_OPTIONS, 
  REGION_SCOPE_OPTIONS,
} from '../../types/earthquake';
import type { ChartLibrary } from '../../types/earthquake';

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

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'white',
  backgroundColor: 'rgba(55, 65, 81, 0.8)',
  border: '1px solid rgba(75, 85, 99, 0.5)',
  borderRadius: '0.375rem',
  outline: 'none',
  minWidth: '130px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginBottom: '0.25rem',
  display: 'block',
};

export function ChartFilters() {
  const {
    minMagnitude,
    maxMagnitude,
    timeRange,
    regionScope,
    chartLibrary,
    customStartDate,
    customEndDate,
    setMinMagnitude,
    setMaxMagnitude,
    setTimeRange,
    setRegionScope,
    setChartLibrary,
    setCustomDateRange,
    isLoading,
  } = useEarthquakeStore();

  // Local state for custom date inputs
  const [startInput, setStartInput] = useState(
    customStartDate ? format(customStartDate, 'yyyy-MM-dd') : format(subYears(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endInput, setEndInput] = useState(
    customEndDate ? format(customEndDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );

  const handleApplyCustomRange = () => {
    const start = new Date(startInput);
    const end = new Date(endInput);
    if (start <= end) {
      setCustomDateRange(start, end);
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
        <label style={labelStyle}>Time Range</label>
        <select
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
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              disabled={isLoading}
              style={{
                ...inputStyle,
                opacity: isLoading ? 0.5 : 1,
                colorScheme: 'dark',
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              disabled={isLoading}
              style={{
                ...inputStyle,
                opacity: isLoading ? 0.5 : 1,
                colorScheme: 'dark',
              }}
            />
          </div>
          <button
            onClick={handleApplyCustomRange}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              color: 'white',
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Apply
          </button>
        </>
      )}

      {/* Min Magnitude Filter */}
      <div>
        <label style={labelStyle}>Min Magnitude</label>
        <select
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
        <label style={labelStyle}>Max Magnitude</label>
        <select
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
        <label style={labelStyle}>Region</label>
        <select
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

      {/* Chart Library Toggle */}
      <div>
        <label style={labelStyle}>Chart Library</label>
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            padding: '0.25rem',
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            borderRadius: '0.375rem',
          }}
        >
          {(['recharts', 'chartjs'] as ChartLibrary[]).map((lib) => (
            <button
              key={lib}
              onClick={() => setChartLibrary(lib)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.875rem',
                fontWeight: chartLibrary === lib ? '600' : '400',
                color: chartLibrary === lib ? 'white' : '#9ca3af',
                backgroundColor: chartLibrary === lib
                  ? 'rgba(59, 130, 246, 0.8)'
                  : 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {lib === 'recharts' ? 'Recharts' : 'Chart.js'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
