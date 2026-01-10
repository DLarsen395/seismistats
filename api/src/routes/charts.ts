/**
 * Chart data endpoints
 * Returns pre-aggregated data for frontend charts
 */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb } from '../db/index.js';
import { sql } from 'kysely';

// Query parameter schema
const ChartQuerySchema = Type.Object({
  startDate: Type.String({ format: 'date' }),
  endDate: Type.String({ format: 'date' }),
  minMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10 })),
  maxMagnitude: Type.Optional(Type.Number({ minimum: -2, maximum: 10 })),
  regionScope: Type.Optional(Type.Union([
    Type.Literal('worldwide'),
    Type.Literal('us'),
  ])),
  aggregation: Type.Optional(Type.Union([
    Type.Literal('daily'),
    Type.Literal('weekly'),
    Type.Literal('monthly'),
    Type.Literal('yearly'),
  ])),
});

/**
 * Make start date inclusive by setting to start of day in UTC (00:00:00.000)
 * This ensures "Jan 6" means Jan 6 00:00:00.000 UTC
 *
 * @param dateStr - YYYY-MM-DD format string, interpreted as UTC
 */
function makeStartDateInclusive(dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  return date;
}

/**
 * Make end date inclusive by setting to end of day (23:59:59.999)
 * This ensures queries like "Jan 6 to Jan 6" include all events on Jan 6
 *
 * @param dateStr - YYYY-MM-DD format string, interpreted as UTC
 */
function makeEndDateInclusive(dateStr: string): Date {
  const date = new Date(dateStr + 'T23:59:59.999Z');
  return date;
}

export async function chartRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/charts/daily-counts
   * Returns earthquake counts aggregated by time period
   */
  app.get('/daily-counts', {
    schema: {
      querystring: ChartQuerySchema,
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = -2, aggregation = 'daily' } = request.query as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
      aggregation?: string;
    };

    const db = getDb();

    // Determine time truncation based on aggregation (using PostgreSQL date_trunc)
    const truncUnit = aggregation === 'yearly' ? 'year'
      : aggregation === 'monthly' ? 'month'
      : aggregation === 'weekly' ? 'week'
      : 'day';

    const results = await db
      .selectFrom('earthquakes')
      .select([
        sql<string>`date_trunc(${sql.lit(truncUnit)}, time)`.as('bucket'),
        sql<number>`COUNT(*)`.as('count'),
        sql<number>`AVG(magnitude)`.as('avgMagnitude'),
        sql<number>`MAX(magnitude)`.as('maxMagnitude'),
      ])
      .where('time', '>=', makeStartDateInclusive(startDate))
      .where('time', '<=', makeEndDateInclusive(endDate))
      .where('magnitude', '>=', minMagnitude)
      .groupBy(sql`date_trunc(${sql.lit(truncUnit)}, time)`)
      .orderBy('bucket', 'asc')
      .execute();

    return {
      success: true,
      data: results.map((r) => ({
        date: r.bucket,
        count: Number(r.count),
        avgMagnitude: r.avgMagnitude ? Number(r.avgMagnitude.toFixed(2)) : null,
        maxMagnitude: r.maxMagnitude ? Number(r.maxMagnitude) : null,
      })),
      meta: {
        startDate,
        endDate,
        aggregation,
        minMagnitude,
        totalBuckets: results.length,
      },
    };
  });

  /**
   * GET /api/charts/magnitude-distribution
   * Returns earthquake counts grouped by magnitude ranges
   */
  app.get('/magnitude-distribution', {
    schema: {
      querystring: ChartQuerySchema,
    },
  }, async (request) => {
    const { startDate, endDate, aggregation = 'monthly' } = request.query as {
      startDate: string;
      endDate: string;
      aggregation?: string;
    };

    const db = getDb();

    const truncUnit = aggregation === 'yearly' ? 'year'
      : aggregation === 'monthly' ? 'month'
      : aggregation === 'weekly' ? 'week'
      : 'day';

    // Get counts by magnitude range
    const results = await db
      .selectFrom('earthquakes')
      .select([
        sql<string>`date_trunc(${sql.lit(truncUnit)}, time)`.as('bucket'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= -2 AND magnitude < 0)`.as('mag_neg2_0'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 0 AND magnitude < 1)`.as('mag_0_1'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 1 AND magnitude < 2)`.as('mag_1_2'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 2 AND magnitude < 3)`.as('mag_2_3'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 3 AND magnitude < 4)`.as('mag_3_4'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 4 AND magnitude < 5)`.as('mag_4_5'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 5 AND magnitude < 6)`.as('mag_5_6'),
        sql<number>`COUNT(*) FILTER (WHERE magnitude >= 6)`.as('mag_6_plus'),
      ])
      .where('time', '>=', makeStartDateInclusive(startDate))
      .where('time', '<=', makeEndDateInclusive(endDate))
      .groupBy(sql`date_trunc(${sql.lit(truncUnit)}, time)`)
      .orderBy('bucket', 'asc')
      .execute();

    return {
      success: true,
      data: results.map((r) => ({
        date: r.bucket,
        ranges: {
          'M-2 to M0': Number(r.mag_neg2_0),
          'M0 to M1': Number(r.mag_0_1),
          'M1 to M2': Number(r.mag_1_2),
          'M2 to M3': Number(r.mag_2_3),
          'M3 to M4': Number(r.mag_3_4),
          'M4 to M5': Number(r.mag_4_5),
          'M5 to M6': Number(r.mag_5_6),
          'M6+': Number(r.mag_6_plus),
        },
      })),
      meta: {
        startDate,
        endDate,
        aggregation,
        totalBuckets: results.length,
      },
    };
  });

  /**
   * GET /api/charts/energy-release
   * Returns seismic energy released per time period
   */
  app.get('/energy-release', {
    schema: {
      querystring: ChartQuerySchema,
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = 2.5, aggregation = 'monthly' } = request.query as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
      aggregation?: string;
    };

    const db = getDb();

    const truncUnit = aggregation === 'yearly' ? 'year'
      : aggregation === 'monthly' ? 'month'
      : aggregation === 'weekly' ? 'week'
      : 'day';

    // Energy formula: E = 10^(1.5*M + 4.8) joules
    const results = await db
      .selectFrom('earthquakes')
      .select([
        sql<string>`date_trunc(${sql.lit(truncUnit)}, time)`.as('bucket'),
        sql<number>`SUM(POWER(10, 1.5 * magnitude + 4.8))`.as('totalEnergy'),
        sql<number>`AVG(magnitude)`.as('avgMagnitude'),
        sql<number>`COUNT(*)`.as('count'),
      ])
      .where('time', '>=', makeStartDateInclusive(startDate))
      .where('time', '<=', makeEndDateInclusive(endDate))
      .where('magnitude', '>=', minMagnitude)
      .groupBy(sql`date_trunc(${sql.lit(truncUnit)}, time)`)
      .orderBy('bucket', 'asc')
      .execute();

    return {
      success: true,
      data: results.map((r) => ({
        date: r.bucket,
        totalEnergyJoules: r.totalEnergy ? Number(r.totalEnergy) : 0,
        avgMagnitude: r.avgMagnitude ? Number(r.avgMagnitude.toFixed(2)) : null,
        eventCount: Number(r.count),
      })),
      meta: {
        startDate,
        endDate,
        aggregation,
        minMagnitude,
        totalBuckets: results.length,
      },
    };
  });

  /**
   * GET /api/charts/summary
   * Returns summary statistics for the selected date range and filters
   */
  app.get('/summary', {
    schema: {
      querystring: ChartQuerySchema,
    },
  }, async (request) => {
    const { startDate, endDate, minMagnitude = -2, maxMagnitude } = request.query as {
      startDate: string;
      endDate: string;
      minMagnitude?: number;
      maxMagnitude?: number;
    };

    const db = getDb();

    // Build base query with filters
    let query = db
      .selectFrom('earthquakes')
      .where('time', '>=', makeStartDateInclusive(startDate))
      .where('time', '<=', makeEndDateInclusive(endDate))
      .where('magnitude', '>=', minMagnitude);

    if (maxMagnitude !== undefined) {
      query = query.where('magnitude', '<=', maxMagnitude);
    }

    // Note: regionScope filtering would require US bounding box - future implementation

    // Basic statistics
    const basicStats = await query
      .select(({ fn }) => [
        fn.count('id').as('totalEvents'),
        fn.avg('magnitude').as('avgMagnitude'),
        fn.max('magnitude').as('maxMagnitude'),
        fn.min('magnitude').as('minMagnitude'),
        fn.avg('depth_km').as('avgDepth'),
        fn.max('depth_km').as('maxDepth'),
      ])
      .executeTakeFirst();

    // Largest earthquake in range
    const largestEq = await query
      .select(['source_event_id', 'time', 'magnitude', 'place'])
      .orderBy('magnitude', 'desc')
      .limit(1)
      .executeTakeFirst();

    // Most recent earthquake
    const mostRecent = await query
      .select(['source_event_id', 'time', 'magnitude', 'place'])
      .orderBy('time', 'desc')
      .limit(1)
      .executeTakeFirst();

    // Significant events (M5+) count
    const significantCount = await query
      .select(({ fn }) => fn.count('id').as('count'))
      .where('magnitude', '>=', 5)
      .executeTakeFirst();

    // Major events (M6+) count
    const majorCount = await query
      .select(({ fn }) => fn.count('id').as('count'))
      .where('magnitude', '>=', 6)
      .executeTakeFirst();

    // Total energy released (in Joules using Gutenberg-Richter)
    const energyStats = await query
      .select([
        sql<number>`SUM(POWER(10, 1.5 * magnitude + 4.8))`.as('totalEnergy'),
      ])
      .executeTakeFirst();

    // Events per day average
    const daysDiff = Math.max(1, Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)
    ));
    const eventsPerDay = Number(basicStats?.totalEvents || 0) / daysDiff;

    return {
      success: true,
      data: {
        totalEvents: Number(basicStats?.totalEvents || 0),
        avgMagnitude: basicStats?.avgMagnitude
          ? Number(Number(basicStats.avgMagnitude).toFixed(2))
          : null,
        maxMagnitude: basicStats?.maxMagnitude
          ? Number(basicStats.maxMagnitude)
          : null,
        minMagnitude: basicStats?.minMagnitude
          ? Number(basicStats.minMagnitude)
          : null,
        avgDepth: basicStats?.avgDepth
          ? Number(Number(basicStats.avgDepth).toFixed(1))
          : null,
        maxDepth: basicStats?.maxDepth
          ? Number(basicStats.maxDepth)
          : null,
        significantEvents: Number(significantCount?.count || 0),
        majorEvents: Number(majorCount?.count || 0),
        totalEnergyJoules: energyStats?.totalEnergy
          ? Number(energyStats.totalEnergy)
          : 0,
        eventsPerDay: Number(eventsPerDay.toFixed(1)),
        largestEvent: largestEq ? {
          id: largestEq.source_event_id,
          time: largestEq.time,
          magnitude: largestEq.magnitude,
          place: largestEq.place,
        } : null,
        mostRecentEvent: mostRecent ? {
          id: mostRecent.source_event_id,
          time: mostRecent.time,
          magnitude: mostRecent.magnitude,
          place: mostRecent.place,
        } : null,
      },
      meta: {
        startDate,
        endDate,
        minMagnitude,
        maxMagnitude,
        daysInRange: daysDiff,
      },
    };
  });
}
