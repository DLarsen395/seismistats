/**
 * Cache Progress Banner
 * Shows progress when earthquake data is being fetched and cached
 */

import { useState, useEffect, useRef } from 'react';
import { useCacheStore } from '../../stores/cacheStore';
import { useEarthquakeStore } from '../../stores/earthquakeStore';

export function CacheProgressBanner() {
  const { progress } = useCacheStore();
  const { isLoading } = useEarthquakeStore();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track when loading started for the loading-only state
  const loadingStartRef = useRef<number | null>(null);
  
  // Determine if we should show the banner
  const hasProgress = progress.operation !== 'idle';
  const shouldShow = hasProgress || isLoading;
  
  // Update elapsed time every second while processing
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (shouldShow) {
      const startTime = progress.startedAt || loadingStartRef.current || Date.now();
      if (!loadingStartRef.current && isLoading) {
        loadingStartRef.current = Date.now();
      }
      
      // Start a new interval
      intervalRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
      
      // Initial update
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    } else {
      loadingStartRef.current = null;
      setElapsed(0);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [shouldShow, progress.startedAt, isLoading]);
  
  // Don't show if nothing is happening
  if (!shouldShow) {
    return null;
  }
  
  // Calculate percentage
  const percentage = progress.totalSteps > 0
    ? Math.round((progress.currentStep / progress.totalSteps) * 100)
    : 0;
  
  // Determine display message
  const getMessage = () => {
    if (progress.operation !== 'idle' && progress.message) {
      return progress.message;
    }
    if (isLoading) {
      return 'Loading earthquake data...';
    }
    return 'Processing...';
  };
  
  // Determine operation label
  const getOperationLabel = () => {
    if (progress.operation === 'fetching') return 'Fetching';
    if (progress.operation === 'storing') return 'Caching';
    if (progress.operation === 'validating') return 'Preparing';
    if (isLoading) return 'Loading';
    return 'Processing';
  };
  
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '1.25rem',
          height: '1.25rem',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          borderTopColor: '#60a5fa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          flexShrink: 0,
        }}
      />
      
      {/* Progress info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#93c5fd', fontSize: '0.875rem', fontWeight: 500 }}>
            {getOperationLabel()}
          </span>
          {progress.currentDate && (
            <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>
              {progress.currentDate}
            </span>
          )}
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {getMessage()}
          </span>
        </div>
        
        {/* Progress bar */}
        {progress.totalSteps > 0 && (
          <div
            style={{
              marginTop: '0.375rem',
              height: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentage}%`,
                backgroundColor: '#60a5fa',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
        
        {/* Indeterminate progress bar when no steps */}
        {progress.totalSteps === 0 && (
          <div
            style={{
              marginTop: '0.375rem',
              height: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                height: '100%',
                width: '30%',
                backgroundColor: '#60a5fa',
                animation: 'indeterminate 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
        {progress.totalSteps > 0 && (
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {progress.currentStep}/{progress.totalSteps} ({percentage}%)
          </span>
        )}
        {elapsed > 0 && (
          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            {elapsed}s
          </span>
        )}
      </div>
      
      {/* Animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes indeterminate {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
