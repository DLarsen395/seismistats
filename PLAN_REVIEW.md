# ETS Events Visualization - Plan Review

## Project Summary
Building a Docker-deployable web application to visualize ETS (Episodic Tremor and Slip) seismic events from the Pacific Northwest, similar to the PNSN Tremor Viewer but with modern UI and enhanced playback features.

## User Requirements Captured

### Core Features
- ✅ Display GeoJSON events on interactive map
- ✅ Dark mode UI (included in v1)
- 🔄 Chronological "play" animation
- 📋 Configurable playback speed
- 📋 Configurable fade duration
- 📋 Date range filtering
- 📋 User-selectable event colors

### Technical Requirements
- ✅ React + TypeScript + Vite
- ✅ Mapbox GL JS for mapping
- ✅ Tailwind CSS with dark mode
- 📋 Docker Desktop development
- 📋 Docker Swarm deployment
- 📋 Nginx Proxy Manager compatible

## Design Decisions

### Why Mapbox GL?
- WebGL-powered for smooth 20k+ event rendering
- Excellent dark mode map styles
- Data-driven styling for dynamic colors
- Good TypeScript support

### Why Zustand?
- Lightweight (< 1kb)
- Simple API, no boilerplate
- Works great with React hooks
- Perfect for playback state

### Why Tailwind?
- Rapid UI development
- Built-in dark mode support
- Glassmorphism effects easy to implement
- Consistent design system

## Architecture Overview
```
┌─────────────────────────────────────────┐
│                  App                     │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────────────────┐  │
│  │ Header  │  │   Control Panel      │  │
│  └─────────┘  │  - Playback controls │  │
│               │  - Timeline          │  │
│  ┌─────────────────────────────────┐ │  │
│  │         Map Container           │ │  │
│  │  ┌─────────────────────────┐   │ │  │
│  │  │    Mapbox GL Canvas     │   │ │  │
│  │  │    (Event circles)      │   │ │  │
│  │  └─────────────────────────┘   │ │  │
│  └─────────────────────────────────┘ │  │
│               └──────────────────────┘  │
└─────────────────────────────────────────┘

State: Zustand Store
├── events[]
├── currentTime
├── isPlaying
├── playbackSpeed
├── fadeOutDuration
├── dateRange
└── colorScheme
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 20k events slow | Use Mapbox layers, not markers |
| Token security | Environment variables |
| Large GeoJSON | Static file in public/ |
| CSS conflicts | Tailwind scoping |

## Timeline Estimate
- Phase 1: Foundation - ✅ Complete
- Phase 2: Playback - 2-3 hours
- Phase 3: Controls UI - 2-3 hours  
- Phase 4: Polish - 1-2 hours
- Phase 5: Docker - 1-2 hours

**Total: ~8-12 hours for full MVP**

## Questions Resolved
- ✅ Dark mode: Yes, in v1
- ✅ Event colors: User-selectable (not just magnitude)
- ✅ Dev environment: Docker Desktop on WSL
- ✅ Production: Docker Swarm + Nginx Proxy Manager
- ✅ Map provider: Mapbox (user has token)
