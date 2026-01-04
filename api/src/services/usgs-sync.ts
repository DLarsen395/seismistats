/**
 * USGS Earthquake Sync Service
 * Fetches earthquake data from USGS FDSN API and stores in database
 */

import { config } from '../config/index.js';
import { getDb } from '../db/index.js';

export interface SyncOptions {
  startDate: Date;
  endDate: Date;
  minMagnitude?: number;
  maxMagnitude?: number;
}

export interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string | null;
    time: number;
    updated: number;
    tz: number | null;
    url: string;
    detail: string;
    felt: number | null;
    cdi: number | null;
    mmi: number | null;
    alert: string | null;
    status: string;
    tsunami: number;
    sig: number;
    net: string;
    code: string;
    ids: string;
    sources: string;
    types: string;
    nst: number | null;
    dmin: number | null;
    rms: number | null;
    gap: number | null;
    magType: string | null;
    type: string;
    title: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

export interface USGSResponse {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: USGSFeature[];
}

/**
 * Fetch earthquakes from USGS and store in database
 */
export async function syncFromUSGS(options: SyncOptions): Promise<number> {
  const { startDate, endDate, minMagnitude = -2, maxMagnitude } = options;

  const db = getDb();
  let totalSynced = 0;

  // Build USGS API URL
  const params = new URLSearchParams({
    format: 'geojson',
    starttime: startDate.toISOString(),
    endtime: endDate.toISOString(),
    minmagnitude: minMagnitude.toString(),
    orderby: 'time',
  });

  if (maxMagnitude !== undefined) {
    params.set('maxmagnitude', maxMagnitude.toString());
  }

  const url = `${config.usgs.baseUrl}/query?${params}`;
  console.log(`[USGS Sync] Fetching: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status} ${response.statusText}`);
    }

    const data: USGSResponse = (await response.json()) as USGSResponse;
    console.log(`[USGS Sync] Received ${data.features.length} events from USGS`);

    // Process in batches
    const batchSize = 500;
    for (let i = 0; i < data.features.length; i += batchSize) {
      const batch = data.features.slice(i, i + batchSize);

      const values = batch.map((feature) => ({
        time: new Date(feature.properties.time),
        source: 'USGS',
        source_event_id: feature.id,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        depth_km: feature.geometry.coordinates[2],
        magnitude: feature.properties.mag,
        magnitude_type: feature.properties.magType,
        place: feature.properties.place,
        status: feature.properties.status,
        tsunami_warning: feature.properties.tsunami === 1,
        felt_reports: feature.properties.felt,
        cdi: feature.properties.cdi,
        mmi: feature.properties.mmi,
        alert: feature.properties.alert,
        is_canonical: true,
      }));

      // Upsert (insert or update on conflict)
      await db
        .insertInto('earthquakes')
        .values(values)
        .onConflict((oc) =>
          oc.columns(['source', 'source_event_id']).doUpdateSet({
            magnitude: (eb) => eb.ref('excluded.magnitude'),
            magnitude_type: (eb) => eb.ref('excluded.magnitude_type'),
            place: (eb) => eb.ref('excluded.place'),
            status: (eb) => eb.ref('excluded.status'),
            felt_reports: (eb) => eb.ref('excluded.felt_reports'),
            cdi: (eb) => eb.ref('excluded.cdi'),
            mmi: (eb) => eb.ref('excluded.mmi'),
            alert: (eb) => eb.ref('excluded.alert'),
            updated_at: new Date(),
          })
        )
        .execute();

      totalSynced += batch.length;
      console.log(`[USGS Sync] Processed ${totalSynced}/${data.features.length}`);
    }

    // Record sync status
    await db
      .insertInto('sync_status')
      .values({
        source: 'USGS',
        last_sync_time: new Date(),
        last_event_time: data.features.length > 0
          ? new Date(data.features[0].properties.time)
          : null,
        events_synced: totalSynced,
        status: 'success',
      })
      .execute();

    return totalSynced;

  } catch (error) {
    // Record failed sync
    await db
      .insertInto('sync_status')
      .values({
        source: 'USGS',
        last_sync_time: new Date(),
        events_synced: totalSynced,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .execute();

    throw error;
  }
}
