# Changelog

All notable changes to the ETS Events Visualization project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.8] - 2025-12-31

### 📦 Docker Registry Integration

### Added
- **OCI Labels** - Added OpenContainers labels to Dockerfile for GitHub Container Registry linking:
  - `org.opencontainers.image.source` - Links package to source repository
  - `org.opencontainers.image.description` - Package description
  - `org.opencontainers.image.licenses` - License information

---

## [1.2.5] - 2025-11-30

### 🔧 Major Refactor - MapContainer Simplification

### Fixed
- **Plate Boundaries Disappearing** - Fixed critical bug where toggling plate boundaries multiple times caused them to disappear permanently
- **Basemap Switching** - Simplified style change handling to use `style.load` event instead of complex retry logic

### Changed
- **MapContainer Rewrite** - Completely simplified from 398 lines to 270 lines:
  - Removed complex `rebuildLayers` function with retry logic
  - Removed `useCallback` wrapper that was causing stale closures
  - Removed `isChangingStyle` ref that was blocking updates
  - Simplified layer addition to only add if source doesn't exist
- **Plate Boundaries Opacity** - Changed from 1.0 back to 0.8 for better visual balance
- **Bundle Size** - Reduced by ~1.5KB due to code simplification

### Removed
- Redundant retry logic for layer rebuilding
- Complex idle event handling with timeouts
- Duplicate event handlers being added on each rebuild

---

## [1.2.4] - 2025-11-30

### 🎯 Improvements

### Changed
- **Default Basemap** - Restored to Stadia Outdoors (domain now registered)
- **Plate Boundaries Layer** - Improved rendering:
  - Changed opacity from 0.7 to 1.0 for sharper lines
  - Set resampling to 'nearest' to reduce blur artifacts

---

## [1.2.3] - 2025-11-30

### 🐛 Bug Fix

### Fixed
- **Default Basemap** - Changed default from Stadia Outdoors to Carto Voyager
  - Stadia Maps requires domain registration for production use
  - Carto basemaps work without domain restrictions

---

## [1.2.2] - 2025-11-30

### 🐛 Bug Fix

### Fixed
- **Tile Error Handling** - USGS plate boundaries tile fetch errors no longer display as blocking error banner
- Non-critical map resource errors (tile fetches) are now logged as warnings instead of shown to users

---

## [1.2.1] - 2025-11-30

### 🔧 Time Range Improvements

### Changed
- **Default Time Range** - Changed "Last 48 Hours" back to "Last 24 Hours" for more relevant data
- Empty event results are handled gracefully - displays 0 events instead of workaround lookback

### Fixed
- Time range selector now properly reflects when no events exist for a period (can happen during quiet months)

---

## [1.2.0] - 2025-11-29

### 🗺️ Multiple Basemap Support & UI Improvements

Added basemap selector with 7 free map styles and consolidated right-side panel layout.

### Added
- **Basemap Selector** - Dropdown to choose from 7 free basemap styles:
  - Carto Voyager, Carto Dark Matter, Carto Positron
  - OSM Bright, Stadia Outdoors (default), Alidade Smooth, Alidade Smooth Dark
- **RightPanelLayout Component** - Unified layout for Tools, Controls, and Statistics panels
- **useIsShortScreen Hook** - Detects short screens for responsive accordion layout
- **Accordion Mode** - On screens < 650px height, panels collapse to save space

### Changed
- **Default Basemap** - Changed from Carto Dark to Stadia Outdoors for better terrain visibility
- **Consolidated Right Panels** - Tools, Mode/Speed controls, and Statistics now in single vertical layout
- **Map Style Config** - Moved to separate `src/config/mapStyles.ts` for cleaner imports
- **Robust Style Switching** - Uses `idle` event + retry logic for reliable layer rebuilding after basemap changes

### Removed
- **SideControls Component** - Replaced by RightPanelLayout
- **EventStats Component** - Integrated into RightPanelLayout
- **Stamen Terrain** - Removed due to DEM dimension mismatch errors
- **Satellite Option** - Removed (requires paid Stadia plan)

### Fixed
- **Layer Persistence** - Events and plate boundaries now persist correctly when switching basemaps
- **Style Change Timing** - Added retry logic for basemaps that report ready before fully loaded

---

## [1.1.0] - 2025-11-29

### 🗺️ MapLibre Migration - Free & Open Source Maps

Replaced Mapbox GL JS with MapLibre GL JS to eliminate API key requirements and costs.

### Added
- **Tectonic Plate Boundaries** - USGS plate boundary overlay from ArcGIS REST services
- **Plate Boundary Toggle** - UI control to show/hide plate boundaries layer
- **OpenFreeMap Integration** - Free basemap tiles, no API key required

### Changed
- **Map Library** - Migrated from Mapbox GL JS to MapLibre GL JS (open-source fork)
- **Basemap Style** - Using OpenFreeMap positron (light) or dark style
- **No API Key Required** - Removed Mapbox token dependency entirely
- **Improved Event Visibility** - Warm color scheme (orange→magenta) contrasts better with terrain

### Removed
- **Mapbox Dependency** - No longer requires Mapbox API token
- **Runtime Token Injection** - Removed config.js and docker-entrypoint.sh token handling

### Technical
- Replaced `mapbox-gl` npm package with `maplibre-gl`
- Updated TypeScript types from `@types/mapbox-gl` to `maplibre-gl` (includes own types)
- Layer API remains nearly identical (minimal code changes)

---

## [1.0.1] - 2025-01-28

### Fixed
- **React Hooks Violations** - Fixed refs being accessed during render in App.tsx
- **Unused Variables** - Removed unused `_currentTime` parameter
- **setState in Effects** - Refactored to use derived state instead of effect-based state updates
- **MapContainer Token Check** - Moved from effect to useMemo for proper React patterns

### Security
- **Nginx Headers** - Added `Referrer-Policy` and `Permissions-Policy` security headers
- **Runtime Token Injection** - Mapbox token now injected at container startup via environment variable, not bundled in JS build

### Added
- **docker-entrypoint.sh** - Entrypoint script for runtime token injection
- **Runtime Config Support** - `public/config.js` for runtime configuration

### Changed
- **Dockerfile** - No longer requires build-time token argument
- **docker-compose.ets-events.yml** - Now includes `MAPBOX_TOKEN` environment variable
- **Simplified Callback Interface** - `onFilteredEventsChange` no longer passes unused `currentTime`

### Documentation
- Updated README and DOCKER_DEPLOYMENT.md with runtime token instructions

---

## [1.0.0] - 2025-11-27

### 🎉 Initial Production Release

First stable release of the ETS Events Visualization application.

### Added

#### Core Features
- **Interactive Map Visualization** - Mapbox GL JS with custom dark theme centered on Cascadia Subduction Zone
- **Live Data Integration** - Real-time seismic events from PNSN Tremor API
- **Temporal Playback Engine** - Watch events unfold chronologically with smooth animations
- **Time Range Presets** - 24 hours, Week, Month, Year, or custom date range
- **Depth-Based Coloring** - Events colored by depth (25-45km, cyan→purple gradient)
- **Magnitude-Based Sizing** - Event markers sized by magnitude (0.4-1.6+)
- **Speed Controls** - Playback speeds from 0.1x to 10x
- **Timeline Scrubbing** - Click or drag to jump to any point in time
- **Range Brackets** - Draggable start/end points to focus on specific time windows

#### UI Components
- **Legend Panel** - Visual guide for depth colors and magnitude sizes
- **Statistics Panel** - Real-time stats (total events, magnitude range, average depth, date range)
- **Mode Toggle** - Switch between "Show All Events" and "Playback" modes
- **Data Range Selector** - Compact time range selection with custom date picker
- **Loading States** - Spinner overlay during data fetches
- **Error Handling** - User-friendly error messages with retry functionality

#### Mobile Support
- **Responsive Layout** - Optimized for phones and tablets (< 1024px)
- **Mobile Info Panel** - Collapsible accordion with all controls
- **Orientation Handling** - Proper detection of portrait and landscape modes
- **Touch Interactions** - Tap and swipe support for timeline
- **Mapbox Logo Preserved** - Proper z-indexing for attribution

#### Deployment
- **Docker Multi-Stage Build** - Node.js build → Nginx production image (~50MB)
- **GitHub Container Registry** - Published to `ghcr.io/dlarsen395/ets-events`
- **Docker Swarm Support** - Stateless, swarm-safe configuration
- **Nginx Proxy Manager Integration** - SSL termination and authentication via Access Lists
- **Health Check Endpoint** - `/health` endpoint for container orchestration

### Technical Stack
- React 19.0.0
- TypeScript 5.6.2
- Vite 7.2.4
- Mapbox GL JS 3.9.0
- Zustand 5.0.2
- Tailwind CSS 3.4.1
- Nginx Alpine (production)

### Performance
- Initial load: ~2s
- Playback: 60fps
- Memory usage: ~120MB (browser), ~10-20MB (container)
- Bundle size: ~380KB
- Supports 5,000+ events

---

## [Unreleased]

### Planned for v1.1.0
- User-selectable color schemes
- Keyboard shortcuts (Space = play/pause, arrows = scrub)
- Event details popup on click

### Planned for v2.0.0
- Event clustering at low zoom levels
- URL state persistence
- Export/share functionality
- Screenshot and CSV export

---

## How to Update

### Development
```bash
# Make changes
npm run dev

# Build and push
docker build -t ets-events:latest --build-arg "VITE_MAPBOX_TOKEN=your_token" .
docker tag ets-events:latest ghcr.io/dlarsen395/ets-events:latest
docker push ghcr.io/dlarsen395/ets-events:latest
```

### Production (Portainer)
1. Go to **Stacks** → **ets-events**
2. Click **Update** on the service
3. Check **Pull latest image**
4. Deploy

---

[1.0.0]: https://github.com/DLarsen395/ets-events/releases/tag/v1.0.0
[Unreleased]: https://github.com/DLarsen395/ets-events/compare/v1.0.0...HEAD
