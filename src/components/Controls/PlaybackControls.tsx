import React, { useRef, useCallback, useState, useEffect } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';

interface PlaybackControlsProps {
  currentTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  eventCount: number;
  totalEvents: number;
}

// Date picker modal component
const DatePickerModal: React.FC<{
  isOpen: boolean;
  title: string;
  currentDate: Date | null;
  minDate: Date | null;
  maxDate: Date | null;
  onSave: (date: Date) => void;
  onClose: () => void;
}> = ({ isOpen, title, currentDate, minDate, maxDate, onSave, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && currentDate) {
      // Format as YYYY-MM-DD for the date input
      setInputValue(currentDate.toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen, currentDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    const parsed = new Date(inputValue);
    if (isNaN(parsed.getTime())) {
      setError('Invalid date format');
      return;
    }
    
    if (minDate && parsed < minDate) {
      setError(`Date must be after ${minDate.toLocaleDateString()}`);
      return;
    }
    
    if (maxDate && parsed > maxDate) {
      setError(`Date must be before ${maxDate.toLocaleDateString()}`);
      return;
    }
    
    onSave(parsed);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'rgba(31, 41, 55, 0.98)',
          borderRadius: '12px',
          padding: '20px',
          minWidth: '280px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(75, 85, 99, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '16px', fontSize: '1rem' }}>
          {title}
        </h3>
        
        <input
          type="date"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(55, 65, 81, 0.8)',
            border: error ? '1px solid #ef4444' : '1px solid rgba(75, 85, 99, 0.5)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
          }}
        />
        
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '8px' }}>
            {error}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(75, 85, 99, 0.5)',
              border: 'none',
              borderRadius: '6px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentTime,
  startTime,
  endTime,
  rangeStart,
  rangeEnd,
  eventCount,
  totalEvents,
}) => {
  const { 
    isPlaying, 
    speed,
    showAllEvents,
    togglePlay, 
    reset,
    setCurrentTime,
    setRangeStart,
    setRangeEnd,
  } = usePlaybackStore();

  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState<'start' | 'end' | null>(null);

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

  // Calculate position as percentage
  const getPositionPercent = useCallback((date: Date | null): number => {
    if (!date || !startTime || !endTime) return 0;
    const total = endTime.getTime() - startTime.getTime();
    const current = date.getTime() - startTime.getTime();
    return Math.min(100, Math.max(0, (current / total) * 100));
  }, [startTime, endTime]);

  // Convert percent to date
  const percentToDate = useCallback((percent: number): Date | null => {
    if (!startTime || !endTime) return null;
    const total = endTime.getTime() - startTime.getTime();
    return new Date(startTime.getTime() + (percent / 100) * total);
  }, [startTime, endTime]);

  // Progress percentage for current playback position
  const progress = getPositionPercent(currentTime);
  
  // Range bracket positions
  const leftBracketPercent = getPositionPercent(rangeStart || startTime);
  const rightBracketPercent = getPositionPercent(rangeEnd || endTime);

  // Calculate estimated playback duration for current range
  const estimatedDuration = React.useMemo(() => {
    const effectiveStart = rangeStart || startTime;
    const effectiveEnd = rangeEnd || endTime;
    if (!effectiveStart || !effectiveEnd) return null;
    const totalDays = (effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000);
    const seconds = totalDays / speed;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }, [rangeStart, rangeEnd, startTime, endTime, speed]);

  // Mobile detection with orientation change support
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', () => {
      // Delay check for orientation change to get accurate dimensions
      setTimeout(checkMobile, 100);
    });
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((type: 'left' | 'right' | 'progress') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!progressBarRef.current) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = Math.min(100, Math.max(0, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      
      if (!startTime || !endTime) return;
      const total = endTime.getTime() - startTime.getTime();
      const newDate = new Date(startTime.getTime() + (percent / 100) * total);

      if (type === 'left') {
        const rightPercent = getPositionPercent(rangeEnd || endTime);
        if (percent < rightPercent - 1) {
          setRangeStart(newDate);
        }
      } else if (type === 'right') {
        const leftPercent = getPositionPercent(rangeStart || startTime);
        if (percent > leftPercent + 1) {
          setRangeEnd(newDate);
        }
      } else if (type === 'progress') {
        const leftPercent = getPositionPercent(rangeStart || startTime);
        const rightPercent = getPositionPercent(rangeEnd || endTime);
        if (percent >= leftPercent && percent <= rightPercent) {
          setCurrentTime(newDate);
        }
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [startTime, endTime, rangeStart, rangeEnd, getPositionPercent, setRangeStart, setRangeEnd, setCurrentTime]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!startTime || !endTime) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Only set time within range
    if (percent >= leftBracketPercent && percent <= rightBracketPercent) {
      const newDate = percentToDate(percent);
      if (newDate) setCurrentTime(newDate);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: isMobile ? '35px' : '20px',  // Higher on mobile to avoid Mapbox logo
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: isMobile ? '12px' : '16px',
      padding: isMobile ? '8px 12px' : '12px 20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(75, 85, 99, 0.3)',
      minWidth: isMobile ? 'calc(100% - 20px)' : '600px',
      maxWidth: isMobile ? 'calc(100% - 20px)' : '800px',
      width: isMobile ? 'calc(100% - 20px)' : 'auto',
      zIndex: 1000,
      boxSizing: 'border-box',
    }}>
      {/* Top row: Date display and event info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: isMobile ? '6px' : '8px'
      }}>
        {/* Current time display */}
        <div>
          <div style={{ fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: 'bold', color: '#fff' }}>
            {formatDate(currentTime)}
            {!isMobile && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '8px' }}>
                {formatTime(currentTime)}
              </span>
            )}
          </div>
        </div>

        {/* Event count and duration info */}
        <div style={{ textAlign: 'right', fontSize: isMobile ? '0.65rem' : '0.75rem', color: '#9ca3af' }}>
          <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{eventCount.toLocaleString()}</span>
          {' / '}
          {totalEvents.toLocaleString()}
          {!isMobile && ' events'}
          {estimatedDuration && !isMobile && (
            <span style={{ marginLeft: '8px' }}>• ~{estimatedDuration}</span>
          )}
        </div>
      </div>

      {/* Main row: Buttons on left, scrub bar on right */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: isMobile ? '8px' : '12px'
      }}>
        {/* Playback controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px', flexShrink: 0 }}>
          {/* Reset button */}
          <button
            onClick={reset}
            disabled={showAllEvents}
            style={{
              width: isMobile ? '28px' : '32px',
              height: isMobile ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showAllEvents ? 'rgba(75, 85, 99, 0.3)' : 'rgba(75, 85, 99, 0.5)',
              color: showAllEvents ? '#4b5563' : '#fff',
              cursor: showAllEvents ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              transition: 'all 0.2s',
            }}
            title="Reset to start"
          >
            ⏮
          </button>

          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            disabled={showAllEvents}
            style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: showAllEvents ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
              color: showAllEvents ? '#6b7280' : '#fff',
              cursor: showAllEvents ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '0.875rem' : '1rem',
              transition: 'all 0.2s',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        {/* Scrub bar section */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Progress bar with bracket sliders */}
          <div 
            ref={progressBarRef}
            onClick={handleProgressClick}
            style={{
              position: 'relative',
              height: '20px',
              backgroundColor: 'rgba(75, 85, 99, 0.3)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
        {/* Inactive area (left of range) */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${leftBracketPercent}%`,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '4px 0 0 4px',
        }} />

        {/* Inactive area (right of range) */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${100 - rightBracketPercent}%`,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '0 4px 4px 0',
        }} />

        {/* Active range background */}
        <div style={{
          position: 'absolute',
          left: `${leftBracketPercent}%`,
          right: `${100 - rightBracketPercent}%`,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
        }} />

        {/* Progress fill */}
        <div style={{
          position: 'absolute',
          left: `${leftBracketPercent}%`,
          top: 0,
          bottom: 0,
          width: `${Math.max(0, progress - leftBracketPercent)}%`,
          backgroundColor: '#3b82f6',
          borderRadius: '0',
          transition: isPlaying ? 'none' : 'width 0.1s',
        }} />

        {/* Left bracket [ */}
        <div
          onMouseDown={handleMouseDown('left')}
          style={{
            position: 'absolute',
            left: `${leftBracketPercent}%`,
            top: '-2px',
            bottom: '-2px',
            transform: 'translateX(-50%)',
            cursor: 'ew-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
          }}
        >
          <div style={{
            width: '3px',
            height: '24px',
            backgroundColor: '#10b981',
            borderRadius: '2px 0 0 2px',
            boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
          }} />
          <div style={{
            width: '6px',
            height: '3px',
            backgroundColor: '#10b981',
            position: 'absolute',
            left: '4px',
            top: '0px',
          }} />
          <div style={{
            width: '6px',
            height: '3px',
            backgroundColor: '#10b981',
            position: 'absolute',
            left: '4px',
            bottom: '0px',
          }} />
        </div>

        {/* Right bracket ] */}
        <div
          onMouseDown={handleMouseDown('right')}
          style={{
            position: 'absolute',
            left: `${rightBracketPercent}%`,
            top: '-2px',
            bottom: '-2px',
            transform: 'translateX(-50%)',
            cursor: 'ew-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
          }}
        >
          <div style={{
            width: '3px',
            height: '24px',
            backgroundColor: '#10b981',
            borderRadius: '0 2px 2px 0',
            boxShadow: '0 0 4px rgba(16, 185, 129, 0.5)',
          }} />
          <div style={{
            width: '6px',
            height: '3px',
            backgroundColor: '#10b981',
            position: 'absolute',
            right: '4px',
            top: '0px',
          }} />
          <div style={{
            width: '6px',
            height: '3px',
            backgroundColor: '#10b981',
            position: 'absolute',
            right: '4px',
            bottom: '0px',
          }} />
        </div>

        {/* Progress handle */}
        <div
          onMouseDown={handleMouseDown('progress')}
          style={{
            position: 'absolute',
            left: `${progress}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            border: '2px solid #3b82f6',
            cursor: 'grab',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        />
          </div>

          {/* Date range labels - clickable */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '0.65rem',
            color: '#6b7280',
            marginTop: '4px',
          }}>
            <span 
              onClick={() => setDatePickerOpen('start')}
              style={{ 
                cursor: 'pointer', 
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="Click to set start date"
            >
              {formatDate(rangeStart || startTime)}
            </span>
            <span style={{ color: '#9ca3af' }}>
              {formatDate(startTime)} → {formatDate(endTime)}
            </span>
            <span 
              onClick={() => setDatePickerOpen('end')}
              style={{ 
                cursor: 'pointer', 
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.color = '#3b82f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="Click to set end date"
            >
              {formatDate(rangeEnd || endTime)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Date picker modal for start date */}
      <DatePickerModal
        isOpen={datePickerOpen === 'start'}
        title="Set Range Start Date"
        currentDate={rangeStart || startTime}
        minDate={startTime}
        maxDate={rangeEnd || endTime}
        onSave={(date) => setRangeStart(date)}
        onClose={() => setDatePickerOpen(null)}
      />
      
      {/* Date picker modal for end date */}
      <DatePickerModal
        isOpen={datePickerOpen === 'end'}
        title="Set Range End Date"
        currentDate={rangeEnd || endTime}
        minDate={rangeStart || startTime}
        maxDate={endTime}
        onSave={(date) => setRangeEnd(date)}
        onClose={() => setDatePickerOpen(null)}
      />
    </div>
  );
};
