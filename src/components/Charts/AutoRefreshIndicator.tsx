/**
 * Auto-refresh indicator component
 * Shows spinning refresh icon during fetch, pulsing earthquake icon when new events found
 */

import { useState, useEffect } from 'react';

interface AutoRefreshIndicatorProps {
  /** Whether auto-refresh is currently in progress */
  isRefreshing: boolean;
  /** Number of new events found (triggers earthquake pulse animation) */
  newEventsFound: number;
  /** Height of parent container for sizing (icon will be 80% of this) */
  containerHeight?: number;
}

/**
 * Refresh icon (circular arrows) - SVG
 */
function RefreshIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block' }}
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

/**
 * Earthquake icon (seismic wave) - SVG
 */
function EarthquakeIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Seismic zigzag line */}
      <path d="M2 12h3l2-7 3 14 3-10 2 6 2-3h5" />
      {/* Optional: Add concentric circles for earthquake epicenter effect */}
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function AutoRefreshIndicator({
  isRefreshing,
  newEventsFound,
  containerHeight = 40,
}: AutoRefreshIndicatorProps) {
  const [showEarthquake, setShowEarthquake] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const [wasRefreshing, setWasRefreshing] = useState(false);

  // Calculate icon size (80% of container height)
  const iconSize = Math.round(containerHeight * 0.8);

  // Track when refresh state changes from true to false (refresh completed)
  useEffect(() => {
    if (wasRefreshing && !isRefreshing && newEventsFound > 0) {
      // Refresh just completed and found new events
      setShowEarthquake(true);
      setPulseCount(0);
    }
    setWasRefreshing(isRefreshing);
  }, [isRefreshing, newEventsFound, wasRefreshing]);

  // Pulse animation counter
  useEffect(() => {
    if (showEarthquake && pulseCount < 3) {
      const timer = setTimeout(() => {
        setPulseCount(prev => prev + 1);
      }, 2000);  // 1s fade in + 1s fade out = 2s per pulse
      return () => clearTimeout(timer);
    } else if (pulseCount >= 3) {
      // Animation complete, hide the earthquake icon
      setShowEarthquake(false);
      setPulseCount(0);
    }
  }, [showEarthquake, pulseCount]);

  // Don't render anything if not refreshing and no new events
  if (!isRefreshing && !showEarthquake) {
    return null;
  }

  // Calculate padding for centering (equal padding on top, right, bottom)
  const padding = Math.round((containerHeight - iconSize) / 2);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${padding}px`,
        marginLeft: '0.5rem',
      }}
    >
      {isRefreshing ? (
        // Spinning refresh icon
        <RefreshIcon
          size={iconSize}
          className="auto-refresh-spin"
        />
      ) : showEarthquake ? (
        // Pulsing earthquake icon
        <EarthquakeIcon
          size={iconSize}
          className="auto-refresh-pulse"
        />
      ) : null}

      {/* CSS animations */}
      <style>{`
        .auto-refresh-spin {
          color: #60a5fa;
          animation: spin 1s linear infinite;
        }

        .auto-refresh-pulse {
          color: #f97316;
          animation: pulse 2s ease-in-out;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
