                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    /**
 * SeismiStats API Server
 * Main entry point for the Fastify application
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config/index.js';
import { registerRoutes } from './routes/index.js';
import { initializeDatabase } from './db/index.js';
import { startSyncScheduler } from './jobs/sync-scheduler.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
  },
});

async function main() {
  try {
    // Register plugins
    await app.register(cors, {
      origin: config.nodeEnv === 'development'
        ? ['http://localhost:5173', 'http://localhost:3000']
        : true,
    });
    await app.register(sensible);

    // Initialize database connection
    await initializeDatabase();
    app.log.info('Database connection established');

    // Register API routes
    await registerRoutes(app);

    // Start USGS sync scheduler (if enabled)
    if (config.usgs.syncEnabled) {
      startSyncScheduler();
      app.log.info(`USGS sync scheduler started (every ${config.usgs.syncIntervalMinutes} minutes)`);
    }

    // Start server
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`SeismiStats API running at http://${config.host}:${config.port}`);

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  });
});

main();
