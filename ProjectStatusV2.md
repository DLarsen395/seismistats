# Project Status V2 - SeismiStats

**Date:** January 4, 2026  
**Version:** 2.0.0-alpha.2

## 🚀 V2 Backend Implementation (Functional)

### What's New in V2
V2 adds a server-side architecture with:
- **Fastify API Server** - TypeScript backend on port 3000
- **PostgreSQL + PostGIS** - Centralized earthquake database
- **USGS Sync Service** - Server fetches USGS data every 5 minutes
- **Real Chart Endpoints** - Database-backed aggregation queries
- **Frontend API Integration** - Toggle between V1 and V2 modes

### Architecture Change
- **V1**: Frontend → USGS API (direct, with IndexedDB cache)
- **V2**: Frontend → Fastify API → PostgreSQL ← USGS Sync

### Current Status (January 4, 2026)

✅ **Completed:**
- Full API skeleton with Fastify 5.x + TypeScript
- PostgreSQL + PostGIS database schema with Kysely migrations
- USGS sync service (5-minute intervals)
- Chart endpoints with real database queries:
  - `/api/charts/daily-counts` - Aggregated counts by day/week/month/year
  - `/api/charts/magnitude-distribution` - Counts by magnitude range
  - `/api/charts/energy-release` - Energy release calculations
- Earthquakes query endpoint with filtering
- Docker dev stack (docker-compose.dev.yml)
- TypeScript compiles cleanly
- **Frontend API service layer** (`src/services/api.ts`)
- **Chart data hook** (`src/components/Charts/useChartData.ts`)
- **Environment toggle** - `VITE_USE_API=true` to enable V2 mode

📋 **Pending:**
- Wire up useChartData hook in chart components
- Production Docker configuration
- Merge to main branch

### Docker Dev Stack

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Services:
# - seismistats-db (PostgreSQL + PostGIS) - port 5432
# - seismistats-api (Fastify) - port 3000
# - seismistats-frontend (Vite) - port 5173 (with VITE_USE_API=true)
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | API health check |
| `/api/earthquakes` | GET | Query earthquakes with filters |
| `/api/charts/daily-counts` | GET | Aggregated counts |
| `/api/charts/magnitude-distribution` | GET | By magnitude range |
| `/api/charts/energy-release` | GET | Energy calculations |

### Frontend Integration

Toggle between V1 (direct USGS) and V2 (API) modes:

```bash
# V1 Mode (default) - direct USGS API calls
VITE_USE_API=false

# V2 Mode - use backend API
VITE_USE_API=true
VITE_API_URL=http://localhost:3000
```

---

## 📦 Previous V1 Features (v1.2.9)

### Feature Summary
A new third chart showing cumulative seismic energy released per time period.

**Visualization:**
- **Orange Bars**: Total energy released per period (sum of all earthquakes)
- **Cyan Line + Dots**: Average energy per earthquake

**Energy Calculation:**
Uses the Gutenberg-Richter formula: `E = 10^(1.5M + 4.8)` joules
- A M5.0 releases ~31.6x more energy than M4.0
- A M6.0 releases ~1,000x more energy than M4.0
- This is the same formula used by USGS

**Features:**
- Time grouping selector (Day/Week/Month/Year)
- Smart SI prefix formatting (J, kJ, MJ, GJ, TJ, PJ, EJ)
- Dual Y-axes: Left for total energy, right for average energy
- Tooltip shows: total energy, avg energy, earthquake count, avg magnitude
- Legend for bar and line

### UI Improvements
- Tightened vertical spacing on all three charts
- Charts now fit on screen without scrolling (most cases)
- Reduced chart heights from 300px to 220-240px

### Files Added/Modified

1. **NEW: src/components/Charts/EnergyReleaseChart.tsx**
   - Complete new chart component using Recharts ComposedChart
   - Bars + Line overlay on same chart
   - Custom tooltip with energy stats

2. **MODIFIED: src/components/Charts/magnitudeDistributionUtils.ts**
   - Added `EnergyDataPoint` interface
   - Added `aggregateEnergyByTimePeriod()` function
   - Added `formatEnergy()` for human-readable values
   - Added `formatEnergyAxis()` for chart axis labels

3. **MODIFIED: src/components/Charts/EarthquakeChartsPage.tsx**
   - Import and render EnergyReleaseChart
   - Tightened padding and margins

4. **MODIFIED: src/components/Charts/MagnitudeDistributionChart.tsx**
   - Tightened padding and margins

---

## 🐛 Critical Bug Fixed: Data Truncation

### Root Cause Analysis

A **major data loss bug** was discovered and fixed. The app was only retrieving ~15% of expected earthquake data.

**Problem:**
- The `fetchStaleDays()` function grouped consecutive stale days into ranges for batch fetching
- For a 20-year query with all days stale, it would create ONE range covering all 20 years
- A single API call with limit=20,000 would be made for the entire range
- USGS has ~100-180k earthquakes/year for US M-2+, so only 20k of ~2.4M events were fetched

**Evidence:**
| Year | Expected (USGS Count API) | Received | % Retrieved |
|------|---------------------------|----------|-------------|
| 2011 | 91,081 | ~3,000 | 3.3% |
| 2020 | 186,523 | ~63,000 | 33% |
| 20yr Total | ~2.4 million | 359,470 | 15% |

**Fix Applied:**
- Added magnitude-aware range size limits to `fetchStaleDays()`:
  - M6+: 10 years max
  - M5+: 1 year max
  - M4+: 6 months max
  - M3+: 2 months max
  - M2+: 2 weeks max
  - M1+: 1 week max
  - M0+: 3 days max
  - M-2+: 1 day max

This matches the chunking strategy already used in `fetchInChunks()` and ensures no single API call exceeds the 20k limit.

## ✅ Code Quality Verification

### TypeScript Errors
```
✅ No errors found
```

### ESLint
```
✅ All issues fixed (4 setState-in-effect warnings resolved with requestAnimationFrame)
```

### Production Build
```
✅ Build successful (3.85s)
   - dist/index.html: 0.47 kB
   - dist/assets/index.css: 78.25 kB (gzip: 12.41 kB)
   - dist/assets/index.js: 1,873.13 kB (gzip: 537.93 kB)
```

## 📊 USGS Data Verification (Spot Checks)

Verified earthquake counts using USGS Count API:

### Continental US (M-2+)
| Year | Expected Count | Status |
|------|---------------|--------|
| 2006 | 49,576 | ✅ |
| 2008 | 66,564 | ✅ |
| 2010 | 82,118 | ✅ |
| 2012 | 63,042 | ✅ |
| 2014 | 73,979 | ✅ |
| 2016 | 65,133 | ✅ |
| 2018 | 63,060 | ✅ |
| 2020 | 112,834 | ✅ (Ridgecrest sequence) |
| 2022 | 65,788 | ✅ |
| 2024 | 75,376 | ✅ |

### All US Regions Combined (M-2+)
| Year | Continental | Alaska | Hawaii | PR/USVI | Guam | Total |
|------|------------|--------|--------|---------|------|-------|
| 2010 | 82,118 | 30,042 | 616 | 196 | 12 | 112,984 |
| 2020 | 112,834 | 53,501 | 8,026 | 12,112 | 50 | 186,523 |

### The 2020 Spike is Real
The significant increase in 2020 earthquake counts is legitimate:
- **2020 Ridgecrest aftershock sequence** (California)
- **2020 Kilauea activity** (Hawaii: 616 → 8,026)
- **2020 Puerto Rico earthquake sequence** (PR: 196 → 12,112)

## 🔧 Changes in This Update

### Files Modified

1. **src/stores/earthquakeStore.ts**
   - Fixed `fetchStaleDays()` to limit range sizes based on magnitude
   - Prevents 20k API limit truncation

2. **src/App.tsx**
   - Removed unused `AppView` import

3. **src/components/Charts/CacheProgressBanner.tsx**
   - Fixed setState-in-effect lint warning using requestAnimationFrame

4. **src/components/Charts/MagnitudeDistributionChart.tsx**
   - Fixed setState-in-effect lint warning using requestAnimationFrame

5. **src/components/Controls/DataRangeSelector.tsx**
   - Fixed setState-in-effect lint warning using requestAnimationFrame

### Previous Session Fixes (Already Committed)
- Progressive chart updates during cache fetch
- Cache incremental fetch (only fetch missing days)
- Reduced API request delays (50ms)
- Memory optimization for large datasets
- "By By Day" label duplicate fix

## ⚠️ Action Required

### Clear Existing Cache
The cached data is truncated and incomplete. Users must:
1. Open browser DevTools (F12)
2. Go to Application → IndexedDB
3. Delete `earthquake-cache` database
4. Refresh and re-fetch data

### Expected After Fix
After clearing cache and re-fetching 20 years of M-2+ US data:
- **Previous:** ~359,000 events
- **Expected:** ~2,000,000+ events

## 📋 Recommended Pre-Release Checklist

- [ ] Clear cache in development browser
- [ ] Test fresh fetch: 7 days M4+ US (should be ~100-300 events)
- [ ] Test fresh fetch: 30 days M-2+ US (should be ~15,000+ events)
- [ ] Verify progressive chart updates work
- [ ] Test cache expansion (30 days → 90 days, should only fetch 60 new days)
- [ ] Verify hover tooltips show correct magnitude breakdowns
- [ ] Check memory usage with large datasets (no crashes)
- [ ] Deploy to production

## 📋 Manual Test Checklist

### Energy Release Chart (v1.2.9)
- [ ] Chart appears below Magnitude Distribution chart
- [ ] Orange bars show total energy per period
- [ ] Cyan line connects dots showing average energy
- [ ] Time grouping buttons (Day/Week/Month/Year) work correctly
- [ ] Tooltip shows: Total Energy, Avg Energy, count, avg magnitude
- [ ] Y-axis labels use SI prefixes correctly (J, kJ, MJ, GJ, etc.)
- [ ] Chart scales correctly for different magnitude ranges (M4+ vs M-2+)
- [ ] Large earthquakes (M6+) should show significantly higher energy spikes

### UI Spacing
- [ ] All three charts fit on screen without excessive scrolling
- [ ] Charts are not uncomfortably tight
- [ ] Headers and grouping buttons properly aligned

### Previous Functionality
- [ ] Top chart (Earthquakes per Day/Week/Month/Year) still works
- [ ] Magnitude Distribution chart still works
- [ ] Cache stats panel shows correct information
- [ ] Progress banner shows event count during fetch

---

## 🏷️ Version History

### v1.2.9 (January 2, 2026)
- ✅ Seismic Energy Release Chart added
- ✅ Tightened chart spacing
- ✅ Live event count during fetch

### v1.2.8 (January 1, 2026)
- ✅ Critical data truncation bug fixed
- ✅ ESLint warnings fixed
- ✅ Progressive chart updates during fetch

## 📈 Performance Notes

With the fix applied, fetching 20 years of M-2+ data will require significantly more API calls:
- **Before:** 1 call (truncated to 20k)
- **After:** ~7,300 calls (1 per day for 20 years)

This is slower but **correct**. For faster initial loads, recommend:
- Default to M4+ (fewer events, larger chunks)
- Use shorter time ranges initially
- Let users expand ranges as needed

The cache system ensures subsequent queries are fast once data is cached.
