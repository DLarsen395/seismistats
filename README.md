# SeismiStats - The Seismic Energy Explorer

An interactive web application for visualizing and analyzing worldwide seismic events, featuring ETS (Episodic Tremor and Slip) playback, USGS earthquake data integration, and comprehensive charting capabilities.

![SeismiStats](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-2.0.1-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-7.2-purple)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

**GitHub Repository**: https://github.com/DLarsen395/seismistats
**Container Registry**: https://ghcr.io/dlarsen395/seismistats

## 📦 Versions

| Version | Description | Compose File | Env File |
|---------|-------------|--------------|----------|
| **V1.x** | Frontend-only, direct USGS/PNSN API calls | `docker-compose.seismistats.yml` | None required |
| **V2.x** | Server-side database with admin UI | `docker-compose.v2.yml` | `.env.v2.example` |

### V1.x (Latest: v1.2.9)
- Self-contained frontend application
- Fetches data directly from USGS/PNSN APIs
- IndexedDB caching in browser
- **No environment variables needed!**

### V2.x (Latest: v2.0.1)
- PostgreSQL + PostGIS + TimescaleDB backend
- Fastify API server with TypeScript
- Database seeding with admin UI
- Public/Admin separation for security

## 🌟 Features

### Core Functionality
- **Interactive Map Visualization** - MapLibre GL JS with free Carto basemaps (no API key required!)
- **Tectonic Plate Boundaries** - USGS plate boundary overlay with toggle control
- **Live Data Integration** - Real-time events from PNSN Tremor API
- **Temporal Playback** - Watch events unfold chronologically with play/pause controls
- **Multiple Time Ranges** - 24 hours, week, month, year, or custom date range
- **Depth-Based Coloring** - Events colored by depth (25-45km, orange→magenta gradient)
- **Magnitude-Based Sizing** - Event markers sized by magnitude (0.4-1.6+)
- **Speed Controls** - Playback speeds from 0.1x to 10x
- **Timeline Scrubbing** - Click or drag to jump to any point in time
- **Range Brackets** - Set custom playback start/end within loaded data

### Earthquake Charts View
- **Bar Chart (Earthquakes by Day/Week/Month/Year)** - Aggregated earthquake counts over time
- **Magnitude Distribution Chart** - Stacked area chart showing earthquake counts by magnitude range
- **Energy Release Chart** - Seismic energy on logarithmic scale with average magnitude line
- **USGS API Integration** - Chunked fetching for large date ranges with intelligent caching
- **IndexedDB Caching** - Historical data cached permanently, recent data refreshed after 24h
- **Pinned Filter Panel** - Time range and filter controls stay visible while charts scroll

### UI Components
- **Legend** - Visual guide for depth colors and magnitude sizes
- **Statistics Panel** - Real-time stats (total events, mag range, avg depth, date range)
- **Mode Toggle** - Switch between "Show All Events" and "Playback" modes
- **Mobile Responsive** - Collapsible Info panel for phones and tablets
- **Loading Indicators** - Visual feedback during data fetches

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/DLarsen395/seismistats.git
cd seismistats

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Map Library**: MapLibre GL JS (open-source, no API key required)
- **Basemap**: Carto Dark Matter (free)
- **Overlays**: USGS Tectonic Plate Boundaries
- **State Management**: Zustand
- **Data Sources**:
  - PNSN Tremor API (https://tremorapi.pnsn.org) - ETS events
  - USGS Earthquake API - Global earthquakes
- **Styling**: Tailwind CSS with dark mode, glassmorphism effects

## 📊 Data Sources

### ETS Events (Tremor)
- **API**: https://tremorapi.pnsn.org/api/v3.0/events
- **Coverage**: Cascadia Subduction Zone
- **Update Frequency**: Real-time
- **Data Format**: GeoJSON

### Earthquakes (USGS)
- **API**: https://earthquake.usgs.gov/fdsnws/event/1/query
- **Coverage**: Worldwide
- **Historical Data**: 1500 to present
- **Update Frequency**: Real-time

## 🎮 Usage

### Viewing Events
1. **Select Time Range** - Use preset buttons (48h, Week, Month, Year) or Custom Range
2. **Choose Mode**:
   - **Show All Events** - Display all events at once
   - **Playback** - Watch events appear chronologically
3. **Adjust Speed** - Use speed controls (0.1x - 10x)
4. **Scrub Timeline** - Click or drag the timeline to jump to any time
5. **Set Range** - Drag bracket handles to focus on a specific time window

### Mobile Usage
- Tap **Info** button (bottom right) to access:
  - Display mode toggle
  - Speed controls
  - Statistics
  - Legend

## 📁 Project Structure

```
src/
├── components/
│   ├── Charts/                       # Earthquake visualization charts
│   │   ├── EarthquakeChartsPage.tsx  # Main charts container
│   │   ├── MagnitudeDistributionChart.tsx
│   │   ├── EnergyReleaseChart.tsx
│   │   └── RechartsBarChart.tsx
│   ├── Controls/
│   │   ├── DataRangeSelector.tsx     # Time range preset buttons
│   │   ├── EventStats.tsx            # Statistics panel
│   │   ├── Legend.tsx                # Depth/magnitude legend
│   │   ├── MobileInfoPanel.tsx       # Mobile collapsible panel
│   │   ├── PlaybackControls.tsx      # Timeline and playback buttons
│   │   └── SideControls.tsx          # Mode toggle and speed controls
│   ├── Map/
│   │   └── MapContainer.tsx          # MapLibre map component
│   └── Navigation/
│       └── ViewNavigation.tsx        # Map/Charts view switcher
├── hooks/
│   ├── useAutoRefresh.ts             # Auto-refresh data logic
│   ├── useEventData.ts               # Data fetching from API
│   ├── useIsMobile.ts                # Mobile/tablet detection
│   └── usePlayback.ts                # Playback logic and filtering
├── services/
│   ├── earthquake-cache.ts           # IndexedDB caching layer
│   ├── tremor-api.ts                 # PNSN API integration
│   └── usgs-earthquake-api.ts        # USGS API integration
├── stores/
│   ├── cacheStore.ts                 # Cache state management
│   ├── earthquakeStore.ts            # Earthquake data state
│   └── playbackStore.ts              # Playback state management
├── types/
│   ├── earthquake.ts                 # USGS earthquake types
│   └── event.ts                      # ETS event types
└── App.tsx                           # Main application
```

## ⚙️ Configuration

### Map Configuration

- **Basemap**: Carto Dark Matter (free, no API key)
- **Overlays**: USGS Tectonic Plate Boundaries
- **Center**: [-124.0, 44.5] (Cascadia Subduction Zone)
- **Initial Zoom**: 5.2

### Event Styling

**Depth Colors** (interpolated):
- 25km: `#FFA500` (orange)
- 30km: `#FF6B35` (coral)
- 35km: `#FF3366` (hot pink)
- 40km: `#E91E63` (magenta)
- 45km: `#9C27B0` (deep purple)

**Magnitude Sizes**:
- < 0.7: 3px radius
- 1.0: 6px radius
- 1.6+: 10.5px radius

## 🔧 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **State**: Zustand for global state, useState for local
- **Styling**: Tailwind utility classes + inline styles for dynamic values

## 📦 Deployment

### V1 Deployment (Simple - No Database)

V1 is completely self-contained - no API keys, no database, no environment variables!

```bash
# Using Docker Compose
docker stack deploy -c docker-compose.seismistats.yml seismistats

# Or run directly
docker run -d -p 8080:80 ghcr.io/dlarsen395/seismistats:v1.2.9
```

### V2 Deployment (Full Stack with Database)

V2 uses a PostgreSQL database and requires environment configuration.

#### Environment Files

| File | Purpose | Git Status |
|------|---------|------------|
| `.env.v1.example` | Documents V1 needs no env vars | ✅ Committed |
| `.env.v2.example` | Template for V2 public stack | ✅ Committed |
| `.env.v2.admin.example` | Template for V2 admin stack | ✅ Committed |
| `.env.v2.local` | Your V2 public credentials | 🚫 Gitignored |
| `.env.v2.admin.local` | Your V2 admin credentials | 🚫 Gitignored |

#### Quick Start (Development)

```bash
# Start all services with hot-reload
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Access at:
# - Frontend: http://localhost:5173
# - API: http://localhost:3000
# - Database: localhost:5432
```

#### Production Deployment (Portainer/Swarm)

**Step 1: Create environment file**
```bash
cp .env.v2.example .env.v2.local
# Edit .env.v2.local with your credentials
```

**Step 2: Deploy public stack**
```bash
docker stack deploy -c docker-compose.v2.yml --env-file .env.v2.local seismistats
```

**Step 3: Deploy admin stack** (optional, for database seeding)
```bash
cp .env.v2.admin.example .env.v2.admin.local
# Edit .env.v2.admin.local with your credentials
docker stack deploy -c docker-compose.v2.admin.yml --env-file .env.v2.admin.local seismistats-admin
```

#### V2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC INTERNET                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
            ┌─────────▼─────────┐
            │   NPM Proxy       │  (SSL termination)
            └─────────┬─────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐       ┌─────▼─────┐     ┌─────▼─────┐
│Frontend│       │  API      │     │ Admin API │  ← Internal only
│(Public)│       │(Read-only)│     │(Full R/W) │
└────────┘       └─────┬─────┘     └─────┬─────┘
                       │                 │
                       └────────┬────────┘
                                │
                    ┌───────────▼───────────┐
                    │    PostgreSQL DB       │
                    │  (PostGIS + TimescaleDB)│
                    └───────────────────────┘
```

### Docker Images

| Image | Description |
|-------|-------------|
| `ghcr.io/dlarsen395/seismistats:latest` | V1 latest |
| `ghcr.io/dlarsen395/seismistats:v1.2.9` | V1 specific version |
| `ghcr.io/dlarsen395/seismistats:v2` | V2 frontend |
| `ghcr.io/dlarsen395/seismistats-api:v2` | V2 API server |

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed instructions.

## 🗺️ Roadmap

### ✅ V1.x - Complete
- [x] MapLibre GL JS (free, no API key)
- [x] USGS Tectonic Plate Boundaries overlay
- [x] Live PNSN API integration
- [x] Temporal playback engine
- [x] Custom time range selection
- [x] Depth-based event coloring
- [x] Mobile responsive design
- [x] Docker deployment with GHCR
- [x] USGS earthquake charts with IndexedDB caching

### ✅ V2.x - Complete
- [x] Server-side TimescaleDB + PostGIS database
- [x] Backend API (Fastify + TypeScript)
- [x] Full historical earthquake data support
- [x] Admin UI for database seeding
- [x] Public/Admin separation for security
- [x] Automatic USGS sync (configurable schedule)

### 🔮 Future
- [ ] Multi-source support (EMSC planned)
- [ ] Cross-source duplicate detection
- [ ] User-selectable event color schemes
- [ ] Event clustering at low zoom levels
- [ ] URL state persistence
- [ ] Export/share functionality

## 🐛 Troubleshooting

### Map not displaying?
1. Check browser console for errors
2. Verify internet connection (basemap tiles need network access)
3. Try refreshing the page

### Events not loading?
1. Check internet connection
2. Verify PNSN API is accessible: https://tremorapi.pnsn.org
3. Check browser network tab for 5XX errors
4. Try different time range (API may timeout for large ranges)

### Performance issues?
1. Use smaller time ranges (Week instead of Year)
2. Close other browser tabs
3. Use "Show All Events" mode for static viewing
4. Clear browser cache

## 📄 License

MIT License

## 🙏 Acknowledgments

- **PNSN** - Pacific Northwest Seismic Network for tremor data API
- **USGS** - Earthquake Hazards Program for global earthquake data
- **MapLibre** - Open-source map library (fork of Mapbox GL JS)
- **Carto** - Free basemap tiles
- **React Team** - React 19 framework
- **Vite Team** - Lightning-fast build tool
