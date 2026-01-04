# SeismiStats API

Backend API server for the SeismiStats earthquake visualization application.

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.6
- **Database**: TimescaleDB + PostGIS
- **Query Builder**: Kysely (type-safe SQL)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (for database)

### Development Setup

```bash
# 1. Start the database
docker compose -f docker-compose.dev.yml up -d

# 2. Install dependencies
cd api
npm install

# 3. Create .env file
cp .env.example .env

# 4. Run database migrations
npm run db:migrate

# 5. (Optional) Seed sample data
npm run db:seed

# 6. Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health
- `GET /health` - Simple health check
- `GET /health/detailed` - Health with database status

### Charts
- `GET /api/charts/daily-counts` - Earthquake counts over time
- `GET /api/charts/magnitude-distribution` - Magnitude range breakdown
- `GET /api/charts/energy-release` - Seismic energy released

### Sync
- `GET /api/sync/status` - Current sync status and stats
- `POST /api/sync/trigger` - Manually trigger USGS sync
- `GET /api/sync/history` - Recent sync history

### Earthquakes
- `GET /api/earthquakes` - Query earthquake records
- `GET /api/earthquakes/:id` - Get single earthquake

## Database

Uses TimescaleDB (PostgreSQL extension) for time-series optimization and PostGIS for geospatial queries.

### Run Migrations

```bash
npm run db:migrate
```

### Seed Sample Data

```bash
npm run db:seed
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed sample data |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `USGS_SYNC_ENABLED` | Enable auto-sync | `true` |
| `USGS_SYNC_INTERVAL_MINUTES` | Sync interval | `5` |
| `API_KEY` | Optional API key for auth | (none) |
