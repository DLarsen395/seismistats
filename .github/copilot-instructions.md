# GitHub Copilot Instructions for ETS Events Visualization Project

## Project Context

This is a React + TypeScript + Vite application for visualizing Episodic Tremor and Slip (ETS) seismic events on an interactive map with temporal playback capabilities. The application is designed to be deployed as a Docker container.

## Code Style & Standards

### TypeScript
- Use strict TypeScript configuration
- Define explicit types for all function parameters and return values
- Use interfaces for GeoJSON data structures
- Prefer `type` for union types and simple object shapes
- Use `interface` for object types that may be extended
- Enable `strictNullChecks` and handle null/undefined explicitly

### React
- Use functional components with hooks (no class components)
- Prefer composition over inheritance
- Keep components small and focused (< 200 lines)
- Use custom hooks for reusable logic
- Implement proper cleanup in `useEffect`
- Use React.memo for expensive components
- Prefer named exports over default exports for components

### File Naming
- Components: PascalCase (e.g., `EventMap.tsx`, `PlaybackControls.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useEventPlayback.ts`)
- Utils: camelCase (e.g., `timeUtils.ts`, `eventParser.ts`)
- Types: PascalCase (e.g., `ETSEvent.ts`, `MapState.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAP_DEFAULTS.ts`)

### Code Organization
```typescript
// 1. Imports (grouped: external, internal, types, styles)
import React, { useState, useEffect } from 'react';
import { Map } from 'mapbox-gl';

import { EventMarker } from '@/components/Map';
import { useEventStore } from '@/stores/eventStore';

import type { ETSEvent } from '@/types/event';

import './EventMap.css';

// 2. Types/Interfaces
interface EventMapProps {
  events: ETSEvent[];
  onEventClick: (event: ETSEvent) => void;
}

// 3. Constants
const DEFAULT_ZOOM = 7;
const MAP_CENTER = [-123.0, 47.0];

// 4. Component
export const EventMap: React.FC<EventMapProps> = ({ events, onEventClick }) => {
  // ... implementation
};
```

### State Management (Zustand)
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface EventStore {
  // State
  events: ETSEvent[];
  filteredEvents: ETSEvent[];
  
  // Actions
  setEvents: (events: ETSEvent[]) => void;
  filterEvents: (filters: EventFilters) => void;
}

export const useEventStore = create<EventStore>()(
  devtools((set, get) => ({
    events: [],
    filteredEvents: [],
    
    setEvents: (events) => set({ events, filteredEvents: events }),
    filterEvents: (filters) => {
      const { events } = get();
      const filtered = applyFilters(events, filters);
      set({ filteredEvents: filtered });
    },
  }))
);
```

## GeoJSON Data Structure

When working with event data, use these type definitions:

```typescript
interface ETSEventProperties {
  depth: number;          // km
  duration: number;       // seconds
  energy: number;        
  id: number;
  magnitude: number;
  num_stas: number;      // number of stations
  time: string;          // ISO timestamp string
}

interface ETSEvent {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: ETSEventProperties;
}

interface ETSEventCollection {
  type: 'FeatureCollection';
  features: ETSEvent[];
}
```

## Mapbox GL JS Integration

### Map Initialization
```typescript
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-123.0, 47.0],
  zoom: 7,
});
```

### Adding Event Markers
- Use GeoJSON sources for better performance
- Implement clustering for non-playback mode
- Use circle layers with data-driven styling
- Clean up sources/layers on unmount

### Playback Animation
- Use `requestAnimationFrame` for smooth animations
- Update marker opacity for fade effect
- Remove markers after fade completion
- Pause animation when window is not focused

## Performance Best Practices

1. **Event Data Loading**
   ```typescript
   // Load data once and memoize
   const events = useMemo(() => parseGeoJSON(data), [data]);
   ```

2. **Map Event Handlers**
   ```typescript
   // Debounce/throttle expensive operations
   const handleMapMove = useMemo(
     () => debounce(() => updateVisibleEvents(), 100),
     []
   );
   ```

3. **Event Filtering**
   ```typescript
   // Use Web Workers for heavy filtering
   const filterWorker = new Worker('./filterWorker.ts');
   ```

4. **Marker Rendering**
   - Reuse marker instances
   - Use object pooling for frequent add/remove
   - Implement virtual scrolling for event lists

## Styling with Tailwind

Use Tailwind utility classes consistently:

```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <button className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 
                     transition-colors duration-200 disabled:opacity-50">
    Play
  </button>
</div>
```

## Testing Approach

### Unit Tests (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { parseEventTime, calculateFadeOpacity } from './timeUtils';

describe('timeUtils', () => {
  it('should parse event time correctly', () => {
    const time = parseEventTime('Sat, 02 Aug 2025 08:17:30 GMT');
    expect(time).toBeInstanceOf(Date);
  });
});
```

### Component Tests (Testing Library)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from './PlaybackControls';

it('should toggle playback on button click', () => {
  render(<PlaybackControls />);
  const button = screen.getByRole('button', { name: /play/i });
  fireEvent.click(button);
  expect(button).toHaveTextContent('Pause');
});
```

## Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await fetch('/ETS_events.json');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  setEvents(data.features);
} catch (error) {
  console.error('Failed to load events:', error);
  setError('Unable to load event data. Please try again later.');
}
```

## Accessibility

- Use semantic HTML elements
- Provide ARIA labels for interactive elements
- Ensure keyboard navigation works for all controls
- Use appropriate color contrast ratios
- Add alt text for any images/icons

```typescript
<button
  aria-label="Play events"
  aria-pressed={isPlaying}
  onClick={handlePlay}
>
  <PlayIcon aria-hidden="true" />
</button>
```

## Environment Variables

Access environment variables via Vite:

```typescript
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Add type definitions in vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string;
}
```

## Docker Considerations

When writing code, remember:
- Assets should be in `/public` for proper serving
- Use environment variables for runtime configuration
- Don't hardcode API URLs
- Handle different base paths if needed

## Git Commit Messages

Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` code restructuring
- `test:` adding tests
- `chore:` maintenance

Example: `feat: add event filtering by magnitude range`

## When Suggesting Code

1. Provide complete, working examples
2. Include proper TypeScript types
3. Add comments for complex logic
4. Consider edge cases
5. Follow the established patterns in the project
6. Suggest performance optimizations when relevant
7. Include error handling
8. Write accessible, semantic HTML

## Common Patterns

### Custom Hook Example
```typescript
export const useEventPlayback = (events: ETSEvent[]) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed, events.length]);

  return {
    currentIndex,
    isPlaying,
    speed,
    setIsPlaying,
    setSpeed,
    reset: () => setCurrentIndex(0),
  };
};
```

### Component with Refs
```typescript
export const EventMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      // ... config
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
};
```

## Priority Order

When making suggestions:
1. **Correctness**: Code must work and handle edge cases
2. **Type Safety**: Proper TypeScript usage
3. **Performance**: Efficient algorithms and rendering
4. **Readability**: Clear, maintainable code
5. **Accessibility**: WCAG 2.1 AA compliance
6. **Testing**: Testable code structure