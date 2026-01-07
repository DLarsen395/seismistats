/**
 * Database Seeding Panel
 *
 * Admin UI for controlling database seeding with:
 * - Date range selection (recent, years, decades, historical)
 * - Speed/bandwidth presets
 * - Progress tracking
 * - Coverage visualization
 * - Verification against USGS
 * - Gap detection and filling
 * - Error logging
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDatabaseCoverage,
  fetchSeedingProgress,
  startSeeding,
  cancelSeeding,
  verifyCoverage,
  type DatabaseCoverage,
  type SeedingProgress,
  type SeedingOptions,
  type VerificationResult,
} from '../../services/api';

// =============================================================================
// Speed Presets
// =============================================================================

interface SpeedPreset {
  name: string;
  description: string;
  delayMs: number;
  chunkDays: number;
}

const SPEED_PRESETS: SpeedPreset[] = [
  {
    name: 'Slow',
    description: 'Limited bandwidth (5s delay, 15-day chunks)',
    delayMs: 5000,
    chunkDays: 15,
  },
  {
    name: 'Medium',
    description: 'Balanced (2s delay, 30-day chunks)',
    delayMs: 2000,
    chunkDays: 30,
  },
  {
    name: 'Fast',
    description: 'Good connection (1s delay, 45-day chunks)',
    delayMs: 1000,
    chunkDays: 45,
  },
  {
    name: 'Turbo',
    description: 'Fast connection (0.5s delay, 60-day chunks)',
    delayMs: 500,
    chunkDays: 60,
  },
];

// =============================================================================
// Date Range Presets - Organized by category
// =============================================================================

interface DateRangePreset {
  name: string;
  category: 'recent' | 'years' | 'decades' | 'historical';
  getRange: () => { startDate: string; endDate: string };
}

const DATE_PRESETS: DateRangePreset[] = [
  // Recent periods
  {
    name: 'Last Month',
    category: 'recent',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    name: '3 Months',
    category: 'recent',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    name: '6 Months',
    category: 'recent',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  // Year-based
  {
    name: '1 Year',
    category: 'years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    name: '2 Years',
    category: 'years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 2);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    name: '5 Years',
    category: 'years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 5);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  {
    name: '10 Years',
    category: 'years',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(start.getFullYear() - 10);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    },
  },
  // Decades (calendar decades)
  {
    name: '2020s',
    category: 'decades',
    getRange: () => ({
      startDate: '2020-01-01',
      endDate: new Date().toISOString().split('T')[0], // Up to now
    }),
  },
  {
    name: '2010s',
    category: 'decades',
    getRange: () => ({
      startDate: '2010-01-01',
      endDate: '2019-12-31',
    }),
  },
  {
    name: '2000s',
    category: 'decades',
    getRange: () => ({
      startDate: '2000-01-01',
      endDate: '2009-12-31',
    }),
  },
  {
    name: '1990s',
    category: 'decades',
    getRange: () => ({
      startDate: '1990-01-01',
      endDate: '1999-12-31',
    }),
  },
  {
    name: '1980s',
    category: 'decades',
    getRange: () => ({
      startDate: '1980-01-01',
      endDate: '1989-12-31',
    }),
  },
  {
    name: '1970s',
    category: 'decades',
    getRange: () => ({
      startDate: '1970-01-01',
      endDate: '1979-12-31',
    }),
  },
  // Historical (older data - less events, larger chunks OK)
  {
    name: '1950-1969',
    category: 'historical',
    getRange: () => ({
      startDate: '1950-01-01',
      endDate: '1969-12-31',
    }),
  },
  {
    name: '1900-1949',
    category: 'historical',
    getRange: () => ({
      startDate: '1900-01-01',
      endDate: '1949-12-31',
    }),
  },
  {
    name: 'Pre-1900',
    category: 'historical',
    getRange: () => ({
      startDate: '1500-01-01',
      endDate: '1899-12-31',
    }),
  },
];

// =============================================================================
// Error Log Entry
// =============================================================================

interface ErrorLogEntry {
  id: number;
  timestamp: Date;
  message: string;
  details?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DatabaseSeedingPanel() {
  // Coverage and progress state
  const [coverage, setCoverage] = useState<DatabaseCoverage | null>(null);
  const [progress, setProgress] = useState<SeedingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const errorIdCounter = useRef(0);

  // Verification state
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDateCategories, setShowDateCategories] = useState<Record<string, boolean>>({
    recent: true,
    years: false,
    decades: false,
    historical: false,
  });

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minMagnitude, setMinMagnitude] = useState(2.5);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedPreset>(SPEED_PRESETS[1]); // Medium
  const [isStarting, setIsStarting] = useState(false);

  // Add error to log
  const addError = useCallback((message: string, details?: string) => {
    const entry: ErrorLogEntry = {
      id: ++errorIdCounter.current,
      timestamp: new Date(),
      message,
      details,
    };
    setErrorLog((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50 errors
    setShowErrorLog(true);
  }, []);

  // Clear error log
  const clearErrorLog = () => {
    setErrorLog([]);
    setShowErrorLog(false);
  };

  // Fetch coverage and progress
  const fetchData = useCallback(async () => {
    try {
      const [coverageRes, progressRes] = await Promise.all([
        fetchDatabaseCoverage(),
        fetchSeedingProgress(),
      ]);

      if (coverageRes.success && coverageRes.data) {
        setCoverage(coverageRes.data);
      }
      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data);
        // Check for seeding errors from the server
        if (progressRes.data.error) {
          addError('Seeding error from server', progressRes.data.error);
        }
      }
    } catch (err) {
      // Don't spam errors for network issues during polling
      console.error('Failed to fetch seeding data:', err);
    } finally {
      setLoading(false);
    }
  }, [addError]);

  // Continuous polling - always poll every 3 seconds
  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle date preset selection
  const handleDatePreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setVerification(null); // Clear previous verification
  };

  // Toggle date category visibility
  const toggleCategory = (category: string) => {
    setShowDateCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Verify coverage against USGS
  const handleVerify = async () => {
    if (!startDate || !endDate) {
      addError('Validation Error', 'Please select a date range to verify');
      return;
    }

    setIsVerifying(true);
    setVerification(null);

    try {
      const result = await verifyCoverage({
        startDate,
        endDate,
        minMagnitude,
      });

      if (result.data) {
        setVerification(result.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify coverage';
      addError('Verification Failed', message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Start seeding
  const handleStartSeeding = async () => {
    if (!startDate || !endDate) {
      addError('Validation Error', 'Please select a date range before starting');
      return;
    }

    setIsStarting(true);

    try {
      const options: SeedingOptions = {
        startDate,
        endDate,
        minMagnitude,
        chunkDays: selectedSpeed.chunkDays,
        delayMs: selectedSpeed.delayMs,
      };

      console.log('Starting seeding with options:', options);
      const result = await startSeeding(options);
      console.log('Seeding start result:', result);

      // Force immediate refresh to get progress
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start seeding';
      addError('Failed to Start Seeding', message);
    } finally {
      setIsStarting(false);
    }
  };

  // Sync to Present - fetch from newest event to now
  const handleSyncToPresent = async () => {
    if (!coverage?.newestEvent) {
      addError('No Data to Sync From', 'Database is empty. Use regular seeding to populate initial data.');
      return;
    }

    // Start from the day after the newest event
    const newestDate = new Date(coverage.newestEvent);
    newestDate.setDate(newestDate.getDate() + 1);
    const syncStartDate = newestDate.toISOString().split('T')[0];
    const syncEndDate = new Date().toISOString().split('T')[0];

    // Check if we're already up to date
    if (syncStartDate >= syncEndDate) {
      addError('Already Up to Date', 'Database already contains data up to the current date.');
      return;
    }

    setIsStarting(true);

    try {
      const options: SeedingOptions = {
        startDate: syncStartDate,
        endDate: syncEndDate,
        minMagnitude,
        chunkDays: selectedSpeed.chunkDays,
        delayMs: selectedSpeed.delayMs,
      };

      console.log('Syncing to present with options:', options);
      const result = await startSeeding(options);
      console.log('Sync start result:', result);

      // Force immediate refresh to get progress
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start sync';
      addError('Failed to Sync', message);
    } finally {
      setIsStarting(false);
    }
  };

  // Cancel seeding
  const handleCancelSeeding = async () => {
    try {
      await cancelSeeding();
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel seeding';
      addError('Failed to Cancel', message);
    }
  };

  // Calculate progress percentage
  const progressPercent = progress && progress.totalChunks > 0
    ? Math.round((progress.completedChunks / progress.totalChunks) * 100)
    : 0;

  // Estimate time remaining
  const estimateTimeRemaining = () => {
    if (!progress || !progress.isSeeding || !progress.startTime || progress.completedChunks === 0) {
      return null;
    }

    const elapsed = Date.now() - new Date(progress.startTime).getTime();
    const avgTimePerChunk = elapsed / progress.completedChunks;
    const remainingChunks = progress.totalChunks - progress.completedChunks;
    const remainingMs = avgTimePerChunk * remainingChunks;

    const minutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `~${hours}h ${minutes % 60}m remaining`;
    }
    if (minutes > 0) {
      return `~${minutes}m remaining`;
    }
    return '< 1 minute remaining';
  };

  // Determine current status
  const getStatus = () => {
    if (loading) return { text: 'Loading...', color: 'text-slate-400', bg: 'bg-slate-500' };
    if (isStarting) return { text: 'Starting...', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    if (progress?.isSeeding) return { text: 'Seeding Active', color: 'text-green-400', bg: 'bg-green-500' };
    if (progress?.cancelled) return { text: 'Cancelled', color: 'text-orange-400', bg: 'bg-orange-500' };
    return { text: 'Idle', color: 'text-slate-400', bg: 'bg-slate-500' };
  };

  const status = getStatus();

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 space-y-6">
      {/* Header with Status */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🗄️</span>
            Database Seeding
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Populate the database with historical earthquake data from USGS
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg border border-slate-700">
          <span className={`w-2 h-2 rounded-full ${status.bg} ${progress?.isSeeding ? 'animate-pulse' : ''}`}></span>
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>
      </div>

      {/* Error Log Panel */}
      {errorLog.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowErrorLog(!showErrorLog)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-red-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-red-300 text-sm font-medium">
                {errorLog.length} Error{errorLog.length !== 1 ? 's' : ''} Logged
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const allErrors = errorLog
                    .map((entry) =>
                      `[${entry.timestamp.toLocaleTimeString()}] ${entry.message}${entry.details ? `\n${entry.details}` : ''}`
                    )
                    .join('\n\n---\n\n');
                  navigator.clipboard.writeText(allErrors);
                }}
                className="text-xs px-2 py-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded"
                title="Copy all errors"
              >
                📋 Copy All
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); clearErrorLog(); }}
                className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded"
              >
                Clear
              </button>
              <span className="text-slate-500 text-sm">{showErrorLog ? '▼' : '▶'}</span>
            </div>
          </button>

          {showErrorLog && (
            <div className="border-t border-red-500/20 max-h-48 overflow-y-auto">
              {errorLog.map((entry) => (
                <div key={entry.id} className="p-3 border-b border-red-500/10 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-red-300 text-sm font-medium">{entry.message}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const text = entry.details
                            ? `${entry.message}\n\n${entry.details}`
                            : entry.message;
                          navigator.clipboard.writeText(text);
                        }}
                        className="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 rounded hover:bg-slate-700/50"
                        title="Copy error details"
                      >
                        📋
                      </button>
                      <span className="text-slate-500 text-xs whitespace-nowrap">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {entry.details && (
                    <pre className="text-red-400/70 text-xs mt-1 whitespace-pre-wrap font-mono bg-red-500/5 p-2 rounded">
                      {entry.details}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Coverage */}
      {coverage && (
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Current Database Coverage</h3>
            {coverage.newestEvent && (() => {
              const newestDate = new Date(coverage.newestEvent);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              newestDate.setHours(0, 0, 0, 0);
              const daysBehind = Math.floor((today.getTime() - newestDate.getTime()) / (1000 * 60 * 60 * 24));

              if (daysBehind > 0) {
                return (
                  <button
                    onClick={handleSyncToPresent}
                    disabled={isStarting || progress?.isSeeding}
                    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                    title={`Sync ${daysBehind} day${daysBehind !== 1 ? 's' : ''} of data`}
                  >
                    <span>🔄</span>
                    Sync to Present ({daysBehind}d behind)
                  </button>
                );
              }
              return (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span>✓</span> Up to date
                </span>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Total Events:</span>
              <span className="text-white ml-2 font-mono">{coverage.totalEvents.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Date Range:</span>
              <span className="text-white ml-2 font-mono text-xs">
                {coverage.oldestEvent
                  ? `${new Date(coverage.oldestEvent).toLocaleDateString()} → ${new Date(coverage.newestEvent!).toLocaleDateString()}`
                  : 'No data'}
              </span>
            </div>
          </div>

          {/* Magnitude breakdown */}
          {coverage.countsByMagnitude && coverage.countsByMagnitude.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <span className="text-slate-500 text-xs">By Magnitude:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {coverage.countsByMagnitude
                  .filter((m) => m.count > 0)
                  .map((m) => (
                    <span key={m.range} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                      {m.range}: {m.count.toLocaleString()}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seeding Progress (when active or starting) */}
      {(progress?.isSeeding || isStarting) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-300 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              {isStarting ? 'Starting seeding...' : 'Seeding in Progress'}
            </h3>
            {progress?.isSeeding && (
              <button
                onClick={handleCancelSeeding}
                className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded"
              >
                Cancel
              </button>
            )}
          </div>

          {progress?.isSeeding && (
            <>
              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Chunk {progress.completedChunks} of {progress.totalChunks} ({progressPercent}%)
                </span>
                <span>{progress.totalEventsFetched.toLocaleString()} events fetched</span>
              </div>

              {progress.currentChunk && (
                <div className="text-xs text-slate-500 mt-1">
                  Current: {progress.currentChunk.startDate} → {progress.currentChunk.endDate}
                </div>
              )}

              {estimateTimeRemaining() && (
                <div className="text-xs text-blue-400 mt-1">{estimateTimeRemaining()}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Seeding Form (when not active) */}
      {!progress?.isSeeding && !isStarting && (
        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>

            {/* Category tabs */}
            <div className="flex gap-1 mb-3 border-b border-slate-700 pb-2">
              {[
                { key: 'recent', label: 'Recent' },
                { key: 'years', label: 'Years' },
                { key: 'decades', label: 'Decades' },
                { key: 'historical', label: 'Historical' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`text-xs px-3 py-1 rounded-t transition-colors ${
                    showDateCategories[key]
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Preset buttons by category */}
            <div className="flex flex-wrap gap-2 mb-3">
              {DATE_PRESETS.filter((preset) => showDateCategories[preset.category]).map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleDatePreset(preset)}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  {preset.name}
                </button>
              ))}
              {Object.values(showDateCategories).every((v) => !v) && (
                <span className="text-xs text-slate-500 italic">Select a category above</span>
              )}
            </div>

            {/* Custom date inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Minimum Magnitude */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Minimum Magnitude: <span className="text-blue-400">M{minMagnitude}</span>
            </label>
            <input
              type="range"
              min="-2"
              max="6"
              step="0.5"
              value={minMagnitude}
              onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>M-2 (micro)</span>
              <span>M2.5 (default)</span>
              <span>M6 (major)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lower magnitudes = more events = longer seeding time
            </p>
          </div>

          {/* Speed Preset */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Connection Speed
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSelectedSpeed(preset)}
                  className={`p-3 rounded border text-left transition-colors ${
                    selectedSpeed.name === preset.name
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Panel */}
          {verification && (
            <div
              className={`rounded-lg p-4 border ${
                verification.status === 'complete'
                  ? 'bg-green-500/10 border-green-500/30'
                  : verification.status === 'missing'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : verification.status === 'extra'
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  {verification.status === 'complete' && <span className="text-green-400">✅ Coverage Complete</span>}
                  {verification.status === 'missing' && <span className="text-yellow-400">⚠️ Missing Events</span>}
                  {verification.status === 'extra' && <span className="text-blue-400">ℹ️ Extra Events</span>}
                  {verification.status === 'error' && <span className="text-red-400">❌ Verification Error</span>}
                </h4>
                <span className="text-xs text-slate-400">{verification.percentCoverage}% coverage</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Database:</span>
                  <span className="text-white ml-2 font-mono">{verification.dbCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">USGS:</span>
                  <span className="text-white ml-2 font-mono">{verification.usgsCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Difference:</span>
                  <span
                    className={`ml-2 font-mono ${
                      verification.difference > 0
                        ? 'text-blue-400'
                        : verification.difference < 0
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
                    {verification.difference > 0 ? '+' : ''}
                    {verification.difference.toLocaleString()}
                  </span>
                </div>
              </div>
              {verification.error && (
                <p className="text-xs text-red-400 mt-2">{verification.error}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={isVerifying || !startDate || !endDate}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Verifying...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Verify
                </>
              )}
            </button>
            <button
              onClick={handleStartSeeding}
              disabled={isStarting || !startDate || !endDate}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              {verification?.status === 'missing' ? 'Fill Missing Data' : 'Start Seeding'}
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Use <strong>Verify</strong> to compare your database against USGS before seeding.
            Seeding fetches data in chunks with delays to avoid overloading USGS servers.
          </p>
        </div>
      )}
    </div>
  );
}
