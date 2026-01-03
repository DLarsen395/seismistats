/**
 * Zustand store for earthquake cache state and progress
 */

import { create } from 'zustand';
import type { CacheProgress, CacheInfo } from '../services/earthquake-cache';
import {
  getCacheInfo,
  getCacheStats,
  clearCache,
  clearStaleData,
  resetDatabase,
  checkCacheIntegrity,
} from '../services/earthquake-cache';

interface CacheStats {
  totalEvents: number;
  historicalEvents: number;
  recentEvents: number;
  totalDays: number;
  staleDays: number;
  sizeEstimateKB: number;
}

interface CacheIntegrity {
  isHealthy: boolean;
  issues: string[];
  recommendation: string | null;
}

// Auto-refresh interval options in minutes
export type AutoRefreshInterval = 1 | 5 | 15 | 30 | 60;

export const AUTO_REFRESH_INTERVALS: { value: AutoRefreshInterval; label: string }[] = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

interface AutoRefreshState {
  enabled: boolean;
  interval: AutoRefreshInterval;
  lastAutoRefresh: number | null;  // Timestamp of last auto-refresh
  isRefreshing: boolean;           // Currently doing auto-refresh
  newEventsFound: number;          // Count of new events from last refresh (for indicator)
}

// Local storage key for persisting auto-refresh settings
const AUTO_REFRESH_STORAGE_KEY = 'ets-events-auto-refresh';

// Load saved auto-refresh settings from localStorage
function loadAutoRefreshSettings(): Partial<AutoRefreshState> {
  try {
    const saved = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: parsed.enabled ?? true,
        interval: parsed.interval ?? 5,
        lastAutoRefresh: parsed.lastAutoRefresh ?? null,
      };
    }
  } catch (e) {
    console.warn('Failed to load auto-refresh settings:', e);
  }
  return {};
}

// Save auto-refresh settings to localStorage
function saveAutoRefreshSettings(state: Partial<AutoRefreshState>) {
  try {
    const current = loadAutoRefreshSettings();
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, JSON.stringify({
      ...current,
      ...state,
    }));
  } catch (e) {
    console.warn('Failed to save auto-refresh settings:', e);
  }
}

interface CacheStore {
  // Cache state
  isEnabled: boolean;
  info: CacheInfo | null;
  stats: CacheStats | null;
  integrity: CacheIntegrity | null;

  // Progress tracking
  progress: CacheProgress;

  // Auto-refresh state
  autoRefresh: AutoRefreshState;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setProgress: (progress: CacheProgress) => void;
  refreshInfo: () => Promise<void>;
  refreshStats: () => Promise<void>;
  checkIntegrity: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  clearStale: () => Promise<number>;
  resetDB: () => Promise<void>;

  // Auto-refresh actions
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setAutoRefreshInterval: (interval: AutoRefreshInterval) => void;
  setAutoRefreshState: (state: Partial<AutoRefreshState>) => void;
  updateLastAutoRefresh: () => void;
}

const initialProgress: CacheProgress = {
  operation: 'idle',
  currentStep: 0,
  totalSteps: 0,
  message: '',
  startedAt: null,
};

const savedAutoRefresh = loadAutoRefreshSettings();

const initialAutoRefresh: AutoRefreshState = {
  enabled: savedAutoRefresh.enabled ?? true,
  interval: savedAutoRefresh.interval ?? 5,
  lastAutoRefresh: savedAutoRefresh.lastAutoRefresh ?? null,
  isRefreshing: false,
  newEventsFound: 0,
};

export const useCacheStore = create<CacheStore>((set, get) => ({
  // Initial state
  isEnabled: true,
  info: null,
  stats: null,
  integrity: null,
  progress: initialProgress,
  autoRefresh: initialAutoRefresh,

  // Actions
  setEnabled: (enabled) => set({ isEnabled: enabled }),

  setProgress: (progress) => set({ progress }),

  // Auto-refresh actions
  setAutoRefreshEnabled: (enabled) => {
    set((state) => ({
      autoRefresh: { ...state.autoRefresh, enabled }
    }));
    saveAutoRefreshSettings({ enabled });
  },

  setAutoRefreshInterval: (interval) => {
    set((state) => ({
      autoRefresh: { ...state.autoRefresh, interval }
    }));
    saveAutoRefreshSettings({ interval });
  },

  setAutoRefreshState: (newState) => {
    set((state) => ({
      autoRefresh: { ...state.autoRefresh, ...newState }
    }));
    // Only persist enabled, interval, and lastAutoRefresh
    if (newState.enabled !== undefined || newState.interval !== undefined || newState.lastAutoRefresh !== undefined) {
      const { enabled, interval, lastAutoRefresh } = { ...get().autoRefresh, ...newState };
      saveAutoRefreshSettings({ enabled, interval, lastAutoRefresh });
    }
  },

  updateLastAutoRefresh: () => {
    const now = Date.now();
    set((state) => ({
      autoRefresh: { ...state.autoRefresh, lastAutoRefresh: now }
    }));
    saveAutoRefreshSettings({ lastAutoRefresh: now });
  },

  refreshInfo: async () => {
    try {
      const info = await getCacheInfo();
      set({ info });
    } catch (error) {
      console.error('Failed to get cache info:', error);
    }
  },

  refreshStats: async () => {
    try {
      const stats = await getCacheStats();
      set({ stats });

      // Also check integrity when refreshing stats
      await get().checkIntegrity();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }
  },

  checkIntegrity: async () => {
    try {
      const integrity = await checkCacheIntegrity();
      set({ integrity });
    } catch (error) {
      console.error('Failed to check cache integrity:', error);
      set({
        integrity: {
          isHealthy: false,
          issues: ['Failed to check integrity'],
          recommendation: 'Try resetting the database'
        }
      });
    }
  },

  clearAllCache: async () => {
    try {
      set({
        progress: {
          ...initialProgress,
          operation: 'validating',
          message: 'Clearing cache...'
        }
      });

      await clearCache();

      set({
        info: null,
        stats: null,
        progress: initialProgress
      });

      // Refresh to get updated empty state
      await get().refreshInfo();
      await get().refreshStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      set({ progress: initialProgress });
    }
  },

  clearStale: async () => {
    try {
      set({
        progress: {
          ...initialProgress,
          operation: 'validating',
          message: 'Clearing stale data...'
        }
      });

      const cleared = await clearStaleData();

      set({ progress: initialProgress });

      // Refresh stats
      await get().refreshStats();

      return cleared;
    } catch (error) {
      console.error('Failed to clear stale data:', error);
      set({ progress: initialProgress });
      return 0;
    }
  },

  resetDB: async () => {
    try {
      set({
        progress: {
          ...initialProgress,
          operation: 'validating',
          message: 'Resetting database...'
        }
      });

      await resetDatabase();

      set({
        info: null,
        stats: null,
        progress: initialProgress
      });

      // Refresh to get fresh state
      await get().refreshStats();
    } catch (error) {
      console.error('Failed to reset database:', error);
      set({ progress: initialProgress });
    }
  },
}));
