# GitHub Copilot Instructions for ETS Events Visualization Project

This is a React + TypeScript + Vite application for visualizing ETS seismic events with temporal playback.

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