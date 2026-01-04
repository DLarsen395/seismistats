/**
 * Database seeding script
 * Seeds a small sample of earthquake data for development/testing
 */

import { getDb, initializeDatabase, closeDatabase } from './index.js';

const SAMPLE_EARTHQUAKES = [
  {
    time: new Date('2026-01-04T10:30:00Z'),
    source: 'USGS',
    source_event_id: 'us7000sample1',
    latitude: 37.7749,
    longitude: -122.4194,
    depth_km: 10.5,
    magnitude: 4.2,
    magnitude_type: 'ml',
    place: '5km NW of San Francisco, CA',
    status: 'reviewed',
    tsunami_warning: false,
    felt_reports: 150,
    cdi: 4.5,
    mmi: 4.0,
    alert: 'green',
    is_canonical: true,
  },
  {
    time: new Date('2026-01-03T15:45:00Z'),
    source: 'USGS',
    source_event_id: 'us7000sample2',
    latitude: 34.0522,
    longitude: -118.2437,
    depth_km: 8.2,
    magnitude: 3.8,
    magnitude_type: 'ml',
    place: '3km E of Los Angeles, CA',
    status: 'reviewed',
    tsunami_warning: false,
    felt_reports: 85,
    cdi: 3.5,
    mmi: 3.0,
    alert: 'green',
    is_canonical: true,
  },
  {
    time: new Date('2026-01-02T08:20:00Z'),
    source: 'USGS',
    source_event_id: 'us7000sample3',
    latitude: 61.2181,
    longitude: -149.9003,
    depth_km: 45.0,
    magnitude: 5.1,
    magnitude_type: 'mw',
    place: '15km N of Anchorage, AK',
    status: 'reviewed',
    tsunami_warning: false,
    felt_reports: 500,
    cdi: 5.5,
    mmi: 5.0,
    alert: 'green',
    is_canonical: true,
  },
];

async function seed() {
  console.log('🌱 Seeding database with sample data...\n');

  try {
    await initializeDatabase();
    const db = getDb();

    // Clear existing sample data
    await db
      .deleteFrom('earthquakes')
      .where('source_event_id', 'like', 'us7000sample%')
      .execute();

    // Insert sample earthquakes
    for (const eq of SAMPLE_EARTHQUAKES) {
      await db
        .insertInto('earthquakes')
        .values(eq)
        .onConflict((oc) => oc.columns(['source', 'source_event_id']).doNothing())
        .execute();

      console.log(`✅ Inserted: ${eq.place} (M${eq.magnitude})`);
    }

    // Verify count
    const result = await db
      .selectFrom('earthquakes')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    console.log(`\n📊 Total earthquakes in database: ${result?.count}`);
    console.log('✅ Seeding complete!');

  } finally {
    await closeDatabase();
  }
}

// Run if called directly
seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
