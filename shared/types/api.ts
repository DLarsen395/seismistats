/**
 * Shared types between frontend and API
 * These types define the API contract
 */

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// ============================================
// Chart Data Types
// ============================================

export interface DailyCountData {
  date: string;
  count: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
}

export interface MagnitudeDistributionData {
  date: string;
  ranges: {
    'M-2 to M0': number;
    'M0 to M1': number;
    'M1 to M2': number;
    'M2 to M3': number;
    'M3 to M4': number;
    'M4 to M5': number;
    'M5 to M6': number;
    'M6+': number;
  };
}

export interface EnergyReleaseData {
  date: string;
  totalEnergyJoules: number;
  avgMagnitude: number | null;
  eventCount: number;
}

// ============================================
// Earthquake Types
// ============================================

export interface Earthquake {
  id: string;
  time: string;
  coordinates: [number, number]; // [lng, lat]
  depth: number | null;
  magnitude: number;
  magnitudeType: string | null;
  place: string | null;
  status: string | null;
  tsunamiWarning: boolean;
  feltReports: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  source: string;
}

// ============================================
// Sync Status Types
// ============================================

export interface SyncStatus {
  totalEvents: number;
  oldestEvent: string | null;
  newestEvent: string | null;
  lastSync: {
    time: string;
    status: 'success' | 'error' | 'running';
    eventsSynced: number;
    error: string | null;
  } | null;
  sources: Array<{
    source: string;
    count: number;
  }>;
}

// ============================================
// Query Parameter Types
// ============================================

export interface ChartQueryParams {
  startDate: string;
  endDate: string;
  minMagnitude?: number;
  maxMagnitude?: number;
  regionScope?: 'worldwide' | 'us';
  aggregation?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface EarthquakeQueryParams {
  startDate?: string;
  endDate?: string;
  minMagnitude?: number;
  maxMagnitude?: number;
  minDepth?: number;
  maxDepth?: number;
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  limit?: number;
  offset?: number;
  orderBy?: 'time' | 'magnitude';
  orderDir?: 'asc' | 'desc';
}

export interface SyncTriggerParams {
  startDate: string;
  endDate: string;
  minMagnitude?: number;
}
