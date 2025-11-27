import React, { useMemo } from 'react';
import type { ETSEvent } from '../../types/event';
import { useIsMobile } from '../../hooks/useIsMobile';

interface EventStatsProps {
  events: ETSEvent[];
  visibleCount: number;
  isPlaying: boolean;
}

export const EventStats: React.FC<EventStatsProps> = ({ 
  events, 
  visibleCount, 
  isPlaying,
}) => {
  const isMobile = useIsMobile();
  
  const stats = useMemo(() => {
    if (events.length === 0) {
      return {
        total: 0,
        avgMagnitude: 0,
        maxMagnitude: 0,
        minMagnitude: 0,
        avgDepth: 0,
        dateRange: { start: null, end: null },
      };
    }

    const magnitudes = events.map(e => e.properties.magnitude);
    const depths = events.map(e => e.properties.depth);
    const times = events.map(e => new Date(e.properties.time).getTime()).sort((a, b) => a - b);

    return {
      total: events.length,
      avgMagnitude: magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length,
      maxMagnitude: Math.max(...magnitudes),
      minMagnitude: Math.min(...magnitudes),
      avgDepth: depths.reduce((a, b) => a + b, 0) / depths.length,
      dateRange: {
        start: new Date(times[0]),
        end: new Date(times[times.length - 1]),
      },
    };
  }, [events]);

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Hide on mobile - use MobileInfoPanel instead
  if (isMobile) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      right: '16px',
      zIndex: 100,
      background: 'rgba(30, 30, 40, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      minWidth: '160px',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 500,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '10px',
      }}>
        Event Statistics
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Event Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            {isPlaying ? 'Visible' : 'Total'}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
            {isPlaying ? visibleCount.toLocaleString() : stats.total.toLocaleString()}
          </span>
        </div>

        {/* Magnitude Range */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Mag Range</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
            {stats.minMagnitude.toFixed(1)} - {stats.maxMagnitude.toFixed(1)}
          </span>
        </div>

        {/* Average Magnitude */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Avg Mag</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
            {stats.avgMagnitude.toFixed(2)}
          </span>
        </div>

        {/* Average Depth */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Avg Depth</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
            {stats.avgDepth.toFixed(1)} km
          </span>
        </div>

        {/* Divider */}
        <div style={{ 
          height: '1px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          margin: '4px 0',
        }} />

        {/* Date Range */}
        <div>
          <span style={{ fontSize: '10px', color: '#888', display: 'block', marginBottom: '4px' }}>
            Data Range
          </span>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {formatDate(stats.dateRange.start)}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            to {formatDate(stats.dateRange.end)}
          </div>
        </div>
      </div>
    </div>
  );
};
