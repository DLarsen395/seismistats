# ETS Events Visualization - Implementation Plan

## Overview
A React + TypeScript + Vite application for visualizing Pacific Northwest ETS (Episodic Tremor and Slip) seismic events with temporal playback capabilities.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Map**: Mapbox GL JS
- **State Management**: Zustand
- **Styling**: Tailwind CSS (dark mode)
- **Date Utilities**: date-fns
- **Deployment**: Docker (multi-stage build)

## Phase 1: Foundation ✅
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Tailwind CSS configuration with dark mode
- [x] Mapbox GL integration
- [x] Load and display GeoJSON events
- [x] Basic event markers with magnitude-based styling
- [x] Click popups with event details

## Phase 2: Playback Engine (Current)
- [ ] Zustand store for playback state
- [ ] Temporal filtering of events
- [ ] Play/Pause functionality
- [ ] Speed control (0.5x, 1x, 2x, 5x, 10x)
- [ ] Current time display
- [ ] Event fade-out animation

## Phase 3: Controls & UI
- [ ] Glassmorphism control panel
- [ ] Timeline scrubber
- [ ] Date range picker with presets
- [ ] Speed selector
- [ ] Fade duration control
- [ ] Dark mode toggle

## Phase 4: Advanced Features
- [ ] User-selectable color schemes
- [ ] Event clustering at low zoom
- [ ] Statistics panel
- [ ] Export/share functionality

## Phase 5: Docker & Deployment
- [ ] Dockerfile (multi-stage build)
- [ ] docker-compose.dev.yml
- [ ] docker-stack.yml for Swarm
- [ ] Nginx configuration
- [ ] Environment variable handling

## Data Structure
```typescript
interface ETSEventProperties {
  depth: number;      // km
  duration: number;   // seconds
  energy: number;     // relative units
  id: number;
  magnitude: number;  // 0.4 - 1.9 range
  num_stas: number;   // detecting stations
  time: string;       // ISO timestamp
}
```

## File Structure
```
src/
├── components/
│   ├── Map/
│   │   └── MapContainer.tsx
│   ├── Controls/
│   │   ├── PlaybackControls.tsx
│   │   ├── TimelineSlider.tsx
│   │   └── SettingsPanel.tsx
│   └── UI/
│       └── GlassPanel.tsx
├── hooks/
│   ├── useEventData.ts
│   └── usePlayback.ts
├── stores/
│   └── playbackStore.ts
├── types/
│   └── event.ts
├── utils/
│   └── dateUtils.ts
├── App.tsx
└── index.css
```
