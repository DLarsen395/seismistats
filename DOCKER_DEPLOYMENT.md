# ETS Events - Docker Deployment Guide

## Overview

This application is deployed using Docker Swarm with Nginx Proxy Manager for SSL termination and authentication. The container image is hosted on GitHub Container Registry (GHCR).

**Production URL**: https://ets.home.hushrush.com  
**GitHub Repository**: https://github.com/DLarsen395/ets-events  
**Container Registry**: `ghcr.io/dlarsen395/ets-events`

### Available Image Tags
| Tag | Description |
|-----|-------------|
| `latest` | Most recent build |
| `1.1.0` | MapLibre migration (current) |
| `1.0.x` | Legacy Mapbox versions |

## ✨ No API Keys Required!

As of v1.1.0, this application uses **MapLibre GL JS** with free Carto basemaps. No API keys or tokens are needed - the image is completely self-contained.

## Prerequisites

- Docker Swarm initialized
- Nginx Proxy Manager running on `npm-proxy` network
- GitHub PAT with `write:packages` and `read:packages` scopes

## Quick Start

### 1. Build the Docker Image

```bash
# Build the image
docker build -t ets-events:latest .
```

### 2. Test Locally (Optional)

```bash
# Run container locally
docker run -d -p 8080:80 --name ets-events-test ets-events:latest

# Test at http://localhost:8080

# Clean up
docker stop ets-events-test && docker rm ets-events-test
```

### 3. Push to GitHub Container Registry

```bash
# Login to GHCR (use lowercase username)
echo YOUR_PAT | docker login ghcr.io -u yourusername --password-stdin

# Tag with version number AND latest
docker tag ets-events:latest ghcr.io/dlarsen395/ets-events:1.1.0
docker tag ets-events:latest ghcr.io/dlarsen395/ets-events:latest

# Push both tags
docker push ghcr.io/dlarsen395/ets-events:1.1.0
docker push ghcr.io/dlarsen395/ets-events:latest
```

### 4. Deploy to Docker Swarm (Portainer)

1. **Add GHCR Registry** (one-time):
   - Registries → Add registry → Custom
   - URL: `ghcr.io`
   - Username: `DLarsen395`
   - Password: Your GitHub PAT

2. **Create Stack**:
   - Stacks → Add stack
   - Name: `ets-events`
   - Paste this compose:

```yaml
version: "3.8"

services:
  ets-events:
    image: ghcr.io/dlarsen395/ets-events:1.1.0  # Pin to specific version
    # image: ghcr.io/dlarsen395/ets-events:latest  # Or use latest
    networks:
      - npm-proxy
    deploy:
      replicas: 1
      restart_policy:
        condition: any

networks:
  npm-proxy:
    external: true
```

3. **Deploy the stack**

### 5. Configure Nginx Proxy Manager

1. **Create Access List** (one-time setup):
   - Go to **Access Lists** → **Add Access List**
   - Name: `ETS Events Access`
   - **Authorization** tab: Add username/password for each user
   - **Save**

2. **Add Proxy Host**:
   - **Details** tab:
     - Domain Names: `ets.home.hushrush.com`, `ets.hushrush.com`
     - Scheme: `http`
     - Forward Hostname: `ets-events_ets-events`
     - Forward Port: `80`
     - Block Common Exploits: ✅
   - **SSL** tab:
     - Select your wildcard certificate
     - Force SSL: ✅
     - HTTP/2 Support: ✅
   - **Access List**: Select `ETS Events Access`
   - **Save**

3. **Done!** Visit https://ets.home.hushrush.com

## Updating the Application

### Full Update Process

```powershell
# 1. Update version in package.json and CHANGELOG.md

# 2. Build new image
docker build -t ets-events:latest .

# 3. Tag with version AND latest (replace X.Y.Z with actual version)
docker tag ets-events:latest ghcr.io/dlarsen395/ets-events:X.Y.Z
docker tag ets-events:latest ghcr.io/dlarsen395/ets-events:latest

# 4. Push both tags to GHCR
docker push ghcr.io/dlarsen395/ets-events:X.Y.Z
docker push ghcr.io/dlarsen395/ets-events:latest

# 5. Commit and tag in git
git add -A
git commit -m "vX.Y.Z: Description"
git tag -a vX.Y.Z -m "Release description"
git push origin main --tags

# 6. In Portainer: Update stack with new version or pull latest
```

### Quick Update via Portainer

1. Go to **Stacks** → **ets-events**
2. Click on the service
3. Click **Update**
4. Check **Pull latest image**
5. **Update**

## Service Management

### View Service Status
```bash
docker service ps ets-events_ets-events
docker service ls | grep ets
```

### View Logs
```bash
docker service logs -f ets-events_ets-events
```

### Scale Service (optional)
```bash
docker service scale ets-events_ets-events=2
```

### Remove Service
```bash
docker stack rm ets-events
```

## User Management

### Add User
1. Open NPM Dashboard
2. Go to **Access Lists** → "ETS Events Access"
3. Click **Edit**
4. **Authorization** tab → Add username/password
5. **Save**
6. Users take effect immediately (no container restart needed)

### Remove User
1. Same as above, but click the **trash icon** next to the user
2. **Save**

### Change Password
1. Remove old user entry
2. Add new entry with same username but new password
3. **Save**

## Architecture

```
Internet
   ↓
NPM (ports 80/443) - Handles SSL + Auth
   ↓
ets-events_ets-events service (internal port 80)
   ↓
React SPA with MapLibre
```

**Key Points:**
- App container has **no auth** - it's just the React app + Nginx
- NPM handles **all authentication** via Access Lists (persistent in NPM's database)
- When you update the app container, **auth settings are untouched**
- NPM's Access Lists are stored in the external volume `Trinity-NPM-Data`

## Troubleshooting

### Service won't start
```bash
# Check service status
docker service ps ets_ets-events --no-trunc

# View detailed logs
docker service logs ets_ets-events --tail 100
```

### Can't access via NPM
1. Verify service is running: `docker service ls | grep ets`
2. Check service name in NPM matches: `ets_ets-events`
3. Ensure both NPM and app are on `npm-proxy` network
4. Check NPM logs: `docker logs <npm-container-id>`

### Health check failing
```bash
# Test from within the container
docker exec $(docker ps -q -f name=ets_ets-events) wget -qO- http://localhost/health
```

### Need to rebuild without cache
```bash
docker build --no-cache -t ets-events:latest .
```

### Auth not working
1. Verify Access List is attached to Proxy Host in NPM
2. Check NPM logs for auth errors
3. Try different browser (clear cache)
4. Verify username/password in NPM Access List

## Performance

- **Image Size**: ~50MB (multi-stage build)
- **Memory Usage**: ~10-20MB per container
- **CPU Usage**: Minimal (static files only)
- **Startup Time**: ~5 seconds

## Security

- ✅ Authentication handled by NPM (outside app container)
- ✅ HTTPS enforced via NPM + Let's Encrypt
- ✅ Security headers in nginx.conf
- ✅ No sensitive data in container
- ✅ Health checks for monitoring
- ✅ Automatic container restart on failure

## Backup

**What to backup:**
- NPM Access Lists (automatic via `Trinity-NPM-Data` volume)
- NPM SSL certificates (automatic via `Trinity-NPM-SSL` volume)

**No app data to backup** - it's a stateless visualization tool with no API keys required.

## Support

For issues:
1. Check service logs
2. Verify NPM configuration
3. Test health endpoint: `curl http://ets_ets-events/health`
4. Check browser console for frontend errors
