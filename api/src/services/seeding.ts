/**
 * Database Seeding Service
 * Handles controlled initial population of historical earthquake data
 * with rate limiting to avoid hammering data providers
 *
 * Uses magnitude-aware chunk sizes to stay well under USGS 20k event limit:
 * - Lower magnitudes = more events = smaller time chunks needed
 * - Higher magnitudes = fewer events = can use larger time chunks
 */

import { sql } from 'kysely';
import { config } from '../config/index.js';
import { syncFromUSGS } from './usgs-sync.js';
import { getDb } from '../db/index.js';

/**
 * Magnitude-aware chunk sizes (in days)
 * Based on typical USGS event densities to stay well under 20k limit per request
 * These are conservative to provide headroom for high-activity periods
 */
const MAGNITUDE_CHUNK_DAYS: { minMag: number; maxDays: number }[] = [
  { minMag: 6.0, maxDays: 365 * 10 },  // M6+: ~100/year globally, 10 years safe
  { minMag: 5.0, maxDays: 365 },        // M5+: ~1,500/year globally, 1 year safe
  { minMag: 4.0, maxDays: 180 },        // M4+: ~15,000/year globally, 6 months safe
  { minMag: 3.0, maxDays: 60 },         // M3+: high volume, 2 months safe
  { minMag: 2.5, maxDays: 30 },         // M2.5+: very high volume, 1 month safe
  { minMag: 2.0, maxDays: 14 },         // M2+: ~2 weeks safe
  { minMag: 1.0, maxDays: 7 },          // M1+: ~1 week safe
  { minMag: 0.0, maxDays: 3 },          // M0+: ~3 days safe
  { minMag: -2.0, maxDays: 1 },         // M-2+ (micro): 1 day max
];

/**
 * Get the maximum safe chunk size for a given minimum magnitude
 */
function getMaxChunkDays(minMagnitude: number): number {
  for (const { minMag, maxDays } of MAGNITUDE_CHUNK_DAYS) {
    if (minMagnitude >= minMag) {
      return maxDays;
    }
  }
  return 1; // Default to 1 day for very low magnitudes
}

export interface SeedingOptions {
  /** Start date for seeding (default: 1 year ago) */
  startDate?: Date;
  /** End date for seeding (default: now) */
  endDate?: Date;
  /** Minimum magnitude (default: 2.5 for efficiency) */
  minMagnitude?: number;
  /** Days per chunk - will be capped by magnitude-aware limits */
  chunkDays?: number;
  /** Delay between chunks in ms (default: 2000) */
  delayMs?: number;
}

/**
 * Progress format that matches frontend expectations
 */
export interface SeedingProgress {
  isSeeding: boolean;
  totalChunks: number;
  completedChunks: number;
  totalEventsFetched: number;
  startTime: string | null;
  currentChunk: {
    startDate: string;
    endDate: string;
    index: number;
  } | null;
  cancelled: boolean;
  error: string | null;
}

// Singleton state for tracking progress
let seedingProgress: SeedingProgress = {
  isSeeding: false,
  totalChunks: 0,
  completedChunks: 0,
  totalEventsFetched: 0,
  startTime: null,
  currentChunk: null,
  cancelled: false,
  error: null,
};

// Cancellation flag
let cancelRequested = false;

/**
 * Get current seeding progress
 */
export function getSeedingProgress(): SeedingProgress {
  return { ...seedingProgress };
}

/**
 * Check if seeding is currently in progress
 */
export function isSeedingInProgress(): boolean {
  return seedingProgress.isSeeding;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seed the database with historical earthquake data
 *
 * This function:
 * 1. Determines safe chunk size based on magnitude (to stay under USGS 20k limit)
 * 2. Breaks the date range into chunks
 * 3. Fetches each chunk sequentially with delays to avoid rate limiting
 * 4. Tracks progress for status reporting
 * 5. Can be safely interrupted (already-seeded data persists)
 */
export async function seedDatabase(options: SeedingOptions = {}): Promise<SeedingProgress> {
  if (isSeedingInProgress()) {
    throw new Error('Seeding already in progress');
  }

  // Reset cancellation flag
  cancelRequested = false;

  const {
    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    endDate = new Date(),
    minMagnitude = 2.5, // Default to 2.5+ for efficiency
    chunkDays: requestedChunkDays = config.usgs.seedChunkDays,
    delayMs = config.usgs.seedDelayMs,
  } = options;

  // Apply magnitude-aware chunk size limit
  const maxSafeChunkDays = getMaxChunkDays(minMagnitude);
  const effectiveChunkDays = Math.min(requestedChunkDays, maxSafeChunkDays);

  console.log(`[Seeding] Magnitude ${minMagnitude}+ requested chunk: ${requestedChunkDays} days, max safe: ${maxSafeChunkDays} days, using: ${effectiveChunkDays} days`);

  // Validate dates
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }

  // Check for future dates
  const now = new Date();
  const adjustedEndDate = endDate > now ? now : endDate;

  // Calculate chunks (working backwards from endDate to startDate)
  const chunks: Array<{ start: Date; end: Date }> = [];
  let chunkEnd = new Date(adjustedEndDate);

  while (chunkEnd > startDate) {
    const chunkStart = new Date(chunkEnd);
    chunkStart.setUTCDate(chunkStart.getUTCDate() - effectiveChunkDays);

    // Don't go before startDate
    if (chunkStart < startDate) {
      chunkStart.setTime(startDate.getTime());
    }

    chunks.push({ start: chunkStart, end: chunkEnd });

    // Move to previous chunk
    chunkEnd = new Date(chunkStart);
  }

  // Reverse to process oldest first (more predictable)
  chunks.reverse();

  // Initialize progress
  seedingProgress = {
    isSeeding: true,
    totalChunks: chunks.length,
    completedChunks: 0,
    totalEventsFetched: 0,
    startTime: new Date().toISOString(),
    currentChunk: null,
    cancelled: false,
    error: null,
  };

  console.log(`[Seeding] Starting database seed: ${chunks.length} chunks, ${minMagnitude}+ magnitude, ${effectiveChunkDays}-day chunks`);
  console.log(`[Seeding] Date range: ${startDate.toISOString()} to ${adjustedEndDate.toISOString()}`);
  console.log(`[Seeding] Delay between chunks: ${delayMs}ms`);

  try {
    for (let i = 0; i < chunks.length; i++) {
      // Check for cancellation at start of each chunk
      if (cancelRequested) {
        seedingProgress.isSeeding = false;
        seedingProgress.cancelled = true;
        seedingProgress.currentChunk = null;
        console.log(`[Seeding] Cancelled after ${i} chunks`);
        return getSeedingProgress();
      }

      const chunk = chunks[i];

      seedingProgress.currentChunk = {
        startDate: chunk.start.toISOString().split('T')[0],
        endDate: chunk.end.toISOString().split('T')[0],
        index: i + 1,
      };

      console.log(`[Seeding] Chunk ${i + 1}/${chunks.length}: ${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]}`);

      try {
        // Fetch and store this chunk
        const eventsSeeded = await syncFromUSGS({
          startDate: chunk.start,
          endDate: chunk.end,
          minMagnitude,
        });

        seedingProgress.completedChunks = i + 1;
        seedingProgress.totalEventsFetched += eventsSeeded;
        seedingProgress.error = null; // Clear any previous error

        console.log(`[Seeding] Chunk ${i + 1} complete: ${eventsSeeded} events (total: ${seedingProgress.totalEventsFetched})`);
      } catch (chunkError) {
        // Log chunk error but continue with next chunk
        const errorMsg = chunkError instanceof Error ? chunkError.message : 'Unknown error';
        console.error(`[Seeding] Chunk ${i + 1} failed: ${errorMsg}`);
        seedingProgress.error = `Chunk ${i + 1} failed: ${errorMsg}`;
        seedingProgress.completedChunks = i + 1; // Count as attempted
        // Continue to next chunk instead of failing completely
      }

      // Delay before next chunk (except for last chunk)
      if (i < chunks.length - 1 && !cancelRequested) {
        console.log(`[Seeding] Waiting ${delayMs}ms before next chunk...`);
        await sleep(delayMs);
      }
    }

    seedingProgress.isSeeding = false;
    seedingProgress.currentChunk = null;
    console.log(`[Seeding] Complete! Total events fetched: ${seedingProgress.totalEventsFetched}`);

  } catch (error) {
    seedingProgress.isSeeding = false;
    seedingProgress.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Seeding] Fatal error:', error);
  }

  return getSeedingProgress();
}

/**
 * Get database coverage statistics
 * Useful for determining what data is already seeded
 */
export async function getDatabaseCoverage(): Promise<{
  totalEvents: number;
  oldestEvent: Date | null;
  newestEvent: Date | null;
  countsByMagnitude: Array<{ range: string; count: number }>;
}> {
  const db = getDb();

  // Basic stats
  const stats = await db
    .selectFrom('earthquakes')
    .select(({ fn }) => [
      fn.count('id').as('totalEvents'),
      fn.min('time').as('oldestEvent'),
      fn.max('time').as('newestEvent'),
    ])
    .executeTakeFirst();

  // Counts by magnitude range using raw SQL for floor
  const magCounts = await db
    .selectFrom('earthquakes')
    .select([
      sql<number>`floor(magnitude)`.as('magFloor'),
      sql<number>`count(*)`.as('count'),
    ])
    .groupBy(sql`floor(magnitude)`)
    .orderBy(sql`floor(magnitude)`)
    .execute();

  // Handle date conversion properly
  let oldestEvent: Date | null = null;
  let newestEvent: Date | null = null;

  if (stats?.oldestEvent) {
    oldestEvent = stats.oldestEvent instanceof Date
      ? stats.oldestEvent
      : new Date(stats.oldestEvent as unknown as string);
  }
  if (stats?.newestEvent) {
    newestEvent = stats.newestEvent instanceof Date
      ? stats.newestEvent
      : new Date(stats.newestEvent as unknown as string);
  }

  return {
    totalEvents: Number(stats?.totalEvents || 0),
    oldestEvent,
    newestEvent,
    countsByMagnitude: magCounts.map((m) => ({
      range: `M${m.magFloor} to M${Number(m.magFloor) + 1}`,
      count: Number(m.count),
    })),
  };
}

/**
 * Cancel ongoing seeding (gracefully - will finish current chunk)
 */
export function cancelSeeding(): void {
  if (seedingProgress.isSeeding) {
    cancelRequested = true;
    console.log('[Seeding] Cancellation requested - will stop after current chunk');
  }
}

/**
 * Verification result for comparing DB vs USGS counts
 */
export interface VerificationResult {
  startDate: string;
  endDate: string;
  minMagnitude: number;
  dbCount: number;
  usgsCount: number;
  difference: number;
  percentCoverage: number;
  status: 'complete' | 'missing' | 'extra' | 'error';
  error?: string;
}

/**
 * Verify database coverage against USGS count API
 */
export async function verifyCoverage(options: {
  startDate: Date;
  endDate: Date;
  minMagnitude: number;
}): Promise<VerificationResult> {
  const { startDate, endDate, minMagnitude } = options;
  const db = getDb();

  // Get our DB count for this range
  const dbResult = await db
    .selectFrom('earthquakes')
    .select(({ fn }) => fn.count('id').as('count'))
    .where('time', '>=', startDate)
    .where('time', '<=', endDate)
    .where('magnitude', '>=', minMagnitude)
    .executeTakeFirst();

  const dbCount = Number(dbResult?.count || 0);

  // Get USGS expected count - use full ISO timestamps for precise queries
  try {
    const params = new URLSearchParams({
      format: 'geojson',
      starttime: startDate.toISOString(),
      endtime: endDate.toISOString(),
      minmagnitude: minMagnitude.toString(),
    });

    const response = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/count?${params}`);

    if (!response.ok) {
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        minMagnitude,
        dbCount,
        usgsCount: 0,
        difference: 0,
        percentCoverage: 0,
        status: 'error',
        error: `USGS API error: ${response.status}`,
      };
    }

    const data = await response.json() as { count: number };
    const usgsCount = data.count;
    const difference = dbCount - usgsCount;
    const percentCoverage = usgsCount > 0 ? Math.round((dbCount / usgsCount) * 100 * 10) / 10 : 100;

    let status: VerificationResult['status'];
    if (Math.abs(difference) <= Math.max(10, usgsCount * 0.01)) {
      // Within 1% or 10 events tolerance
      status = 'complete';
    } else if (difference < 0) {
      status = 'missing';
    } else {
      status = 'extra';
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      minMagnitude,
      dbCount,
      usgsCount,
      difference,
      percentCoverage,
      status,
    };
  } catch (err) {
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      minMagnitude,
      dbCount,
      usgsCount: 0,
      difference: 0,
      percentCoverage: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Find gaps in coverage by checking each time period
 */
export async function findCoverageGaps(options: {
  startDate: Date;
  endDate: Date;
  minMagnitude: number;
  chunkDays?: number;
}): Promise<{
  gaps: Array<{ startDate: string; endDate: string; missing: number }>;
  totalMissing: number;
}> {
  const { startDate, endDate, minMagnitude, chunkDays = 30 } = options;
  const gaps: Array<{ startDate: string; endDate: string; missing: number }> = [];
  let totalMissing = 0;

  // Break into chunks and verify each
  let chunkStart = new Date(startDate);

  while (chunkStart < endDate) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays);
    if (chunkEnd > endDate) {
      chunkEnd.setTime(endDate.getTime());
    }

    const result = await verifyCoverage({
      startDate: chunkStart,
      endDate: chunkEnd,
      minMagnitude,
    });

    if (result.status === 'missing' && result.difference < -10) {
      gaps.push({
        startDate: chunkStart.toISOString().split('T')[0],
        endDate: chunkEnd.toISOString().split('T')[0],
        missing: Math.abs(result.difference),
      });
      totalMissing += Math.abs(result.difference);
    }

    // Small delay to avoid hammering USGS count API
    await new Promise((resolve) => setTimeout(resolve, 200));

    chunkStart = new Date(chunkEnd);
  }

  return { gaps, totalMissing };
}
