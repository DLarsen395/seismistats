# Changelog

All notable changes to the SeismiStats Visualization project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-01-09

### 🔐 Production-Ready V2 Release

First stable V2 release with public/admin separation, proper environment file structure, and comprehensive documentation.

### Added
- **Public Mode** (frontend):
  - `VITE_PUBLIC_MODE=true` environment variable hides Admin tab
  - Redirect to Charts view if navigating to admin in public mode
  - Navigation order changed: Charts → Seismic Map → Admin
- **Admin Mode** (API):
  - `ADMIN_MODE=true` environment variable enables write operations
  - `requireAdminMode` middleware protects all sync/seed endpoints
  - Returns 403 with helpful message when admin ops attempted on public instance
- **Production Docker Compose**:
  - `docker-compose.v2.yml` - Public stack (read-only)
  - `docker-compose.v2.admin.yml` - Admin stack (internal only)
  - Separate networks for security isolation
- **Environment File Structure**:
  - `.env.v1.example` - Documents V1 needs no env vars
  - `.env.v2.example` - Template for V2 public stack
  - `.env.v2.admin.example` - Template for V2 admin stack
  - Local `.env.*.local` files are gitignored for credentials

### Changed
- **Default view** is now Earthquake Charts (was ETS Events)
- **"ETS Events"** renamed to **"Seismic Map"** with 🗺️ icon
- **Navigation order** reversed: Charts first, Map second
- Development compose now includes `ADMIN_MODE=true` by default
- Cleaned up legacy/unused environment files

### Fixed
- **API chart queries** now properly fill missing periods with zeros (like V1 mode)
- **Timezone bug** in date parsing - `parseLocalDate()` parses YYYY-MM-DD as local midnight
- **End date inclusive** - API queries for "Jan 6 to Jan 6" now include all of Jan 6
- **Sync to Present** button auto-detects days behind and fetches from newest event to today

### Security
- Protected endpoints (require `ADMIN_MODE=true`):
  - `POST /api/sync/trigger`
  - `POST /api/sync/seed`
  - `POST /api/sync/seed/cancel`
  - `POST /api/sync/verify`
  - `POST /api/sync/find-gaps`
- Removed legacy `.env` file containing old Mapbox token (unused - app uses MapLibre)

---

## [2.0.0-alpha.5] - 2026-01-05

### 🗄️ User-Controlled Database Seeding

New Admin page with full control over database seeding for users deploying SeismiStats.

### Added
- **Admin Page** (`/admin` view in navigation):
  - Database coverage display (date range, event counts by magnitude)
  - Seeding progress tracker with real-time updates
  - Cancel button for in-progress seeding
- **Seeding Controls**:
  - Date range presets (Last Month, 3 Months, 6 Months, 1 Year, 2 Years, 5 Years)
  - Custom date range inputs
  - Minimum magnitude slider (M-2 to M6)
  - Connection speed presets (Slow/Medium/Fast/Turbo)
- **Speed Presets** for different bandwidth scenarios:
  - Slow: 5s delay, 15-day chunks
  - Medium: 2s delay, 30-day chunks (default)
  - Fast: 1s delay, 45-day chunks
  - Turbo: 500ms delay, 60-day chunks
- **API Client Functions**:
  - `fetchDatabaseCoverage()` - Get current database state
  - `fetchSeedingProgress()` - Poll seeding progress
  - `startSeeding(options)` - Start seeding with custom options
  - `cancelSeeding()` - Cancel in-progress seeding

### Fixed
- **Charts showing ALL time periods** including those with zero earthquakes:
  - Added `generateAllPeriodKeys()` helper function that generates all period keys (day/week/month/year) in a date range
  - Updated `aggregateByTimePeriodAndMagnitude()` to fill all periods (was day-only)
  - Updated `aggregateByTimePeriod()` to accept optional `dateRange` parameter and fill all periods
  - Updated `aggregateEnergyByTimePeriod()` to fill all periods (was day-only)
  - M7+ earthquakes over 5 years by week now correctly shows ~260 weeks, not just weeks with data

### Design Philosophy
- Database ships empty (repository stays small)
- Users control when/how much data to seed
- Bandwidth-aware speed settings
- Progress saved on cancel - no data lost

---

## [2.0.0-alpha.4] - 2026-01-05

### 🔒 Security Hardening

Production-ready security measures and controlled database population.

### Added
- **Security Middleware**:
  - `@fastify/helmet` - Secure HTTP headers (CSP, HSTS, etc.)
  - `@fastify/rate-limit` - Request throttling (100/min general, 5/5-min sync)
  - Explicit body limit (100KB) to prevent large payload attacks
- **Production Environment Validation** - API fails fast if missing required env vars
- **Database Seeding Service** (`api/src/services/seeding.ts`):
  - Chunked fetching (30-day chunks by default)
  - 2-second delay between USGS API requests
  - Progress tracking with event counts
  - Cancellation support
- **Seeding API Endpoints**:
  - `POST /api/sync/seed` - Start controlled seeding with date range
  - `GET /api/sync/seed/progress` - Check seeding progress
  - `POST /api/sync/seed/cancel` - Cancel in-progress seeding
  - `GET /api/sync/coverage` - View database date coverage
- **Summary Statistics Endpoint** (`GET /api/charts/summary`):
  - Total events, avg/max/min magnitude
  - Significant events (M5+), Major events (M6+)
  - Events per day rate, largest event details
- **Frontend Summary Stats** - EarthquakeSummary displays V2 API statistics

### Changed
- CORS origin now parsed from comma-separated env var
- Rate limits configurable via environment variables
- EarthquakeSummary component completely rewritten for V2 mode

### Security Notes
- Seeding endpoint has aggressive rate limit (1 request/minute)
- Sync endpoints have reduced rate limit (5 requests/5 minutes)
- Production mode requires `DATABASE_URL` and `CORS_ORIGIN` env vars

---

## [2.0.0-alpha.3] - 2026-01-05

### 🔗 Chart Components V2 Integration

Chart components now support both V1 (client-side aggregation) and V2 (server-side aggregation) modes.

### Added
- **Chart V2 Props** - Updated MagnitudeDistributionChart and EnergyReleaseChart:
  - `earthquakes` now optional (V1 mode)
  - New `aggregatedData` prop for pre-aggregated API data (V2 mode)
  - New `timeGrouping` prop for external grouping control (V2 mode)
  - New `onTimeGroupingChange` callback for synced grouping (V2 mode)
- **EarthquakeChartsPage V2 Support**:
  - Integrates `useChartData` hook for API mode
  - Single shared `chartGrouping` state for all charts (efficiency)
  - Auto-detects V2 mode via `useIsApiMode()` hook
  - Passes aggregated data to charts when API mode enabled
- **V2 Mode Indicator** - Green dot in "About This Data" panel shows "V2 Mode (Server API)"
- **Server Database Panel** - Shows "Data is served from the SeismiStats API server" in V2 mode
- **Consolidated Time Grouping** - Single "Group By" dropdown in filter panel for V2 mode
- **V2-Aware Sidebar** - EarthquakeSummary and CacheStatusPanel show appropriate messages

### Changed
- Chart components internally detect mode based on which props are provided
- Internal time grouping state used in V1 mode, external control in V2 mode
- Top bar chart now uses `chartData.dailyCounts` in V2 mode
- Auto-refresh disabled in V2 mode (server handles data freshness)
- Per-chart time grouping buttons hidden in V2 mode (use filter panel instead)

### Fixed
- **60-Second Chart Delay** - Disabled `useAutoRefresh` hook in V2 mode that was causing V1 fetch attempts
- **Infinite Re-render Loop** - Memoized `dateRange` calculation to prevent new Date objects on every render
- **Unstable useCallback Dependencies** - Changed `useChartData` to use string dates instead of Date objects for stable comparison
- **ChartFilters Syntax Error** - Removed duplicate JSX closing tags

### How V2 Mode Works
Set `VITE_USE_API=true` in environment (already set in docker-compose.dev.yml):
1. EarthquakeChartsPage detects API mode via `useIsApiMode()`
2. `useChartData` hook fetches aggregated data from `/api/charts/*` endpoints
3. Charts receive `aggregatedData` prop and skip client-side aggregation
4. Single grouping state shared across all charts for efficiency
5. Auto-refresh disabled - server handles data freshness via USGS sync

---

## [2.0.0-alpha.2] - 2026-01-04

### 🚀 V2 API Server (Functional)

Server-side backend with PostgreSQL + PostGIS for centralized earthquake data storage.

### Added
- **API Server** (`/api`) - Fastify 5.x + TypeScript backend
  - `/api/charts/daily-counts` - Aggregated earthquake counts (day/week/month/year)
  - `/api/charts/magnitude-distribution` - Counts by magnitude range
  - `/api/charts/energy-release` - Seismic energy calculations
  - `/api/earthquakes` - Filtered earthquake queries with pagination
  - `/health` - Health check endpoint
- **Database** - PostgreSQL 16 + PostGIS schema
  - Full earthquake table with geospatial support
  - Kysely migrations for schema management
  - PostGIS `ST_Within` for bounding box queries
- **USGS Sync Service** - Background data synchronization
  - Runs every 5 minutes automatically
  - Fetches last 7 days from USGS on startup
  - Deduplication by source_event_id
- **Docker Dev Stack** - Full `docker-compose.dev.yml` with:
  - PostgreSQL + PostGIS database container (port 5432)
  - API server with hot-reload (port 3000)
  - Frontend with Vite hot-reload (port 5173)
  - All services with health checks
- **Vite CI Mode** - `cross-env CI=true` disables interactive prompts permanently
- **Frontend API Layer** - New `src/services/api.ts` for V2 backend integration
  - Typed API client functions for all endpoints
  - `USE_API` toggle via `VITE_USE_API=true` environment variable
  - Automatic conversion between API and USGS feature formats
- **Chart Data Hook** - New `useChartData.ts` hook
  - Supports both V1 (direct USGS) and V2 (API) modes
  - Seamless switching via environment variable
- **Environment Configuration**
  - `.env.example` with frontend configuration
  - `VITE_USE_API` to toggle V2 mode
  - `VITE_API_URL` for API endpoint configuration

### Changed
- Dev script now uses `cross-env CI=true vite --host` to prevent terminal blocking
- Chart SQL uses PostgreSQL `date_trunc()` instead of TimescaleDB `time_bucket()`
- Docker dev frontend now has `VITE_USE_API=true` enabled by default

### Technical Details
- **Kysely** for type-safe SQL queries
- **TypeBox** for request validation
- All TypeScript errors resolved

---

## [2.0.0-alpha.1] - 2026-01-04

### 🎨 SeismiStats Rebrand

This release rebrands the project from "ETS Events" to "SeismiStats" to better reflect the broader scope of seismic data visualization.

### Changed
- **Project Name** - Renamed from "ETS Events" to "SeismiStats"
- **Repository** - Now at `github.com/DLarsen395/seismistats`
- **Container Registry** - Now at `ghcr.io/dlarsen395/seismistats`
- **Docker Stack** - Service name changed to `seismistats`
- **Documentation** - Updated all docs with new branding

### Notes
- ETS (Episodic Tremor and Slip) references in scientific contexts remain unchanged
- Production URL migrated from `ets.home.hushrush.com` to `seismistats.home.hushrush.com`

---

## [1.2.9] - 2026-01-04

### 🎉 Release Version - Earthquake Charts Feature Complete

This release consolidates versions 1.2.10 through 1.2.18 into a stable release. The Earthquake Charts feature is fully functional with intelligent caching, auto-refresh, and comprehensive visualizations.

### Features
- **Three Chart Types**
  - Earthquakes by Year/Month/Week/Day - Bar chart with event counts
  - Magnitude Distribution Over Time - Stacked area chart with toggleable ranges
  - Seismic Energy Released - Log-scale bars with average magnitude line

- **Intelligent Caching System**
  - IndexedDB-based caching with 28-day historical/recent split
  - Progressive fetch with visual progress indicator
  - Cache status panel with clear/reset controls
  - ~55MB storage for full historical data

- **Auto-Refresh System**
  - Configurable intervals (1, 5, 15, 30, 60 minutes)
  - Smart top-off fetching (only new events since last known)
  - Visual indicators during refresh
  - Pauses during manual fetches

- **Filter Panel (Pinned)**
  - Time Range: Last 7 days to Last 5 years
  - Min/Max Magnitude filters
  - Region selector (Global, US, Pacific, etc.)
  - Stays fixed while charts scroll

### Bug Fixes (from development versions)
- Fixed timezone bugs in chart X-axis date labels
- Fixed charts 2 & 3 not filtering by magnitude
- Fixed blank screen crash from null avgMagnitude
- Fixed average magnitude line gaps
- Fixed accessibility warnings on form elements
- Client-side filtering optimization (no re-fetch on narrower filters)

### Known Issues
- **Auto-Refresh During Long Fetches** - Auto-refresh should pause during manual fetches but may interfere with very long operations (Last 5 Years). Users should disable auto-refresh when loading large date ranges.
- **API Rate Limiting** - Very large date ranges may encounter USGS rate limiting; reduce time range if errors occur.

### Technical Notes
- Removed Chart.js dependency (Recharts only)
- Bundle size: ~380KB
- Supports 290,000+ earthquake events

---

## [1.2.18] - 2026-01-03

### 🐛 Critical Fix - Charts 2 & 3 Missing Today's Date

### Fixed
- **Jan 3 Not Showing on Charts 2 & 3** - Root cause: timezone bug in `getDateFromPeriodKey()`
  - `new Date("2026-01-03")` parses as UTC midnight = Jan 2 @ 4pm PST
  - When formatting labels, it showed "Jan 2" instead of "Jan 3"
  - Fixed by parsing YYYY-MM-DD as local time: `new Date(year, month-1, day)`
  - Debug logging confirmed data WAS filled (8 days) but displayed wrong dates

### Technical Details
The fill logic created period keys using local time ("2026-01-03"), but
`getDateFromPeriodKey()` converted them back using `new Date(key)` which
interprets ISO date strings as UTC. The fix parses the components to create
local midnight instead.

## [1.2.17] - 2026-01-03

### 🐛 Critical Bug Fix - Charts 2 & 3 Data Flow

### Fixed
- **Charts 2 & 3 Not Filtering by Magnitude** - Root cause identified and fixed
  - Problem: Charts 2 & 3 received raw `earthquakes` array from store (never filtered)
  - Chart 1 worked because it used `dailyAggregates` which was filtered in store
  - Solution: Added `filteredEarthquakes` memoized computation in EarthquakeChartsPage
  - Charts 2 & 3 now receive properly filtered data matching the magnitude filter
- **Charts 2 & 3 Date Filling** - Now receive same dateRange as Chart 1
  - All charts now use consistent date range ending on current day
  - fillMissingDays logic applies correctly to filtered data

### Technical Details
The store's client-side filtering optimization updated `dailyAggregates` but kept
the full `earthquakes` array for re-filtering capability. Charts 2 & 3 were using
the unfiltered array directly. Fix adds filtering at the presentation layer.

## [1.2.16] - 2026-01-03

### 🐛 Bug Fixes

### Fixed
- **Charts 2 & 3 Missing Jan 3 Column** - Fixed timezone bug in date aggregation
  - Root cause: `getPeriodKey()` used `toISOString()` which returns UTC date
  - This caused earthquakes to be grouped into the wrong local day
  - Now uses local date components consistent with the fill-missing-days logic
- **Avg Magnitude Line Gaps** - Line now connects through days with no earthquakes
  - Added `connectNulls={true}` to the Line component
  - Line is continuous for visual clarity while still not showing dots on empty days
- **Unnecessary Refetching on Magnitude Filter Change** - Now filters client-side when possible
  - When switching from M4+ to M7+ (subset of existing data), no API call needed
  - Tracks loaded data's magnitude range to enable smart filtering
  - Only fetches when new filter requires data outside currently loaded range

## [1.2.15] - 2026-01-03

### 🐛 Critical Bug Fix

### Fixed
- **Blank Screen Crash** - Fixed JavaScript crash causing app to go blank
  - Root cause: `avgMagnitude` was typed as `number` but code used `null as unknown as number`
  - Calling `.toFixed(1)` on `null` crashed React rendering
  - Properly typed `avgMagnitude` as `number | null` in `EnergyDataPoint` interface
  - Tooltip now conditionally renders avg magnitude section only when data exists
  - Stats calculation properly filters out null values before weighted average

## [1.2.14] - 2026-01-03

### 🐛 Bug Fixes and Accessibility Improvements

### Fixed
- **Avg Magnitude Line Gaps** - Fixed broken line in Energy Release chart
  - Root cause: Division by zero when no earthquakes on a day
  - `avgMagnitude` now returns `null` for empty days, allowing chart to show proper gaps
- **"Last Auto-Refresh: Never"** - Now updates timestamp after any data fetch
  - Previously only updated during auto-refresh cycles
  - Now shows correct time after initial page load
- **Accessibility Warnings** - Added proper attributes to form elements
  - Select elements now have `id`, `name`, and `title` attributes
  - Labels properly linked with `htmlFor` attribute
  - Fixed 4 accessibility errors and 10 warnings

### Removed
- Debug console logging (was temporary for troubleshooting)

## [1.2.13] - 2026-01-03

### 🐛 Fixed Chart X-Axis Date Label Timezone Bug

Fixed a critical timezone bug where chart X-axis date labels were showing the wrong date (one day earlier).

### Fixed
- **Chart Date Labels Off By One Day** - Fixed timezone parsing issue in `RechartsBarChart.tsx`
  - Root cause: `new Date("2026-01-01")` was interpreted as UTC midnight
  - In US timezones (e.g., PST UTC-8), this displayed as Dec 31 at 4:00 PM
  - Fix: Parse YYYY-MM-DD dates as local midnight instead of UTC midnight
  - Chart bars now correctly align with their labeled dates

## [1.2.12] - 2026-01-02

### 🔄 Auto-Refresh for Real-Time Earthquake Updates

New auto-refresh system that periodically checks for new earthquakes, ensuring researchers always have the latest data during active research sessions.

### Added
- **Auto-Refresh System** - Automatically fetches new earthquakes at configurable intervals
  - ON by default, toggle in Cache panel to enable/disable
  - Selectable intervals: 1, 5, 15, 30, or 60 minutes
  - Shows last auto-refresh timestamp
  - Settings persist in localStorage across sessions

- **Smart Top-Off Fetching** - Efficient incremental updates
  - Only fetches events since the most recent known earthquake
  - Typically completes in under 1 second
  - Automatically pauses during manual fetches to avoid conflicts
  - Smart gap detection handles various scenarios:
    - Gap < interval: Skip (too soon)
    - Gap < 24 hours: Quick top-off fetch
    - Gap < 28 days: Normal refresh (cache handles optimization)
    - Gap >= 28 days: Full refresh (historical boundary crossed)

- **Visual Indicators** - Clear feedback on auto-refresh activity
  - Spinning refresh icon (blue) on right side of filter panel during fetch
  - Pulsing earthquake icon (orange) when new events found
  - Pulses 3 times (1s fade in, 1s fade out) then disappears
  - No indicator if no new events found

- **`useAutoRefresh` Hook** - Reusable timer management
  - Manages interval timer with proper cleanup
  - Only active on Charts page (not Map page)
  - Handles page activation/deactivation
  - Callbacks for refresh lifecycle events

- **`topOffRecentEvents` Store Action** - Efficient data merging
  - Finds newest event timestamp in current data
  - Fetches only from that point to now
  - Deduplicates and merges with existing data
  - Updates cache and refreshes stats

### Changed
- **Cache Status Panel** - Now includes auto-refresh controls
  - Auto-Refresh section with ON/OFF toggle
  - Interval selector buttons (1, 5, 15, 30, 60 min)
  - Last auto-refresh timestamp display

---

## [1.2.11] - 2026-01-02

### 🧹 Code Cleanup - Chart.js Removal

Simplified the codebase by removing Chart.js and standardizing on Recharts as the sole chart library.

### Removed
- **Chart.js Integration** - Removed entire Chart.js implementation
  - Deleted `ChartJSBarChart.tsx` component
  - Removed `chartLibrary` toggle from filter panel UI
  - Removed `chartLibrary` state and `setChartLibrary` action from Zustand store
  - Removed `ChartLibrary` type definition
  - Uninstalled `chart.js` and `react-chartjs-2` npm packages

### Changed
- **Chart Rendering** - All charts now use Recharts exclusively
  - Simplified EarthquakeChartsPage to render Recharts directly (no conditional)
  - Cleaner, more maintainable codebase

### Fixed
- **Progress Bar Step Display** - Restored "Step X of Y" display during multi-chunk fetches
- **Refresh Button Location** - Moved from "Earthquakes By" panel to Cache panel (where it belongs)
- **Progress Bar Layout Jumping** - Fixed stats (events, %, seconds) jumping left/right by adding fixed widths
- **Recharts Console Warning** - Added minWidth/minHeight to ResponsiveContainer to fix width/height warning

### Technical Notes
- Reduced bundle size by removing Chart.js dependencies
- Streamlined state management (fewer store properties)
- All three charts (Bar, Magnitude Distribution, Energy Release) continue to work with Recharts

---

## [1.2.10] - 2026-01-02

### 🎨 UI/UX Improvements

Major layout, alignment, and user experience improvements to the Earthquake Charts view.

### Added
- **Pinned Filter Panel** - Time Range and filter controls now stay fixed at top while charts scroll
  - Ensures filters are always visible regardless of scroll position
  - Fetch progress bar moved inside filters panel (appears at bottom when fetching)
  - Cleaner separation between controls and scrollable chart content

### Changed
- **Chart Column Alignment** - All three charts now align horizontally
  - Unified right margin (15px) across all charts
  - Removed "Avg Mag" axis label from Energy chart to reduce width
  - Simplified right Y-axis ticks on Energy chart
- **Increased Chart Heights** - All charts now 280px (up from 240-260px)
  - Better variance visibility in the data
  - More vertical space for bar/line details
- **Energy Chart Button Color** - Changed from orange to blue for consistency with other charts
- **Energy Chart Legend Color** - Fixed missing legend color (was black, now shows orange)
- **Cache "Last Updated" Display** - Now properly shows timestamp after data fetch
  - Added `refreshInfo()` call on panel mount
  - Added cache info refresh after successful data fetch

### Fixed
- **Tooltip Z-Index** - Magnitude Distribution chart tooltip now appears above legend
  - Added `wrapperStyle={{ zIndex: 1000 }}` to Tooltip component
- **Scrollbar Styling** - Dark themed scrollbars throughout the app
- **Navigation Toggle** - Redesigned as compact pill-style toggle
- **Grammar Fix** - "Earthquakes per By Day" → "Earthquakes by Day"

---

## [1.2.9] - 2025-01-02

### 🔋 Seismic Energy Release Chart

New visualization showing cumulative seismic energy released over time.

### Added
- **Energy Release Chart** - Third chart showing seismic energy per time period
  - Bars show total energy released per period (day/week/month/year)
  - Cyan line with dots shows average energy per earthquake
  - Uses scientific Gutenberg-Richter formula: E = 10^(1.5M + 4.8) joules
  - Smart SI prefix formatting (J, kJ, MJ, GJ, TJ, PJ, EJ)
  - Tooltip shows total energy, average energy, count, and avg magnitude
  - Time grouping selector syncs with date range selection
- **Energy Utility Functions** - New aggregation and formatting functions
  - `aggregateEnergyByTimePeriod()` - Calculates energy stats per period
  - `formatEnergy()` - Human-readable energy with SI prefixes
  - `formatEnergyAxis()` - Shortened axis labels

### Changed
- **Tightened Chart Spacing** - Reduced vertical padding on all three charts
  - Charts now fit better on screen without scrolling
  - Reduced header margins, font sizes slightly smaller
  - Chart heights reduced from 300px to 220-240px

### Fixed
- **Live Event Count During Fetch** - Progress banner now shows live event count
  - Previously cache stats didn't update until fetch completed
  - Now shows "X events" in green as data streams in

---

## [1.3.0] - 2025-01-02

### 🌍 Earthquake Charts Enhanced

Major improvements to the Earthquake Charts feature including API robustness, new filters, visualization enhancements, and intelligent caching.

### Added
- **Max Magnitude Filter** - Added upper bound magnitude filter (M0 to M9+)
  - Works alongside existing Min Magnitude filter for precise range selection
  - Default changed to M4+ to M9+ for more relevant data
- **Magnitude Distribution Chart** - New stacked area chart showing earthquake counts by magnitude range over time
  - Configurable time grouping: By Week, By Month, By Year
  - Toggle individual magnitude ranges on/off
  - Quick selection buttons: All, None, M4+
  - Custom tooltip showing breakdown by magnitude
- **Dynamic Bar Width** - Charts now automatically adjust bar thickness based on data density
  - Thinner bars for larger date ranges (365 days = 3-4px bars)
  - Wider bars for smaller date ranges (7 days = 40-60px bars)
- **Chunked API Fetching** - Robust fetching for large date ranges to avoid USGS API limits
  - Adaptive chunk sizes based on magnitude filter (M5+ = 365 days/chunk, M2+ = 30 days/chunk)
  - 300ms delay between chunks to respect rate limits
  - Automatic deduplication of events across chunk boundaries
- **IndexedDB Cache System** - Intelligent caching for earthquake data
  - Historical data (>4 weeks old) cached permanently
  - Recent data (<4 weeks old) has 24-hour freshness window
  - Automatic cache hit/miss detection per day
  - Cache Status Panel showing statistics (total events, size estimate, stale days)
  - Cache Progress Banner showing real-time fetching/caching progress
  - Manual cache management (Clear All, Clear Stale)
  - Toggle to enable/disable caching

### Changed
- **Default Time Range** - Changed from 30 days to 7 days for faster initial load
- **Default Min Magnitude** - Changed from "All Magnitudes" to M4+ for more relevant data
- **Extended Magnitude Range** - Min magnitude now supports -2 to 9 (earthquakes can have negative magnitudes)

### Fixed
- **Last Year API Error** - Fixed "Request failed" error when selecting 365-day time range
  - Previously failed when USGS API returned 20000+ events
  - Now uses chunked fetching to handle large result sets

---

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
- **docker-compose.seismistats.yml** - Now includes `MAPBOX_TOKEN` environment variable
- **Simplified Callback Interface** - `onFilteredEventsChange` no longer passes unused `currentTime`

### Documentation
- Updated README and DOCKER_DEPLOYMENT.md with runtime token instructions

---

## [1.0.0] - 2025-11-27

### 🎉 Initial Production Release

First stable release of the SeismiStats Visualization application.

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
- **GitHub Container Registry** - Published to `ghcr.io/dlarsen395/seismistats`
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

### Planned for v2.1.0
- User-selectable color schemes
- Keyboard shortcuts (Space = play/pause, arrows = scrub)
- Event details popup on click

### Planned for v3.0.0
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
docker build -t seismistats:latest --build-arg "VITE_MAPBOX_TOKEN=your_token" .
docker tag seismistats:latest ghcr.io/dlarsen395/seismistats:latest
docker push ghcr.io/dlarsen395/seismistats:latest
```

### Production (Portainer)
1. Go to **Stacks** → **seismistats**
2. Click **Update** on the service
3. Check **Pull latest image**
4. Deploy

---

[2.0.0-alpha.1]: https://github.com/DLarsen395/seismistats/releases/tag/v2.0.0-alpha.1
[1.0.0]: https://github.com/DLarsen395/seismistats/releases/tag/v1.0.0
[Unreleased]: https://github.com/DLarsen395/seismistats/compare/v2.0.0-alpha.1...HEAD
