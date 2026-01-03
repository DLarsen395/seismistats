/**
 * Recharts-based bar chart for earthquake data
 * Supports dynamic bar width based on data density
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyEarthquakeAggregate } from '../../services/usgs-earthquake-api';

// Type for recharts tooltip props
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyEarthquakeAggregate & { label: string }; value: number }>;
  label?: string;
}

interface RechartsBarChartProps {
  data: DailyEarthquakeAggregate[];
  title?: string;
}

// Dark mode colors (app is always dark)
const colors = {
  bar: '#60a5fa',  // blue-400
  barHover: '#93c5fd',  // blue-300
  grid: '#374151',  // gray-700
  text: '#d1d5db',  // gray-300
  tooltip: {
    bg: '#1f2937',  // gray-800
    border: '#374151',  // gray-700
    text: '#f3f4f6',  // gray-100
  },
};

/**
 * Calculate optimal bar width based on data length
 * Thinner bars for more data points
 */
function getBarConfig(dataLength: number): { maxBarSize: number; barGap: number } {
  if (dataLength <= 7) {
    return { maxBarSize: 60, barGap: 4 };
  } else if (dataLength <= 14) {
    return { maxBarSize: 45, barGap: 3 };
  } else if (dataLength <= 30) {
    return { maxBarSize: 30, barGap: 2 };
  } else if (dataLength <= 90) {
    return { maxBarSize: 15, barGap: 1 };
  } else if (dataLength <= 180) {
    return { maxBarSize: 8, barGap: 0 };
  } else {
    return { maxBarSize: 4, barGap: 0 };  // Very thin for year view
  }
}

/**
 * Get appropriate date format based on data length
 */
function getDateFormat(dataLength: number): Intl.DateTimeFormatOptions {
  if (dataLength <= 14) {
    return { month: 'short', day: 'numeric' };
  } else if (dataLength <= 90) {
    return { month: 'short', day: 'numeric' };
  } else {
    return { month: 'short' };  // Just month for year view
  }
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as DailyEarthquakeAggregate;

  return (
    <div
      style={{
        backgroundColor: colors.tooltip.bg,
        border: `1px solid ${colors.tooltip.border}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      }}
    >
      <p style={{ 
        color: colors.tooltip.text, 
        fontWeight: 600, 
        marginBottom: '0.25rem',
        fontSize: '0.875rem',
      }}>
        {label}
      </p>
      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
        Earthquakes: <span style={{ color: colors.bar, fontWeight: 600 }}>{data.count}</span>
      </p>
      {data.count > 0 && (
        <>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Max: M{data.maxMagnitude.toFixed(1)}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            Avg: M{data.avgMagnitude.toFixed(1)}
          </p>
        </>
      )}
    </div>
  );
}

export function RechartsBarChart({ data, title }: RechartsBarChartProps) {
  const dateFormat = getDateFormat(data.length);
  const barConfig = getBarConfig(data.length);
  
  // Format data with labels
  // The date field might already be a formatted string (for week/month/year grouping)
  // or an ISO date string (for day grouping), so we check before parsing
  const chartData = data.map(d => {
    // Try to parse as date - if it fails or gives Invalid Date, use the original string
    const parsedDate = new Date(d.date);
    const isValidDate = !isNaN(parsedDate.getTime());
    
    return {
      ...d,
      label: isValidDate 
        ? parsedDate.toLocaleDateString('en-US', dateFormat)
        : d.date,  // Already formatted (e.g., "Oct 2025", "2025")
    };
  });

  // Calculate tick interval based on data length
  const tickInterval = data.length > 60 
    ? Math.floor(data.length / 12)  // ~12 labels for year view
    : data.length > 30 
      ? Math.floor(data.length / 10)
      : data.length > 14 
        ? 1  // Every other day for 2 weeks
        : 0;  // Every day for 1 week

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {title && (
        <h3 style={{ 
          color: colors.text, 
          fontSize: '1rem', 
          fontWeight: 600, 
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart 
          data={chartData} 
          margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
          barGap={barConfig.barGap}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.text, fontSize: data.length > 60 ? 10 : 11 }}
            angle={-45}
            textAnchor="end"
            height={45}
            interval={tickInterval}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
          />
          <YAxis
            tick={{ fill: colors.text, fontSize: 12 }}
            tickLine={{ stroke: colors.grid }}
            axisLine={{ stroke: colors.grid }}
            label={{
              value: 'Earthquakes',
              angle: -90,
              position: 'insideLeft',
              fill: colors.text,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          <Bar
            dataKey="count"
            fill={colors.bar}
            radius={data.length > 90 ? [2, 2, 0, 0] : [4, 4, 0, 0]}
            maxBarSize={barConfig.maxBarSize}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
