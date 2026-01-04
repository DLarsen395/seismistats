/**
 * Health check endpoints
 */

import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Simple health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Detailed health check with database status
  app.get('/health/detailed', async () => {
    let dbStatus = 'unknown';
    let dbLatency = 0;

    try {
      const start = Date.now();
      const db = getDb();
      await db.selectFrom('earthquakes').select('id').limit(1).execute();
      dbLatency = Date.now() - start;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
      },
    };
  });
}
