import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// Size stops (visual representation) - colors now represent mid-range depth
const sizeStops = [
  { magnitude: 0.4, size: 6, label: '0.4' },
  { magnitude: 1.0, size: 10, label: '1.0' },
  { magnitude: 1.5, size: 16, label: '1.5+' },
];

export const Legend: React.FC = () => {
  const isMobile = useIsMobile();
  
  // Hide on mobile - use MobileInfoPanel instead
  if (isMobile) return null;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '100px',
      left: '16px',
      zIndex: 100,
      background: 'rgba(30, 30, 40, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      minWidth: '140px',
    }}>
      {/* Depth Color Legend */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
        }}>
          Depth (km)
        </div>
        
        {/* Gradient bar - shallow (cyan) to deep (purple) */}
        <div style={{
          height: '12px',
          borderRadius: '4px',
          background: 'linear-gradient(to right, #67E8F9 0%, #38BDF8 25%, #818CF8 50%, #A855F7 75%, #7C3AED 100%)',
          marginBottom: '4px',
        }} />
        
        {/* Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#9ca3af',
        }}>
          <span>25</span>
          <span>30</span>
          <span>35</span>
          <span>40</span>
          <span>45</span>
        </div>
        
        {/* Shallow/Deep indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8px',
          color: '#666',
          marginTop: '2px',
        }}>
          <span>Shallow</span>
          <span>Deep</span>
        </div>
      </div>

      {/* Size Legend */}
      <div>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
        }}>
          Size = Magnitude
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          {sizeStops.map(({ magnitude, size, label }) => (
            <div key={magnitude} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}>
              <div style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                backgroundColor: '#818CF8',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }} />
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
