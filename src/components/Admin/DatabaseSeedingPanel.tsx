/**
 * Database Seeding Panel
 *
 * Admin UI for controlling database seeding with:
 * - Date range selection
 * - Speed/bandwidth presets
 * - Progress tracking
 * - Coverage visualization
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDatabaseCoverage,
  fetchSeedingProgress,
  startSeeding,
  cancelSeeding,
  type DatabaseCoverage,
  type SeedingProgress,
  type SeedingOptions,
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
    description: 'Best for limited bandwidth (5s delay, 15-day chunks)',
    delayMs: 5000,
    chunkDays: 15,
  },
  {
    name: 'Medium',
    description: 'Balanced speed and bandwidth (2s delay, 30-day chunks)',
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
    description: 'Excellent connection (500ms delay, 60-day chunks)',
    delayMs: 500,
    chunkDays: 60,
  },
];

// =============================================================================
// Date Range Presets
// =============================================================================

interface DateRangePreset {
  name: string;
  getRange: () => { startDate: string; endDate: string };
}

const DATE_PRESETS: DateRangePreset[] = [
  {
    name: 'Last Month',
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
    name: 'Last 3 Months',
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
    name: 'Last 6 Months',
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
  {
    name: 'Last Year',
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
    name: 'Last 2 Years',
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
    name: 'Last 5 Years',
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
];

// =============================================================================
// Component
// =============================================================================

export function DatabaseSeedingPanel() {
  // Coverage and progress state
  const [coverage, setCoverage] = useState<DatabaseCoverage | null>(null);
  const [progress, setProgress] = useState<SeedingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minMagnitude, setMinMagnitude] = useState(2.5);
  const [selectedSpeed, setSelectedSpeed] = useState<SpeedPreset>(SPEED_PRESETS[1]); // Medium
  const [isStarting, setIsStarting] = useState(false);

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
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling during seeding
  useEffect(() => {
    fetchData();

    // Poll every 2 seconds during seeding
    const interval = setInterval(() => {
      if (progress?.isSeeding) {
        fetchData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchData, progress?.isSeeding]);

  // Handle date preset selection
  const handleDatePreset = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  // Start seeding
  const handleStartSeeding = async () => {
    if (!startDate || !endDate) {
      setError('Please select a date range');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const options: SeedingOptions = {
        startDate,
        endDate,
        minMagnitude,
        chunkDays: selectedSpeed.chunkDays,
        delayMs: selectedSpeed.delayMs,
      };

      await startSeeding(options);
      await fetchData(); // Refresh to get progress
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start seeding');
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
      setError(err instanceof Error ? err.message : 'Failed to cancel seeding');
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
    return `~${minutes}m remaining`;
  };

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-2xl">🗄️</span>
          Database Seeding
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Populate the database with historical earthquake data from USGS
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Current Coverage */}
      {coverage && (
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Current Database Coverage</h3>
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

      {/* Seeding Progress (when active) */}
      {progress?.isSeeding && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-300">Seeding in Progress...</h3>
            <button
              onClick={handleCancelSeeding}
              className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded"
            >
              Cancel
            </button>
          </div>

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
        </div>
      )}

      {/* Seeding Form (when not active) */}
      {!progress?.isSeeding && (
        <div className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleDatePreset(preset)}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  {preset.name}
                </button>
              ))}
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

          {/* Start Button */}
          <button
            onClick={handleStartSeeding}
            disabled={isStarting || !startDate || !endDate}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <span className="animate-spin">⏳</span>
                Starting...
              </>
            ) : (
              <>
                <span>🚀</span>
                Start Seeding
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Seeding fetches data in chunks with delays to avoid overloading USGS servers.
            You can cancel at any time - progress is saved.
          </p>
        </div>
      )}
    </div>
  );
}
