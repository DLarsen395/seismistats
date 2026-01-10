/**
 * Database migration runner
 * Creates the initial schema for TimescaleDB + PostGIS
 */

import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

const MIGRATIONS = [
  {
    name: '001_initial_schema',
    sql: `
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS postgis;
      -- Note: TimescaleDB extension would be added here when available

      -- Main earthquakes table
      CREATE TABLE IF NOT EXISTS earthquakes (
        id BIGSERIAL PRIMARY KEY,
        time TIMESTAMPTZ NOT NULL,

        -- Source tracking
        source TEXT NOT NULL DEFAULT 'USGS',
        source_event_id TEXT NOT NULL,

        -- Location (store lat/lng separately for convenience)
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        depth_km REAL,

        -- Magnitude
        magnitude REAL NOT NULL,
        magnitude_type TEXT,

        -- Metadata
        place TEXT,
        status TEXT,
        tsunami_warning BOOLEAN DEFAULT FALSE,
        felt_reports INTEGER,
        cdi REAL,
        mmi REAL,
        alert TEXT,

        -- Multi-source deduplication (future)
        canonical_event_id BIGINT,
        is_canonical BOOLEAN DEFAULT TRUE,

        -- Audit
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add geography column (computed from lat/lng)
      SELECT AddGeometryColumn('earthquakes', 'location', 4326, 'POINT', 2);

      -- NOTE: TimescaleDB hypertable conversion commented out for now
      -- SELECT create_hypertable('earthquakes', 'time',
      --   chunk_time_interval => INTERVAL '1 month',
      --   if_not_exists => TRUE
      -- );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_earthquakes_source
        ON earthquakes (source, source_event_id);
      CREATE INDEX IF NOT EXISTS idx_earthquakes_magnitude
        ON earthquakes (magnitude);
      CREATE INDEX IF NOT EXISTS idx_earthquakes_location
        ON earthquakes USING GIST (location);
      CREATE INDEX IF NOT EXISTS idx_earthquakes_time_mag
        ON earthquakes (time DESC, magnitude DESC);

      -- Unique constraint to prevent duplicates from same source
      CREATE UNIQUE INDEX IF NOT EXISTS idx_earthquakes_source_unique
        ON earthquakes (source, source_event_id);

      -- Sync status tracking table
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        last_sync_time TIMESTAMPTZ NOT NULL,
        last_event_time TIMESTAMPTZ,
        events_synced INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Function to auto-update location from lat/lng
      CREATE OR REPLACE FUNCTION update_earthquake_location()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger to auto-populate location column
      DROP TRIGGER IF EXISTS trg_update_earthquake_location ON earthquakes;
      CREATE TRIGGER trg_update_earthquake_location
        BEFORE INSERT OR UPDATE ON earthquakes
        FOR EACH ROW
        EXECUTE FUNCTION update_earthquake_location();
    `,
  },
  // NOTE: TimescaleDB features disabled for now - enable when TimescaleDB is available
  /*
  {
    name: '002_compression_policy',
    sql: `
      -- Enable compression on earthquakes table
      ALTER TABLE earthquakes SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'source'
      );

      -- Auto-compress data older than 30 days
      SELECT add_compression_policy('earthquakes', INTERVAL '30 days', if_not_exists => TRUE);
    `,
  },
  {
    name: '003_continuous_aggregates',
    sql: `
      -- Daily earthquake counts (pre-aggregated for fast chart queries)
      CREATE MATERIALIZED VIEW IF NOT EXISTS earthquakes_daily
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 day', time) AS bucket,
        source,
        COUNT(*) as event_count,
        AVG(magnitude) as avg_magnitude,
        MAX(magnitude) as max_magnitude,
        MIN(magnitude) as min_magnitude,
        SUM(POWER(10, 1.5 * magnitude + 4.8)) as total_energy_joules
      FROM earthquakes
      GROUP BY bucket, source
      WITH NO DATA;

      -- Refresh policy for daily aggregates
      SELECT add_continuous_aggregate_policy('earthquakes_daily',
        start_offset => INTERVAL '7 days',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '1 hour',
        if_not_exists => TRUE
      );
    `,
  },
  */
];

async function migrate() {
  const pool = new Pool({ connectionString: config.databaseUrl });

  console.log('🗄️  Running database migrations...\n');

  try {
    await runMigrationsWithPool(pool);
  } finally {
    await pool.end();
  }
}

/**
 * Run migrations using a new database connection
 * Called automatically on server startup
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await runMigrationsWithPool(pool);
  } finally {
    await pool.end();
  }
}

async function runMigrationsWithPool(pool: pg.Pool): Promise<void> {
  // Use advisory lock to prevent multiple instances from running migrations simultaneously
  const lockId = 12345; // Arbitrary lock ID for migrations
  const client = await pool.connect();

  try {
    // Acquire lock (will wait if another process has it)
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);

    // Create migrations tracking table (using simple CREATE TABLE IF NOT EXISTS)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Get already applied migrations
    const { rows: applied } = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(applied.map((r: { name: string }) => r.name));

    // Run pending migrations
    let migrationsRan = 0;
    for (const migration of MIGRATIONS) {
      if (appliedNames.has(migration.name)) {
        continue;
      }

      console.log(`🔄 Running ${migration.name}...`);

      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
        console.log(`✅ ${migration.name} applied successfully`);
        migrationsRan++;
      } catch (err) {
        console.error(`❌ ${migration.name} failed:`, err);
        throw err;
      }
    }

    if (migrationsRan > 0) {
      console.log(`\n✅ ${migrationsRan} migration(s) applied!`);
    } else {
      console.log('✅ Database schema is up to date');
    }
  } finally {
    // Release lock
    await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    client.release();
  }
}

// Run if called directly
migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
