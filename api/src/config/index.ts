/**
 * Application configuration
 * Loads from environment variables with sensible defaults
 */

import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://seismistats:seismistats_dev@localhost:5432/seismistats',

  // USGS Sync
  usgs: {
    syncEnabled: process.env.USGS_SYNC_ENABLED === 'true',
    syncIntervalMinutes: parseInt(process.env.USGS_SYNC_INTERVAL_MINUTES || '5', 10),
    baseUrl: 'https://earthquake.usgs.gov/fdsnws/event/1',
    maxEventsPerQuery: 20000,
  },

  // API Security
  apiKey: process.env.API_KEY || '',
} as const;

export type Config = typeof config;
