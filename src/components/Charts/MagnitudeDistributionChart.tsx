                                                                                                                                                                                  /**
 * Magnitude Distribution Over Time Chart
 *
 * Shows earthquake counts by magnitude range over configurable time periods.
 * Uses Recharts AreaChart with stacked areas for magnitude ranges.
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { EarthquakeFeature } from '../../services/usgs-earthquake-api';
import {
  type TimeGrouping,
  MAGNITUDE_RANGES,
  MAGNITUDE_CHART_COLORS as colors,
  TIME_GROUPING_OPTIONS,
  aggregateByTimePeriodAndMagnitude,
} from './magnitudeDistributionUtils';

/**
 * Props for the component
 */
export interface MagnitudeDistributionChartProps {
  /** Earthquake data to visualize (V1 mode) */
  earthquakes?: EarthquakeFeature[];
  /** Pre-aggregated data from API (V2 mode) - if provided, bypasses internal aggregation */
  aggregatedData?: import('./magnitudeDistributionUtils').MagnitudeTimeDataPoint[];
  /** Chart title */
  title?: string;
  /** Chart height in pixels */
  height?: number;
  /** Number of days in the data range - used for smart grouping defaults */
  daysInRange?: number;
  /** Date range for filling in missing days (optional - used when grouping by day) */
  dateRange?: { startDate: Date; endDate: Date };
  /** External time grouping control (V2 mode) */
  timeGrouping?: TimeGrouping;
  /** Callback when time grouping changes (V2 mode) */
  onTimeGroupingChange?: (grouping: TimeGrouping) => void;
}

// =============================================================================
// Custom Components
// =============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: string;
}

/**
 * Custom tooltip for the chart
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Filter out zero values and sort by magnitude (highest first)
  const nonZeroPayload = payload
    .filter(p => p.value > 0)
    .sort((a, b) => {
      const aRange = MAGNITUDE_RANGES.find(r => r.key === a.dataKey);
      const bRange = MAGNITUDE_RANGES.find(r => r.key === b.dataKey);
      return (bRange?.min || 0) - (aRange?.min || 0);
    });

  const total = nonZeroPayload.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      style={{
        backgroundColor: '#1f2937',  // Solid color, no transparency
        border: `1px solid ${colors.tooltip.border}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        maxHeight: '300px',
        overflowY: 'auto',
        opacity: 1,  // Ensure fully opaque
      }}
    >
      <p style={{
        color: colors.tooltip.text,
        fontWeight: 600,
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
        borderBottom: `1px solid ${colors.grid}`,
        paddingBottom: '0.5rem',
      }}>
        {label}
      </p>
      <p style={{
        color: colors.textMuted,
        fontSize: '0.75rem',
        marginBottom: '0.5rem',
      }}>
        Total: <span style={{ color: colors.tooltip.text, fontWeight: 600 }}>{total}</span>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {nonZeroPayload.map((entry) => (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: entry.color,
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />
            <span style={{ color: colors.textMuted, minWidth: '70px' }}>
              M {entry.name}:
            </span>
            <span style={{ color: colors.tooltip.text, fontWeight: 500 }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RangeFilterProps {
  enabledRanges: Set<string>;
  onToggleRange: (key: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectHighMag: () => void;
}

/**
 * Magnitude range filter component
 */
function RangeFilter({
  enabledRanges,
  onToggleRange,
  onSelectAll,
  onSelectNone,
  onSelectHighMag,
}: RangeFilterProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        flexWrap: 'wrap',
      }}>
        <span style={{
          color: colors.text,
          fontSize: '0.75rem',
          fontWeight: 500,
        }}>
          Filter Ranges:
        </span>
        <button
          onClick={onSelectAll}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.625rem',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.grid}`,
            borderRadius: '0.25rem',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          All
        </button>
        <button
          onClick={onSelectNone}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.625rem',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.grid}`,
            borderRadius: '0.25rem',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          None
        </button>
        <button
          onClick={onSelectHighMag}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.625rem',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.grid}`,
            borderRadius: '0.25rem',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          M4+
        </button>
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.375rem',
      }}>
        {MAGNITUDE_RANGES.map((range) => {
          const isEnabled = enabledRanges.has(range.key);
          return (
            <button
              key={range.key}
              onClick={() => onToggleRange(range.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.625rem',
                backgroundColor: isEnabled ? range.color + '30' : 'transparent',
                border: `1px solid ${isEnabled ? range.color : colors.grid}`,
                borderRadius: '0.25rem',
                color: isEnabled ? range.color : colors.textMuted,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: isEnabled ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: range.color,
                  borderRadius: '2px',
                  opacity: isEnabled ? 1 : 0.3,
                }}
              />
              {range.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Get smart default time grouping based on date range
 */
function getDefaultTimeGrouping(daysInRange: number): TimeGrouping {
  if (daysInRange <= 30) return 'day';       // Last 30 days or less → By Day
  if (daysInRange <= 90) return 'week';      // Last 90 days → By Week
  if (daysInRange <= 730) return 'month';    // Last 2 years → By Month
  return 'year';                              // 5+ years → By Year
}

export function MagnitudeDistributionChart({
  earthquakes,
  aggregatedData,
  title = 'Magnitude Distribution Over Time',
  height = 400,
  daysInRange = 30,
  dateRange,
  timeGrouping: externalGrouping,
  onTimeGroupingChange,
}: MagnitudeDistributionChartProps) {
  // Calculate smart default based on date range
  const defaultGrouping = useMemo(() => getDefaultTimeGrouping(daysInRange), [daysInRange]);

  // State for configuration - initialize with smart default
  // Use external grouping if provided (V2 mode), otherwise internal state (V1 mode)
  const [internalGrouping, setInternalGrouping] = useState<TimeGrouping>(defaultGrouping);
  const timeGrouping = externalGrouping ?? internalGrouping;
  const setTimeGrouping = onTimeGroupingChange ?? setInternalGrouping;

  const [enabledRanges, setEnabledRanges] = useState<Set<string>>(
    () => new Set(MAGNITUDE_RANGES.map(r => r.key))
  );

  // Update grouping when date range changes significantly (only in V1 mode)
  const prevDaysRef = useRef(daysInRange);
  useEffect(() => {
    if (externalGrouping !== undefined) return; // Skip in V2 mode
    const prevDefault = getDefaultTimeGrouping(prevDaysRef.current);
    const newDefault = getDefaultTimeGrouping(daysInRange);
    // Only auto-switch if the optimal grouping changed
    if (prevDefault !== newDefault) {
      // Defer state update to avoid cascading renders
      requestAnimationFrame(() => {
        setInternalGrouping(newDefault);
      });
    }
    prevDaysRef.current = daysInRange;
  }, [daysInRange, externalGrouping]);

  // Use provided aggregated data (V2 mode) or compute it (V1 mode)
  const chartData = useMemo(() => {
    if (aggregatedData) {
      return aggregatedData;
    }
    if (!earthquakes) {
      return [];
    }
    return aggregateByTimePeriodAndMagnitude(earthquakes, timeGrouping, dateRange);
  }, [earthquakes, aggregatedData, timeGrouping, dateRange]);

  // Get enabled magnitude ranges
  const activeRanges = useMemo(
    () => MAGNITUDE_RANGES.filter(r => enabledRanges.has(r.key)),
    [enabledRanges]
  );

  // Handlers
  const handleToggleRange = useCallback((key: string) => {
    setEnabledRanges(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setEnabledRanges(new Set(MAGNITUDE_RANGES.map(r => r.key)));
  }, []);

  const handleSelectNone = useCallback(() => {
    setEnabledRanges(new Set());
  }, []);

  const handleSelectHighMag = useCallback(() => {
    // Select M4+ ranges
    setEnabledRanges(new Set(
      MAGNITUDE_RANGES.filter(r => r.min >= 4).map(r => r.key)
    ));
  }, []);

  // Calculate total events in visible ranges
  const totalVisible = useMemo(() => {
    return chartData.reduce((sum, point) => {
      let pointSum = 0;
      for (const range of activeRanges) {
        pointSum += (point[range.key] as number) || 0;
      }
      return sum + pointSum;
    }, 0);
  }, [chartData, activeRanges]);

  // Calculate totals per magnitude range for the summary bar
  const rangeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const range of activeRanges) {
      totals[range.key] = chartData.reduce((sum, point) => {
        return sum + ((point[range.key] as number) || 0);
      }, 0);
    }
    return totals;
  }, [chartData, activeRanges]);

  // Only show "no data" if we have no chart data (no days in range)
  // When chartData exists (filled by dateRange), show the chart even with 0 earthquakes
  if (chartData.length === 0) {
    return (
      <div style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        backgroundColor: colors.background,
        borderRadius: '0.5rem',
      }}>
        No earthquake data available
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: '0.5rem',
      padding: '0.75rem 1rem 0.5rem 1rem',
      border: '1px solid rgba(75, 85, 99, 0.3)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <h3 style={{
            color: colors.text,
            fontSize: '1rem',
            fontWeight: 600,
            margin: 0,
          }}>
            {title}
          </h3>
          <p style={{
            color: colors.textMuted,
            fontSize: '0.7rem',
            margin: '0.25rem 0 0 0',
          }}>
            {totalVisible.toLocaleString()} earthquakes in {chartData.length} periods
          </p>
        </div>

        {/* Time grouping selector - only show in V1 mode (no external control) */}
        {!externalGrouping && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {TIME_GROUPING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeGrouping(option.value)}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  backgroundColor: timeGrouping === option.value
                    ? '#3b82f6'
                    : 'transparent',
                  border: `1px solid ${timeGrouping === option.value
                    ? '#3b82f6'
                    : colors.grid}`,
                  borderRadius: '0.25rem',
                  color: timeGrouping === option.value
                    ? '#ffffff'
                    : colors.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Range filter */}
      <RangeFilter
        enabledRanges={enabledRanges}
        onToggleRange={handleToggleRange}
        onSelectAll={handleSelectAll}
        onSelectNone={handleSelectNone}
        onSelectHighMag={handleSelectHighMag}
      />

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height} minWidth={100} minHeight={100}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 15, left: 0, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.grid}
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fill: colors.text, fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={chartData.length > 15 ? Math.floor(chartData.length / 12) : 0}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
          />
          <YAxis
            tick={{ fill: colors.text, fontSize: 12 }}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
            label={{
              value: 'Earthquake Count',
              angle: -90,
              position: 'insideLeft',
              fill: colors.text,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '0',
              fontSize: '0.75rem',
            }}
            formatter={(value) => (
              <span style={{ color: colors.text }}>{value}</span>
            )}
          />
          {/* Render areas for each enabled magnitude range */}
          {activeRanges.map((range) => (
            <Area
              key={range.key}
              type="monotone"
              dataKey={range.key}
              name={range.label}
              stackId="1"
              stroke={range.color}
              fill={range.color}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary bar showing counts per magnitude range */}
      {activeRanges.length > 0 && (
        <div style={{
          marginTop: '0.25rem',
          padding: '0.25rem 0.5rem',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '0.375rem',
        }}>
          <div style={{
            fontSize: '0.7rem',
            color: colors.textMuted,
            marginBottom: '0.25rem',
          }}>
            Total by Magnitude Range:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {activeRanges.map(range => {
              const count = rangeTotals[range.key] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={range.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.125rem 0.375rem',
                    backgroundColor: `${range.color}30`,
                    borderRadius: '0.25rem',
                    border: `1px solid ${range.color}50`,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: range.color,
                      borderRadius: '2px',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: colors.text }}>
                    {range.label}:
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600 }}>
                    {count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default MagnitudeDistributionChart;
