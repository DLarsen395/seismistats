# SeismiStats V2 Production Deployment Guide

Complete instructions for deploying SeismiStats V2 to a Docker Swarm via Portainer.

## Prerequisites

- Docker Swarm cluster with Portainer
- Nginx Proxy Manager (NPM) for SSL/reverse proxy
- Access to GitHub Container Registry (public images, no auth required)

---

## Step 1: Create the External Network

The stack requires an external network to communicate with Nginx Proxy Manager.

### Via Portainer:
1. Go to **Networks** → **Add network**
2. Name: `npm-proxy`
3. Driver: `overlay`
4. Check **Enable manual container attachment**
5. Click **Create the network**

### Via CLI:
```bash
docker network create --driver overlay --attachable npm-proxy
```

---

## Step 2: Configure Nginx Proxy Manager

Create two proxy hosts for the frontend and API.

### Frontend Proxy Host:
| Setting | Value |
|---------|-------|
| Domain | `seismistats.yourdomain.com` |
| Forward Hostname | `frontend` |
| Forward Port | `80` |
| Websockets Support | ❌ |
| SSL | Request new certificate |

### API Proxy Host:
| Setting | Value |
|---------|-------|
| Domain | `seismistats-api.yourdomain.com` |
| Forward Hostname | `api` |
| Forward Port | `3000` |
| Websockets Support | ❌ |
| SSL | Request new certificate |

> **Note**: The Forward Hostname uses the Docker service name. Portainer stacks prefix with the stack name, so if your stack is named `seismistats`, the full service name is `seismistats_frontend`. NPM typically resolves both.

---

## Step 3: Set Environment Variables

You can configure environment variables in two ways:

### Option A: Portainer GUI (Recommended)

When creating/editing the stack in Portainer:
1. Scroll to **Environment variables** section
2. Add the following variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PASSWORD` | ✅ Yes | - | PostgreSQL password (use strong password) |
| `API_URL` | ✅ Yes | - | Public API URL (see note below) |
| `CORS_ORIGIN` | ✅ Yes | - | Frontend URL for CORS (e.g., `https://seismistats.yourdomain.com`) |
| `DB_USER` | No | `seismistats` | PostgreSQL username |
| `DB_NAME` | No | `seismistats` | PostgreSQL database name |
| `IMAGE_TAG` | No | `latest` | Docker image tag (`latest`, `2.0.5`, etc.) |
| `ADMIN_MODE` | No | `true` | Enable admin endpoints (`true`/`false`) |
| `PUBLIC_MODE` | No | `false` | Hide admin UI in frontend (`true`/`false`) |
| `USGS_SYNC_ENABLED` | No | `false` | Auto-sync from USGS (`true`/`false`) |

### Option B: Environment File

Create a `.env` file with your values:

```env
# Required
DB_PASSWORD=your_secure_password_here
API_URL=https://seismistats-api.yourdomain.com
CORS_ORIGIN=https://seismistats.yourdomain.com

# Optional (defaults shown)
DB_USER=seismistats
DB_NAME=seismistats
IMAGE_TAG=latest
ADMIN_MODE=true
PUBLIC_MODE=false
USGS_SYNC_ENABLED=false
```

> **Why is API_URL required?** The frontend runs in the user's browser, not inside Docker. When the React app makes API calls, it needs the public URL that Nginx Proxy Manager exposes - Docker's internal DNS is not accessible from browsers.

---

## Step 4: Deploy the Stack

### Via Portainer:

1. Go to **Stacks** → **Add stack**
2. **Name**: `seismistats`
3. **Build method**: Web editor
4. Paste the contents of `docker-compose.v2.production.example.yml`
5. Scroll to **Environment variables** and add required variables (see Step 3)
6. Click **Deploy the stack**

### Via CLI:

```bash
# With .env file
docker stack deploy -c docker-compose.v2.production.example.yml seismistats

# Or with explicit env file path
env $(cat .env | xargs) docker stack deploy -c docker-compose.v2.production.example.yml seismistats
```

---

## Step 5: Verify Deployment

### Check Service Status:

In Portainer: **Services** → Look for `seismistats_*` services

All services should show:
- ✅ Running (green)
- Replicas: 1/1

### Check Health:

```bash
# API health
curl https://seismistats-api.yourdomain.com/health

# Frontend health
curl https://seismistats.yourdomain.com/health
```

### View Logs:

```bash
docker service logs -f seismistats_api
docker service logs -f seismistats_frontend
docker service logs -f seismistats_db
```

---

## Step 6: Initial Database Setup

On first deployment, you need to seed the database with earthquake data.

1. Open the frontend: `https://seismistats.yourdomain.com`
2. Click the **⚙️ Admin** button (gear icon, bottom-left)
3. Go to **Database Status** tab
4. Click **Seed All Data** to populate historical earthquakes

The seeding process will:
- Fetch ~10 years of M2.5+ earthquakes from USGS
- Store them in TimescaleDB
- Create hypertables for time-series optimization

---

## Updating the Deployment

### Update to Latest Images:

1. In Portainer: **Stacks** → `seismistats` → **Editor**
2. Check **Re-pull image and redeploy**
3. Click **Update the stack**

### Update to Specific Version:

1. Change `IMAGE_TAG` environment variable to desired version (e.g., `2.0.4`)
2. Update the stack

### Via CLI:

```bash
# Pull and update all services
docker service update --image ghcr.io/dlarsen395/seismistats:latest seismistats_frontend
docker service update --image ghcr.io/dlarsen395/seismistats-api:latest seismistats_api
```

---

## Configuration Reference

### Environment Modes

| Mode | `ADMIN_MODE` | `PUBLIC_MODE` | Use Case |
|------|--------------|---------------|----------|
| Full Admin | `true` | `false` | Private instance with full control |
| Public + Admin | `true` | `true` | API allows admin, but frontend hides UI |
| Read-Only | `false` | `true` | Public-facing, no modifications allowed |

### Docker Images

| Image | Description |
|-------|-------------|
| `ghcr.io/dlarsen395/seismistats:latest` | Frontend (React + Vite) |
| `ghcr.io/dlarsen395/seismistats-api:latest` | API (Fastify + TypeScript) |
| `timescale/timescaledb-ha:pg16` | Database (PostgreSQL + TimescaleDB) |

### Ports (Internal)

| Service | Port | Protocol |
|---------|------|----------|
| Frontend | 80 | HTTP |
| API | 3000 | HTTP |
| Database | 5432 | PostgreSQL |

> External access is through Nginx Proxy Manager with SSL.

---

## Troubleshooting

### Services Not Starting

```bash
# Check service status
docker service ps seismistats_api --no-trunc

# Check for errors
docker service logs seismistats_api 2>&1 | tail -50
```

### Database Connection Failed

1. Verify `DB_PASSWORD` matches in both database and API config
2. Check database is healthy: `docker service ps seismistats_db`
3. Check network connectivity between services

### Frontend Can't Reach API

1. Verify `API_URL` is correct and accessible
2. Check CORS: `CORS_ORIGIN` should allow frontend domain
3. Test API directly: `curl https://seismistats-api.yourdomain.com/health`

### Images Not Pulling

```bash
# Verify image exists
docker pull ghcr.io/dlarsen395/seismistats:latest

# Check Portainer registry settings (should work without auth for public images)
```

---

## Backup & Recovery

### Database Backup:

```bash
# Create backup
docker exec $(docker ps -qf name=seismistats_db) pg_dump -U seismistats seismistats > backup.sql

# Restore backup
cat backup.sql | docker exec -i $(docker ps -qf name=seismistats_db) psql -U seismistats seismistats
```

### Volume Location:

The database persists to the `seismistats_pgdata` volume. This volume survives stack redeployments.

---

## Quick Reference

```bash
# Deploy
docker stack deploy -c docker-compose.v2.production.example.yml seismistats

# Status
docker stack services seismistats

# Logs
docker service logs -f seismistats_api

# Remove (keeps volumes)
docker stack rm seismistats

# Remove everything including data
docker stack rm seismistats && docker volume rm seismistats_pgdata
```
