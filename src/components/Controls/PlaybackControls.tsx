import React from 'react';
import { usePlaybackStore, type PlaybackSpeed } from '../../stores/playbackStore';

// Days per second options
const SPEED_OPTIONS: { value: PlaybackSpeed; label: string }[] = [
  { value: 1, label: '1 day/s' },
  { value: 7, label: '1 wk/s' },
  { value: 30, label: '1 mo/s' },
  { value: 90, label: '3 mo/s' },
  { value: 180, label: '6 mo/s' },
  { value: 365, label: '1 yr/s' },
];

interface PlaybackControlsProps {
  currentTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  eventCount: number;
  totalEvents: number;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  startTime,
  endTime,
  eventCount,
  totalEvents,
}) => {
  const { 
    isPlaying, 
    speed, 
    showAllEvents,
    fadeOutDuration,
    togglePlay, 
    setSpeed,
    setShowAllEvents,
    setFadeOutDuration,
    reset,
    setCurrentTime
  } = usePlaybackStore();

  const formatDate = (date: Date | null) => {
    if (!date) return '--';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Calculate progress percentage
  const progress = React.useMemo(() => {
    if (!currentTime || !startTime || !endTime) return 0;
    const total = endTime.getTime() - startTime.getTime();
    const current = currentTime.getTime() - startTime.getTime();
    return Math.min(100, Math.max(0, (current / total) * 100));
  }, [currentTime, startTime, endTime]);

  // Calculate estimated playback duration
  const estimatedDuration = React.useMemo(() => {
    if (!startTime || !endTime) return null;
    const totalDays = (endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000);
    const seconds = totalDays / speed;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }, [startTime, endTime, speed]);

  // Calculate data time span
  const timeSpan = React.useMemo(() => {
    if (!startTime || !endTime) return null;
    const days = (endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000);
    if (days < 365) return `${Math.round(days)} days`;
    return `${(days / 365).toFixed(1)} years`;
  }, [startTime, endTime]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startTime || !endTime) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = new Date(startTime.getTime() + percent * (endTime.getTime() - startTime.getTime()));
    setCurrentTime(newTime);
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      padding: '16px 24px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(75, 85, 99, 0.3)',
      minWidth: '500px',
      zIndex: 1000,
    }}>
      {/* Top row: Mode toggle and time display */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowAllEvents(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: showAllEvents ? '#3b82f6' : 'rgba(75, 85, 99, 0.5)',
              color: 'white',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Show All
          </button>
          <button
            onClick={() => setShowAllEvents(false)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: !showAllEvents ? '#3b82f6' : 'rgba(75, 85, 99, 0.5)',
              color: 'white',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Playback
          </button>
        </div>

        {/* Current time display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>
            {formatDate(currentTime)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Event count and duration info */}
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af' }}>
          <div>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{eventCount.toLocaleString()}</span>
            {' / '}
            {totalEvents.toLocaleString()} events
          </div>
          {timeSpan && (
            <div style={{ fontSize: '0.65rem', marginTop: '2px' }}>
              {timeSpan} • ~{estimatedDuration} playback
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div 
        onClick={handleProgressClick}
        style={{
          height: '8px',
          backgroundColor: 'rgba(75, 85, 99, 0.5)',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '12px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          transition: isPlaying ? 'none' : 'width 0.2s',
        }} />
      </div>

      {/* Date range labels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#6b7280',
        marginBottom: '12px',
      }}>
        <span>{formatDate(startTime)}</span>
        <span>{formatDate(endTime)}</span>
      </div>

      {/* Controls row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Playback controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Reset button */}
          <button
            onClick={reset}
            disabled={showAllEvents}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showAllEvents ? 'rgba(75, 85, 99, 0.3)' : 'rgba(75, 85, 99, 0.5)',
              color: showAllEvents ? '#4b5563' : '#fff',
              cursor: showAllEvents ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
            title="Reset"
          >
            ⏮
          </button>

          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            disabled={showAllEvents}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showAllEvents ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
              color: showAllEvents ? '#6b7280' : '#fff',
              cursor: showAllEvents ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        {/* Speed control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Speed:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSpeed(option.value)}
                disabled={showAllEvents}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: speed === option.value && !showAllEvents ? '#3b82f6' : 'rgba(75, 85, 99, 0.5)',
                  color: showAllEvents ? '#6b7280' : '#fff',
                  fontSize: '0.65rem',
                  cursor: showAllEvents ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fade duration control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Fade:</span>
          <select
            value={fadeOutDuration}
            onChange={(e) => setFadeOutDuration(Number(e.target.value))}
            disabled={showAllEvents}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'rgba(75, 85, 99, 0.5)',
              color: showAllEvents ? '#6b7280' : '#fff',
              fontSize: '0.75rem',
              cursor: showAllEvents ? 'not-allowed' : 'pointer',
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>
    </div>
  );
};
