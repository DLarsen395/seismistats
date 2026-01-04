/**
 * API Route registration
 * Centralizes all route modules
 */

import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { chartRoutes } from './charts.js';
import { syncRoutes } from './sync.js';
import { earthquakeRoutes } from './earthquakes.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health check (no prefix)
  await app.register(healthRoutes);

  // API routes (prefixed)
  await app.register(chartRoutes, { prefix: '/api/charts' });
  await app.register(syncRoutes, { prefix: '/api/sync' });
  await app.register(earthquakeRoutes, { prefix: '/api/earthquakes' });

  // Log registered routes in development
  if (process.env.NODE_ENV === 'development') {
    app.ready(() => {
      console.log('\n📍 Registered Routes:');
      console.log(app.printRoutes());
    });
  }
}
