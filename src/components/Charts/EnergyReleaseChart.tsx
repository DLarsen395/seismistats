/**
 * Energy Release Chart
 *
 * Shows cumulative seismic energy released per time period with:
 * - Bars representing total energy (sum) per period on LOG scale
 * - Line + dots representing average magnitude per period
 *
 * Energy is calculated using the Gutenberg-Richter formula:
 * E = 10^(1.5M + 4.8) joules
 *
 * Uses LOGARITHMIC scale because energy spans many orders of magnitude
 * (a M7 releases ~1000x more energy than M5)
 */

import { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { EarthquakeFeature } from '../../services/usgs-earthquake-api';
import {
  type TimeGrouping,
  TIME_GROUPING_OPTIONS,
  aggregateEnergyByTimePeriod,
  formatEnergy,
  type EnergyDataPoint,
} from './magnitudeDistributionUtils';

// Extended data point with log values for visualization
interface ChartDataPoint extends EnergyDataPoint {
  logEnergy: number;
}

// =============================================================================
// Types
// =============================================================================

export interface EnergyReleaseChartProps {
  /** Earthquake data to visualize */
  earthquakes: EarthquakeFeature[];
  /** Chart title */
  title?: string;
  /** Chart height in pixels */
  height?: number;
  /** Number of days in the data range - used for smart grouping defaults */
  daysInRange?: number;
}

// =============================================================================
// Constants
// =============================================================================

const colors = {
  bar: '#f97316',       // orange-500 - total energy bars
  barHover: '#fb923c',  // orange-400
  line: '#22d3ee',      // cyan-400 - average magnitude line
  lineDot: '#06b6d4',   // cyan-500
  grid: '#374151',      // gray-700
  text: '#d1d5db',      // gray-300
  textMuted: '#9ca3af', // gray-400
  tooltip: {
    bg: '#1f2937',
    border: '#374151',
    text: '#f3f4f6',
  },
};

// Color scale for bars based on energy level (log scale)
function getBarColor(logEnergy: number, minLog: number, maxLog: number): string {
  const ratio = maxLog > minLog ? (logEnergy - minLog) / (maxLog - minLog) : 0.5;
  // Gradient from orange-400 to red-500 based on energy intensity
  if (ratio < 0.33) return '#fb923c';  // orange-400 (low)
  if (ratio < 0.66) return '#f97316';  // orange-500 (medium)
  return '#ef4444';  // red-500 (high)
}

/**
 * Format log energy axis - shows as magnitude equivalent
 * log10(E) = 1.5M + 4.8, so M = (log10(E) - 4.8) / 1.5
 */
function formatLogEnergyAxis(logValue: number): string {
  const magnitude = (logValue - 4.8) / 1.5;
  if (magnitude < 0) return '';
  return `M${magnitude.toFixed(0)}`;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get smart default time grouping based on days in range
 */
function getSmartGrouping(days: number): TimeGrouping {
  if (days <= 30) return 'day';
  if (days <= 90) return 'week';
  if (days <= 730) return 'month';
  return 'year';
}

/**
 * Calculate optimal bar width based on data length
 */
function getBarConfig(dataLength: number): { maxBarSize: number } {
  if (dataLength <= 7) return { maxBarSize: 50 };
  if (dataLength <= 14) return { maxBarSize: 40 };
  if (dataLength <= 30) return { maxBarSize: 25 };
  if (dataLength <= 90) return { maxBarSize: 12 };
  if (dataLength <= 180) return { maxBarSize: 6 };
  return { maxBarSize: 3 };
}

// =============================================================================
// Custom Tooltip Component
// =============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
    payload: ChartDataPoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: colors.tooltip.bg,
        border: `1px solid ${colors.tooltip.border}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: colors.bar,
              borderRadius: '2px',
              flexShrink: 0,
            }}
          />
          <span style={{ color: colors.textMuted }}>Total Energy:</span>
          <span style={{ color: colors.bar, fontWeight: 600 }}>
            {formatEnergy(data.totalEnergy)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: colors.line,
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <span style={{ color: colors.textMuted }}>Avg Magnitude:</span>
          <span style={{ color: colors.line, fontWeight: 600 }}>
            M{data.avgMagnitude.toFixed(1)}
          </span>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: colors.textMuted,
          marginTop: '0.25rem',
          paddingTop: '0.25rem',
          borderTop: `1px solid ${colors.grid}`,
        }}>
          <span>{data.count.toLocaleString()} earthquakes</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function EnergyReleaseChart({
  earthquakes,
  title = 'Seismic Energy Released',
  height = 280,
  daysInRange = 30,
}: EnergyReleaseChartProps) {
  // Time grouping state
  const [grouping, setGrouping] = useState<TimeGrouping>(() => getSmartGrouping(daysInRange));

  // Update grouping when date range changes
  useEffect(() => {
    setGrouping(getSmartGrouping(daysInRange));
  }, [daysInRange]);

  // Aggregate data by time period and add log values
  const { chartData, minLog, maxLog } = useMemo(() => {
    const rawData = aggregateEnergyByTimePeriod(earthquakes, grouping);

    // Convert to log scale for visualization
    const withLog: ChartDataPoint[] = rawData.map(d => ({
      ...d,
      logEnergy: d.totalEnergy > 0 ? Math.log10(d.totalEnergy) : 0,
    }));

    const logValues = withLog.map(d => d.logEnergy).filter(v => v > 0);
    const minLog = logValues.length > 0 ? Math.min(...logValues) : 0;
    const maxLog = logValues.length > 0 ? Math.max(...logValues) : 1;

    return { chartData: withLog, minLog, maxLog };
  }, [earthquakes, grouping]);

  // Calculate bar configuration
  const barConfig = useMemo(() => getBarConfig(chartData.length), [chartData.length]);

  // Calculate tick interval for X axis
  const tickInterval = useMemo(() => {
    if (chartData.length > 60) return Math.floor(chartData.length / 12);
    if (chartData.length > 30) return Math.floor(chartData.length / 10);
    if (chartData.length > 14) return 1;
    return 0;
  }, [chartData.length]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalEnergy: 0, maxEnergy: 0, avgMagnitude: 0 };
    }
    const totalEnergy = chartData.reduce((sum, d) => sum + d.totalEnergy, 0);
    const maxEnergy = Math.max(...chartData.map(d => d.totalEnergy));
    const totalCount = chartData.reduce((sum, d) => sum + d.count, 0);
    const weightedMagSum = chartData.reduce((sum, d) => sum + d.avgMagnitude * d.count, 0);
    return {
      totalEnergy,
      maxEnergy,
      avgMagnitude: totalCount > 0 ? weightedMagSum / totalCount : 0,
    };
  }, [chartData]);

  if (earthquakes.length === 0) {
    return null;
  }

  // Generate nice tick values for log scale (energy in joules)
  // M0 ≈ 10^4.8, M2 ≈ 10^7.8, M4 ≈ 10^10.8, M6 ≈ 10^13.8
  const logTicks: number[] = [];
  const tickMin = Math.floor(minLog / 3) * 3;  // Round down to nearest 3
  const tickMax = Math.ceil(maxLog / 3) * 3;   // Round up to nearest 3
  for (let i = tickMin; i <= tickMax; i += 3) {
    if (i >= 4) logTicks.push(i);  // Only show M0 and above
  }

  return (
    <div
      style={{
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '0.75rem 1rem',
      }}
    >
      {/* Header */}
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
        <div>
          <h3
            style={{
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {title}
          </h3>
          <p style={{
            fontSize: '0.7rem',
            color: colors.textMuted,
            margin: '0.25rem 0 0 0'
          }}>
            Total: {formatEnergy(stats.totalEnergy)} | Peak: {formatEnergy(stats.maxEnergy)} | Avg: M{stats.avgMagnitude.toFixed(1)}
          </p>
        </div>

        {/* Time grouping buttons */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {TIME_GROUPING_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setGrouping(option.value)}
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.7rem',
                color: grouping === option.value ? '#111827' : '#9ca3af',
                backgroundColor: grouping === option.value ? '#60a5fa' : 'transparent',
                border: '1px solid',
                borderColor: grouping === option.value ? '#60a5fa' : '#374151',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: 5, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              vertical={false}
            />

            <XAxis
              dataKey="period"
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              interval={tickInterval}
              angle={chartData.length > 30 ? -45 : 0}
              textAnchor={chartData.length > 30 ? 'end' : 'middle'}
              height={chartData.length > 30 ? 50 : 30}
            />

            {/* Left Y-axis for log energy (bars) - labeled as magnitude equivalent */}
            <YAxis
              yAxisId="energy"
              orientation="left"
              domain={[Math.max(4, minLog - 1), maxLog + 1]}
              ticks={logTicks}
              tick={{ fill: colors.text, fontSize: 10 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={formatLogEnergyAxis}
              label={{
                value: 'Energy (≈Mag)',
                angle: -90,
                position: 'insideLeft',
                fill: colors.textMuted,
                fontSize: 10,
                offset: 5,
              }}
            />

            {/* Right Y-axis for average magnitude (line) */}
            <YAxis
              yAxisId="magnitude"
              orientation="right"
              domain={[0, 6]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fill: colors.line, fontSize: 10 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={(v) => `M${v}`}
              width={28}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={24}
              wrapperStyle={{ fontSize: '0.75rem' }}
              formatter={(value) => (
                <span style={{ color: colors.text }}>{value}</span>
              )}
            />

            {/* Log energy bars with color intensity */}
            <Bar
              yAxisId="energy"
              dataKey="logEnergy"
              name="Energy (log)"
              fill={colors.bar}
              maxBarSize={barConfig.maxBarSize}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.logEnergy, minLog, maxLog)}
                />
              ))}
            </Bar>

            {/* Average magnitude line with dots */}
            <Line
              yAxisId="magnitude"
              type="monotone"
              dataKey="avgMagnitude"
              name="Avg Magnitude"
              stroke={colors.line}
              strokeWidth={2}
              dot={{
                fill: colors.lineDot,
                stroke: colors.line,
                strokeWidth: 1,
                r: chartData.length > 60 ? 0 : chartData.length > 30 ? 2 : 3,
              }}
              activeDot={{
                fill: colors.line,
                stroke: '#fff',
                strokeWidth: 2,
                r: 5,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Scale note */}
      <p style={{
        fontSize: '0.65rem',
        color: colors.textMuted,
        margin: '0.125rem 0 0 0',
        fontStyle: 'italic',
      }}>
        Energy on logarithmic scale (a M6 releases ~1000× more energy than M4)
      </p>
    </div>
  );
}
