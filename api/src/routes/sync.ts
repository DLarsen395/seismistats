/**
 * Sync status and trigger endpoints
 */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb } from '../db/index.js';
import { triggerManualSync } from '../jobs/sync-scheduler.js';

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
   */
  app.post('/trigger', {
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
}
