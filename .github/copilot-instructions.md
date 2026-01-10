# GitHub Copilot Instructions for SeismiStats Project

This is a React + TypeScript + Vite application for visualizing seismic events (ETS tremor and USGS earthquakes) with temporal playback and charting.

## Project Naming Convention
- **Brand/Display**: SeismiStats (CamelCase)
- **Technical** (repo, package, docker): seismistats (lowercase, no hyphens)

## Project Versions

### V1.x (Current - Complete)
- **Frontend-only architecture** - Client fetches data directly from USGS/PNSN APIs
- **IndexedDB caching** - Browser-side data persistence
- **Status**: Production deployed at https://seismistats.home.hushrush.com (or legacy: ets.home.hushrush.com)

### V2.x (Planned)
- **Server-side database** - TimescaleDB + PostGIS for centralized earthquake storage
- **Backend API** - Fastify + TypeScript serving aggregated data
- **Single data fetch** - Server syncs USGS data once, clients query server
- **Multi-source ready** - Schema supports USGS, EMSC, future sources
- **Duplicate detection** - Cross-source earthquake matching

See `docs/V2_SERVER_SIDE_ARCHITECTURE_PLAN.md` for V2 planning details.

## Key Requirements
- **Dark Mode**: Included in V1
- **Event Colors**: User-selectable (not just magnitude-based)
- **Modern Design**: Glassmorphism UI with smooth animations
- **Docker**: Development on Docker Desktop (backed by WSL)

## TypeScript Standards
- Strict mode enabled
- Explicit types for all function parameters and return values
- Use interfaces for GeoJSON data structures

## React Patterns
- Functional components with hooks only
- Custom hooks for reusable logic
- Named exports preferred

## State Management (Zustand)
```typescript
import { create } from 'zustand';

interface Store {
  // State
  events: ETSEvent[];

  // Actions
  setEvents: (events: ETSEvent[]) => void;
}

export const useStore = create<Store>()((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));
```

## GeoJSON Types
```typescript
interface ETSEventProperties {
  depth: number;
  duration: number;
  energy: number;
  id: number;
  magnitude: number;
  num_stas: number;
  time: string;
}

interface ETSEvent {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: ETSEventProperties;
}
```

## Mapbox Integration
- Access token via `import.meta.env.VITE_MAPBOX_TOKEN`
- Initialize with Pacific Northwest viewport: `[-123.0, 47.0]`, zoom: 6.5
- Use data-driven styling for event markers

## Styling
- Tailwind CSS with dark mode support
- Glassmorphism for control panels
- High contrast for accessibility

## Development Workflow - CRITICAL
**BEFORE any build/test command (`npm run build`, `npm run dev`, `docker build`, etc.):**
1. **Save all files** - Ensure all changes are saved
2. **Update documentation** - Update CHANGELOG.md and PROJECT_STATUS.md with changes
3. **Commit changes** - Commit with descriptive message before building

This ensures changes are preserved and documented before testing.

## Git & GitHub Workflow - CRITICAL
**Use `gh` CLI instead of MCP tools for GitHub operations when possible.**

### Branch Strategy
Use feature branches for all new work. Never commit directly to `main`.

#### Branch Naming Convention
```
<type>/<short-description>

Examples:
  feature/v2-api-skeleton
  feature/v2-usgs-sync
  fix/chart-timezone-bug
  docs/update-readme
  refactor/extract-hooks
```

#### Creating a Feature Branch
```bash
git checkout main              # Start from main
git pull origin main           # Ensure up to date
git checkout -b feature/v2-api-skeleton  # Create and switch to branch
```

#### Working on a Branch
```bash
git add -A
git commit -m "feat: add Fastify server skeleton"
git push origin feature/v2-api-skeleton  # Push branch to remote
```

#### Merging to Main (when feature is complete)
```bash
git checkout main
git pull origin main           # Get latest
git merge feature/v2-api-skeleton  # Merge feature branch
git push origin main           # Push merged main
git branch -d feature/v2-api-skeleton  # Delete local branch
git push origin --delete feature/v2-api-skeleton  # Delete remote branch
```

#### Alternative: Pull Request Workflow
```bash
# After pushing branch, create PR via gh CLI:
gh pr create --title "feat: V2 API skeleton" --body "Phase 1 implementation"
# After review/approval:
gh pr merge --merge --delete-branch
```

### Before Starting New Work
```bash
git status                    # Check for uncommitted changes
git checkout main             # Switch to main
git pull origin main          # Sync with remote
git checkout -b feature/...   # Create new feature branch
```

### Commit Message Conventions
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `style:` - Formatting, whitespace
- `test:` - Adding tests
- `chore:` - Maintenance, deps, config

### Version Tagging
```bash
git tag -a v2.0.0 -m "V2.0.0 - Server-side architecture"
git push origin v2.0.0
```

### ⚠️ AVOID
- **Never use `gh repo sync --force`** - It can reset local commits
- **Never force push to main** unless recovering from disaster
- **Always commit before switching tasks**

## Environment Safety

### Docker Container Management - CRITICAL RULES
**NEVER create orphan containers. Always use the proper compose file workflow.**

#### ⚠️ FORBIDDEN Docker Commands
```bash
# NEVER run these - they create orphan containers:
docker compose -f docker-compose.dev.yml up -d --build <single-service>
docker run ...
docker restart <container>  # Use compose restart instead
```

#### ✅ REQUIRED Docker Workflow
**Always bring the ENTIRE stack down and back up when rebuilding:**

```bash
# Step 1: Identify which compose file the containers belong to
docker inspect <container-name> --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'

# Step 2: Bring down the ENTIRE stack
docker compose -f <compose-file>.yml down

# Step 3: Rebuild and bring back up
docker compose -f <compose-file>.yml up -d --build
```

#### Compose Files and Their Purposes
| File | Purpose | Ports |
|------|---------|-------|
| `docker-compose.v2.local.yml` | **Local V2 testing** (DB + API + Frontend) | 5174, 8080, 3000, 3001, 5432 |
| `docker-compose.dev.yml` | Development with hot-reload | 5173, 3000, 5432 |
| `docker-compose.seismistats.yml` | Production Docker Swarm | Configured in stack |

#### Before Any Docker Operation
1. Run `docker ps` to see what's currently running
2. Identify the correct compose file for those containers
3. Use that compose file for down/up operations

### Local Development with Docker Compose
**Always use `docker-compose.dev.yml` for local development:**

```bash
# Start all services (DB, API, Frontend with hot-reload)
docker compose -f docker-compose.dev.yml up -d

# Check status
docker ps

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop all services
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker compose -f docker-compose.dev.yml down -v
```

**Development Ports:**
- **Frontend**: http://localhost:5173 (Vite with hot-reload)
- **API**: http://localhost:3000 (Fastify with hot-reload)
- **Database**: localhost:5432 (PostgreSQL + PostGIS)

**Compose Files:**
- `docker-compose.dev.yml` - Local development with hot-reload (USE THIS)
- `docker-compose.seismistats.yml` - Production Docker Swarm deployment

### Alternative: Running Without Docker
- Frontend: `npm run dev` (Vite dev server on :5173)
- API: `cd api && npm run dev` (Fastify on :3000)
- Database: Requires separate PostgreSQL + PostGIS setup

### Docker Image Building
- Build locally with `docker build`
- Test locally before pushing to GHCR
- Tag with version: `docker tag ... ghcr.io/dlarsen395/seismistats-api:v2.0.0`

### Production Deployment
- Only deploy tagged versions to Docker Swarm
- Use Portainer for stack management
- NPM handles SSL termination

---

## V2.x Backend Standards (When Implementing)

### Backend Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify 5.x with TypeScript
- **Database**: TimescaleDB + PostGIS
- **Query Builder**: Kysely (type-safe SQL)
- **Scheduling**: node-cron or BullMQ

### Backend TypeScript Patterns
```typescript
// Fastify route with TypeBox validation
import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const QuerySchema = Type.Object({
  startDate: Type.String({ format: 'date-time' }),
  endDate: Type.String({ format: 'date-time' }),
  minMagnitude: Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
});

app.get('/api/earthquakes', {
  schema: { querystring: QuerySchema },
}, async (request, reply) => {
  // request.query is fully typed
});
```

### Database Schema Conventions
- Use `snake_case` for column names
- All tables include `created_at` and `updated_at`
- Use TIMESTAMPTZ for all timestamps (never TIMESTAMP)
- Store coordinates as PostGIS `GEOGRAPHY(POINT, 4326)`

### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    count: number;
    page?: number;
    totalPages?: number;
  };
}
```

### Project Structure (V2)
```
/
├── api/                    # Backend (NEW)
│   ├── src/
│   │   ├── server.ts       # Fastify app entry
│   │   ├── config/         # Environment, DB config
│   │   ├── db/             # Kysely client, migrations
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   └── jobs/           # Scheduled tasks
│   ├── Dockerfile
│   └── package.json
├── src/                    # Frontend (existing)
├── docs/                   # Architecture docs (NEW)
├── docker-compose.v2.yml   # Full stack compose (NEW)
└── docker-compose.seismistats.yml  # V1 compose (existing)
```
