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

interface CacheStore {
  // Cache state
  isEnabled: boolean;
  info: CacheInfo | null;
  stats: CacheStats | null;
  integrity: CacheIntegrity | null;
  
  // Progress tracking
  progress: CacheProgress;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setProgress: (progress: CacheProgress) => void;
  refreshInfo: () => Promise<void>;
  refreshStats: () => Promise<void>;
  checkIntegrity: () => Promise<void>;
  clearAllCache: () => Promise<void>;
  clearStale: () => Promise<number>;
  resetDB: () => Promise<void>;
}

const initialProgress: CacheProgress = {
  operation: 'idle',
  currentStep: 0,
  totalSteps: 0,
  message: '',
  startedAt: null,
};

export const useCacheStore = create<CacheStore>((set, get) => ({
  // Initial state
  isEnabled: true,
  info: null,
  stats: null,
  integrity: null,
  progress: initialProgress,
  
  // Actions
  setEnabled: (enabled) => set({ isEnabled: enabled }),
  
  setProgress: (progress) => set({ progress }),
  
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
