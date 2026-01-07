/**
 * Application configuration
 * Loads from environment variables with sensible defaults
 */

import 'dotenv/config';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'CORS_ORIGIN'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database - NO default in production!
  databaseUrl: process.env.DATABASE_URL || (
    process.env.NODE_ENV === 'production'
      ? '' // Will fail validation above
      : 'postgresql://seismistats:seismistats_dev@localhost:5432/seismistats'
  ),

  // CORS - specific origins only
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
    timeWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    // More aggressive limits for sync endpoints
    syncMax: parseInt(process.env.RATE_LIMIT_SYNC_MAX || '5', 10), // 5 per window
    syncWindowMs: parseInt(process.env.RATE_LIMIT_SYNC_WINDOW_MS || '300000', 10), // 5 minutes
  },

  // USGS Sync
  usgs: {
    syncEnabled: process.env.USGS_SYNC_ENABLED === 'true',
    syncIntervalMinutes: parseInt(process.env.USGS_SYNC_INTERVAL_MINUTES || '5', 10),
    baseUrl: 'https://earthquake.usgs.gov/fdsnws/event/1',
    maxEventsPerQuery: 20000,
    // Seeding rate limits to avoid hammering USGS
    seedDelayMs: parseInt(process.env.USGS_SEED_DELAY_MS || '2000', 10), // 2 seconds between requests
    seedChunkDays: parseInt(process.env.USGS_SEED_CHUNK_DAYS || '30', 10), // 30 days per chunk
  },

  // API Security
  apiKey: process.env.API_KEY || '',
  
  // Admin mode - when false, write operations are disabled
  // Set ADMIN_MODE=true on admin container, false/unset on public container
  adminMode: process.env.ADMIN_MODE === 'true',
} as const;

export type Config = typeof config;
