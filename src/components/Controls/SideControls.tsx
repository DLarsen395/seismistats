import { usePlaybackStore } from '../../stores/playbackStore';
import { getSpeedOptionsForRange } from '../../services/tremor-api';
import { useIsMobile } from '../../hooks/useIsMobile';

export const SideControls: React.FC = () => {
  const { showAllEvents, speed, dataRangePreset, setShowAllEvents, setSpeed } = usePlaybackStore();
  const isMobile = useIsMobile();
  
  // Get speed options based on current data range preset
  const speedOptions = getSpeedOptionsForRange(dataRangePreset);
  
  // Hide on mobile
  if (isMobile) return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: 'rgba(31, 41, 55, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        padding: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minWidth: '140px',
        zIndex: 10,
      }}
    >
      {/* Mode Toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af', 
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Mode
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setShowAllEvents(true)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: showAllEvents ? '#3b82f6' : 'rgba(55, 65, 81, 0.8)',
              color: showAllEvents ? 'white' : '#9ca3af',
            }}
          >
            All
          </button>
          <button
            onClick={() => setShowAllEvents(false)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: !showAllEvents ? '#3b82f6' : 'rgba(55, 65, 81, 0.8)',
              color: !showAllEvents ? 'white' : '#9ca3af',
            }}
          >
            Play
          </button>
        </div>
      </div>

      {/* Speed Controls */}
      <div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af', 
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Speed
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {speedOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSpeed(option.value)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: speed === option.value ? '#3b82f6' : 'rgba(55, 65, 81, 0.8)',
                color: speed === option.value ? 'white' : '#9ca3af',
                textAlign: 'left',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
