/**
 * Sync status, trigger, and seeding endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb } from '../db/index.js';
import { config } from '../config/index.js';
import { triggerManualSync } from '../jobs/sync-scheduler.js';
import {
  seedDatabase,
  getSeedingProgress,
  isSeedingInProgress,
  getDatabaseCoverage,
  cancelSeeding,
  verifyCoverage,
  findCoverageGaps,
} from '../services/seeding.js';

/**
 * Middleware to require admin mode for write operations
 * Returns 403 if ADMIN_MODE is not enabled
 */
async function requireAdminMode(request: FastifyRequest, reply: FastifyReply) {
  if (!config.adminMode) {
    return reply.status(403).send({
      success: false,
      error: 'Admin operations are disabled on this instance',
      message: 'This is a read-only public instance. Use the admin container for write operations.',
    });
  }
}

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/sync/status
   * Returns current sync status and database statistics
   */
  app.get('/status', async () => {
    const db = getDb();

    // Get total counts
    const countResult = await db
      .selectFrom('earthquakes')
      .select(({ fn }) => [
        fn.count('id').as('totalEvents'),
        fn.min('time').as('oldestEvent'),
        fn.max('time').as('newestEvent'),
      ])
      .executeTakeFirst();

    // Get last sync status
    const lastSync = await db
      .selectFrom('sync_status')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    // Get counts by source
    const sourceCounts = await db
      .selectFrom('earthquakes')
      .select(['source'])
      .select(({ fn }) => fn.count('id').as('count'))
      .groupBy('source')
      .execute();

    return {
      success: true,
      data: {
        totalEvents: Number(countResult?.totalEvents || 0),
        oldestEvent: countResult?.oldestEvent,
        newestEvent: countResult?.newestEvent,
        lastSync: lastSync ? {
          time: lastSync.last_sync_time,
          status: lastSync.status,
          eventsSynced: lastSync.events_synced,
          error: lastSync.error_message,
        } : null,
        sources: sourceCounts.map((s) => ({
          source: s.source,
          count: Number(s.count),
        })),
      },
    };
  });

  /**
   * POST /api/sync/trigger
   * Manually trigger a sync for a specific date range
   * Rate limited more aggressively to prevent abuse
   * ADMIN ONLY
   */
  app.post('/trigger', {
    preHandler: [requireAdminMode],
    config: {
      rateLimit: {
        max: config.rateLimit.syncMax,
        timeWindow: config.rateLimit.syncWindowMs,
      },
    },
    schema: {
      body: Type.Object({
        startDate: Type.String({ format: 'date' }),
        endDate: Type.String({ format: 'date' }),
        minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10, default: -2 })),
      }),
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = -2 } = request.body as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
    };

    // Trigger async sync (don't wait for completion)
    const jobId = await triggerManualSync({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minMagnitude,
    });

    return {
      success: true,
      message: 'Sync job started',
      data: {
        jobId,
        startDate,
        endDate,
        minMagnitude,
      },
    };
  });

  /**
   * GET /api/sync/history
   * Returns recent sync history
   */
  app.get('/history', async (request) => {
    const { limit = 20 } = request.query as { limit?: number };

    const db = getDb();

    const history = await db
      .selectFrom('sync_status')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();

    return {
      success: true,
      data: history.map((h) => ({
        id: h.id,
        source: h.source,
        syncTime: h.last_sync_time,
        lastEventTime: h.last_event_time,
        eventsSynced: h.events_synced,
        status: h.status,
        error: h.error_message,
        createdAt: h.created_at,
      })),
    };
  });

  /**
   * GET /api/sync/coverage
   * Returns database coverage statistics (what data is already seeded)
   */
  app.get('/coverage', async () => {
    const coverage = await getDatabaseCoverage();
    return {
      success: true,
      data: coverage,
    };
  });

  /**
   * POST /api/sync/seed
   * Start controlled database seeding with rate limiting
   * This will fetch historical data in chunks with delays to avoid hammering USGS
   * ADMIN ONLY
   */
  app.post('/seed', {
    preHandler: [requireAdminMode],
    config: {
      rateLimit: {
        max: 1, // Only 1 seeding request at a time
        timeWindow: 60000, // 1 minute
      },
    },
    schema: {
      body: Type.Object({
        startDate: Type.Optional(Type.String({ format: 'date' })),
        endDate: Type.Optional(Type.String({ format: 'date' })),
        minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10, default: 2.5 })),
        chunkDays: Type.Optional(Type.Number({ minimum: 1, maximum: 90, default: 30 })),
        delayMs: Type.Optional(Type.Number({ minimum: 500, maximum: 30000, default: 2000 })),
      }),
    },
  }, async (request, reply) => {
    if (isSeedingInProgress()) {
      return reply.conflict('Seeding already in progress. Check /api/sync/seed/progress for status.');
    }

    const {
      startDate,
      endDate,
      minMagnitude = 2.5,
      chunkDays = 30,
      delayMs = 2000,
    } = request.body as {
      startDate?: string;
      endDate?: string;
      minMagnitude?: number;
      chunkDays?: number;
      delayMs?: number;
    };

    // Start seeding in background (don't await)
    seedDatabase({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minMagnitude,
      chunkDays,
      delayMs,
    }).catch((err) => {
      console.error('[Seeding] Unhandled error:', err);
    });

    return {
      success: true,
      message: 'Seeding started. Check /api/sync/seed/progress for status.',
      data: {
        startDate: startDate || '1 year ago',
        endDate: endDate || 'now',
        minMagnitude,
        chunkDays,
        delayMs,
      },
    };
  });

  /**
   * GET /api/sync/seed/progress
   * Get current seeding progress
   */
  app.get('/seed/progress', async () => {
    const progress = getSeedingProgress();
    return {
      success: true,
      data: progress,
    };
  });

  /**
   * POST /api/sync/seed/cancel
   * Cancel ongoing seeding (will finish current chunk)
   * ADMIN ONLY
   */
  app.post('/seed/cancel', {
    preHandler: [requireAdminMode],
  }, async () => {
    cancelSeeding();
    return {
      success: true,
      message: 'Seeding cancellation requested. Current chunk will complete.',
      data: getSeedingProgress(),
    };
  });

  /**
   * POST /api/sync/verify
   * Verify database coverage against USGS count API
   * ADMIN ONLY
   */
  app.post('/verify', {
    preHandler: [requireAdminMode],
    schema: {
      body: Type.Object({
        startDate: Type.String({ format: 'date' }),
        endDate: Type.String({ format: 'date' }),
        minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10, default: 2.5 })),
      }),
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = 2.5 } = request.body as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
    };

    const result = await verifyCoverage({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minMagnitude,
    });

    return {
      success: true,
      data: result,
    };
  });

  /**
   * POST /api/sync/find-gaps
   * Find gaps in database coverage
   * ADMIN ONLY
   */
  app.post('/find-gaps', {
    preHandler: [requireAdminMode],
    schema: {
      body: Type.Object({
        startDate: Type.String({ format: 'date' }),
        endDate: Type.String({ format: 'date' }),
        minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10, default: 2.5 })),
        chunkDays: Type.Optional(Type.Number({ minimum: 1, maximum: 365, default: 30 })),
      }),
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = 2.5, chunkDays = 30 } = request.body as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
      chunkDays?: number;
    };

    const result = await findCoverageGaps({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minMagnitude,
      chunkDays,
    });

    return {
      success: true,
      data: result,
    };
  });
}
