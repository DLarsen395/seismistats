import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { ETSEvent } from '../../types/event';

interface MobileInfoPanelProps {
  events: ETSEvent[];
  visibleCount: number;
}

export const MobileInfoPanel: React.FC<MobileInfoPanelProps> = ({
  events,
  visibleCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          bottom: '90px',
          left: '16px',
          zIndex: 150,
          background: 'rgba(30, 30, 40, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span style={{ fontSize: '14px' }}>{isExpanded ? '✕' : 'ℹ️'}</span>
        {isExpanded ? 'Close' : 'Info'}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '140px',
            left: '16px',
            right: '16px',
            zIndex: 140,
            background: 'rgba(30, 30, 40, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          {/* Stats Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Statistics
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '8px',
            }}>
              <StatItem label="Total Events" value={events.length.toLocaleString()} />
              <StatItem label="Visible" value={visibleCount.toLocaleString()} />
              <StatItem 
                label="Mag Range" 
                value={events.length > 0 
                  ? `${Math.min(...events.map(e => e.properties.magnitude)).toFixed(1)} - ${Math.max(...events.map(e => e.properties.magnitude)).toFixed(1)}`
                  : '-'
                } 
              />
              <StatItem 
                label="Avg Depth" 
                value={events.length > 0 
                  ? `${(events.reduce((a, e) => a + e.properties.depth, 0) / events.length).toFixed(1)} km`
                  : '-'
                } 
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ 
            height: '1px', 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            margin: '12px 0',
          }} />

          {/* Legend Section */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px',
            }}>
              Legend
            </div>
            
            {/* Depth Color Legend */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
                Color = Depth (km)
              </div>
              <div style={{
                height: '10px',
                borderRadius: '4px',
                background: 'linear-gradient(to right, #67E8F9 0%, #38BDF8 25%, #818CF8 50%, #A855F7 75%, #7C3AED 100%)',
                marginBottom: '4px',
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '9px',
                color: '#666',
              }}>
                <span>25 (shallow)</span>
                <span>45 (deep)</span>
              </div>
            </div>

            {/* Size Legend */}
            <div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>
                Size = Magnitude
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#818CF8', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>0.4</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#818CF8', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>1.0</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#818CF8', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>1.5+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper component for stat items
const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    padding: '8px',
  }}>
    <div style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{value}</div>
  </div>
);
