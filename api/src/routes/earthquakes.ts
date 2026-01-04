/**
 * Raw earthquake data endpoints
 * For querying individual earthquake records
 */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb } from '../db/index.js';
import { sql } from 'kysely';

export async function earthquakeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/earthquakes
   * Returns filtered earthquake records
   */
  app.get('/', {
    schema: {
      querystring: Type.Object({
        startDate: Type.Optional(Type.String({ format: 'date' })),
        endDate: Type.Optional(Type.String({ format: 'date' })),
        minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10 })),
        maxMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10 })),
        minDepth: Type.Optional(Type.Number({ minimum: 0 })),
        maxDepth: Type.Optional(Type.Number({ minimum: 0 })),
        bbox: Type.Optional(Type.String()), // "minLng,minLat,maxLng,maxLat"
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10000, default: 1000 })),
        offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
        orderBy: Type.Optional(Type.Union([
          Type.Literal('time'),
          Type.Literal('magnitude'),
        ])),
        orderDir: Type.Optional(Type.Union([
          Type.Literal('asc'),
          Type.Literal('desc'),
        ])),
      }),
    },
  }, async (request) => {
    const {
      startDate,
      endDate,
      minMagnitude,
      maxMagnitude,
      minDepth,
      maxDepth,
      bbox,
      limit = 1000,
      offset = 0,
      orderBy = 'time',
      orderDir = 'desc',
    } = request.query as {
      startDate?: string;
      endDate?: string;
      minMagnitude?: number;
      maxMagnitude?: number;
      minDepth?: number;
      maxDepth?: number;
      bbox?: string;
      limit?: number;
      offset?: number;
      orderBy?: 'time' | 'magnitude';
      orderDir?: 'asc' | 'desc';
    };

    const db = getDb();

    let query = db
      .selectFrom('earthquakes')
      .select([
        'id',
        'time',
        'source',
        'source_event_id',
        'latitude',
        'longitude',
        'depth_km',
        'magnitude',
        'magnitude_type',
        'place',
        'status',
        'tsunami_warning',
        'felt_reports',
        'cdi',
        'mmi',
        'alert',
      ]);

    // Apply filters
    if (startDate) {
      query = query.where('time', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('time', '<=', new Date(endDate));
    }
    if (minMagnitude !== undefined) {
      query = query.where('magnitude', '>=', minMagnitude);
    }
    if (maxMagnitude !== undefined) {
      query = query.where('magnitude', '<=', maxMagnitude);
    }
    if (minDepth !== undefined) {
      query = query.where('depth_km', '>=', minDepth);
    }
    if (maxDepth !== undefined) {
      query = query.where('depth_km', '<=', maxDepth);
    }

    // Bounding box filter (PostGIS) - use raw SQL for geospatial query
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (query as any) = (query as any).where(sql`ST_Within(location, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))`);
    }

    // Order and paginate
    query = query
      .orderBy(orderBy, orderDir)
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    return {
      success: true,
      data: results.map((eq) => ({
        id: eq.source_event_id,
        time: eq.time,
        coordinates: [eq.longitude, eq.latitude],
        depth: eq.depth_km,
        magnitude: eq.magnitude,
        magnitudeType: eq.magnitude_type,
        place: eq.place,
        status: eq.status,
        tsunamiWarning: eq.tsunami_warning,
        feltReports: eq.felt_reports,
        cdi: eq.cdi,
        mmi: eq.mmi,
        alert: eq.alert,
        source: eq.source,
      })),
      meta: {
        limit,
        offset,
        returned: results.length,
      },
    };
  });

  /**
   * GET /api/earthquakes/:id
   * Returns a single earthquake by source_event_id
   */
  app.get('/:id', {
    schema: {
      params: Type.Object({
        id: Type.String(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const db = getDb();

    const earthquake = await db
      .selectFrom('earthquakes')
      .selectAll()
      .where('source_event_id', '=', id)
      .executeTakeFirst();

    if (!earthquake) {
      return reply.notFound(`Earthquake ${id} not found`);
    }

    return {
      success: true,
      data: {
        id: earthquake.source_event_id,
        time: earthquake.time,
        coordinates: [earthquake.longitude, earthquake.latitude],
        depth: earthquake.depth_km,
        magnitude: earthquake.magnitude,
        magnitudeType: earthquake.magnitude_type,
        place: earthquake.place,
        status: earthquake.status,
        tsunamiWarning: earthquake.tsunami_warning,
        feltReports: earthquake.felt_reports,
        cdi: earthquake.cdi,
        mmi: earthquake.mmi,
        alert: earthquake.alert,
        source: earthquake.source,
        createdAt: earthquake.created_at,
        updatedAt: earthquake.updated_at,
      },
    };
  });
}
