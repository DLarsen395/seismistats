/**
 * Database client initialization using Kysely
 */

import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { config } from '../config/index.js';
import type { Database } from './schema.js';
import { runMigrations } from './migrate.js';

const { Pool } = pg;

let db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<Kysely<Database>> {
  if (db) {
    return db;
  }

  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 20,
  });

  db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  // Run migrations on startup to ensure schema is up to date
  console.log('🗄️  Checking database schema...');
  await runMigrations();

  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}
