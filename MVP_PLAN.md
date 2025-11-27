# ETS Events Visualization - MVP Implementation Plan (Revised)

## 🎯 MVP Scope Definition

### ✅ Must-Have Features (MVP - Version 1.0)
1. **Interactive Map** - Display all events on Mapbox GL
2. **Temporal Playback** - Play events chronologically with fade effects
3. **Basic Controls** - Play/pause, speed adjustment, reset
4. **Date Range Filter** - Simple date picker to filter events
5. **Event Details** - Click event to see details popup
6. **Responsive Layout** - Works on desktop and tablet

### 🔵 Deferred to V2 (Post-MVP)
- Event clustering (non-playback mode)
- Magnitude/depth range sliders
- Timeline scrubber/progress bar
- Dark mode toggle
- Advanced search
- Data export features
- Animation recording

---

## 🎨 Modern Design Direction

### Visual Style
- **Color Palette**: 
  - Primary: Modern blues (#3B82F6, #1E40AF)
  - Accent: Vibrant coral/orange (#F97316) for events
  - Background: Clean white/light gray (#F9FAFB)
  - Text: High contrast (#111827, #6B7280)
  
- **Typography**: 
  - Sans-serif: Inter or System UI stack
  - Monospace for data: JetBrains Mono or SF Mono

- **Design Principles**:
  - **Glassmorphism** for control panels (semi-transparent, blurred backgrounds)
  - **Smooth animations** (60fps transitions)
  - **Minimal shadows** with subtle depth
  - **Rounded corners** (8-12px radius)
  - **High contrast** for accessibility

### Event Visualization
- **Magnitude-based colors**:
  - 0.0-0.7: Green (#10B981)
  - 0.7-1.2: Yellow (#F59E0B)
  - 1.2-1.5: Orange (#F97316)
  - 1.5+: Red (#EF4444)
- **Pulse animation** on event appearance
- **Smooth fade** over configurable duration

---

## 🐳 Docker Development Strategy

### Development Environment Options

#### Option 1: Docker Desktop (Recommended for You)
**Pros:**
- Works directly on Windows
- Visual UI for container management
- Easy volume mounting for hot-reload
- Integrates with VS Code Docker extension

**Setup:**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"  # Vite dev server
    volumes:
      - .:/app
      - /app/node_modules  # Don't overwrite node_modules
    environment:
      - VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
    command: npm run dev -- --host 0.0.0.0
```

#### Option 2: WSL 2 + Docker (Alternative)
**Pros:**
- Native Linux performance
- Better file system performance
- Closer to production environment

**Cons:**
- Additional setup complexity
- May have file permission issues

**Recommendation**: Start with **Docker Desktop**, as it's simpler and your production is Docker Swarm, so the workflow will be similar.

### Production Build
```dockerfile
# Dockerfile (Production)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ARG VITE_MAPBOX_TOKEN
ENV VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Swarm Deployment
```yaml
# docker-stack.yml
version: '3.8'
services:
  ets-viz:
    image: your-registry/ets-events-viz:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.ets-viz.rule=Host(`ets.yourdomain.com`)"
    ports:
      - "8080:80"
    environment:
      - VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
```

---

## 📅 Revised MVP Timeline (10 Days)

### Phase 1: Foundation (Days 1-2)
**Goal**: Working development environment

#### Day 1 - Project Setup
- [ ] Initialize Vite + React + TypeScript
- [ ] Configure Tailwind CSS with custom theme
- [ ] Install dependencies:
  ```json
  {
    "dependencies": {
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "mapbox-gl": "^3.0.0",
      "zustand": "^4.4.7",
      "date-fns": "^3.0.0"
    },
    "devDependencies": {
      "@types/mapbox-gl": "^3.0.0",
      "typescript": "^5.3.0",
      "vite": "^5.0.0",
      "tailwindcss": "^3.4.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0"
    }
  }
  ```
- [ ] Create Docker development environment
- [ ] Set up `.env.example` with Mapbox token placeholder
- [ ] Create project structure:
  ```
  src/
  ├── components/
  │   ├── Map/
  │   └── Controls/
  ├── hooks/
  ├── stores/
  ├── types/
  ├── utils/
  └── styles/
  ```

#### Day 2 - Type Definitions & Data Loading
- [ ] Define TypeScript types (`src/types/event.ts`):
  ```typescript
  export interface ETSEventProperties {
    depth: number;
    duration: number;
    energy: number;
    id: number;
    magnitude: number;
    num_stas: number;
    time: string;
  }

  export interface ETSEvent {
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: ETSEventProperties;
  }

  export interface ETSEventCollection {
    type: 'FeatureCollection';
    features: ETSEvent[];
  }
  ```
- [ ] Create data loading hook (`src/hooks/useEventData.ts`)
- [ ] Implement event parser with validation
- [ ] Copy `ETS_events.json` to `public/`
- [ ] Add loading and error states

**Deliverable**: Events loading successfully with TypeScript types

---

### Phase 2: Core Map (Days 3-4)

#### Day 3 - Map Implementation
- [ ] Create `MapContainer.tsx` component
- [ ] Initialize Mapbox GL with token from env
- [ ] Configure viewport for Pacific Northwest:
  ```typescript
  const INITIAL_VIEW = {
    center: [-123.0, 47.0] as [number, number],
    zoom: 6.5,
    pitch: 0,
    bearing: 0
  };
  ```
- [ ] Add navigation controls
- [ ] Implement responsive sizing
- [ ] Create modern control panel overlay with glassmorphism

#### Day 4 - Event Rendering
- [ ] Add GeoJSON source for events
- [ ] Create circle layer with magnitude-based colors
- [ ] Implement data-driven styling:
  ```typescript
  'circle-radius': [
    'interpolate', ['linear'], ['get', 'magnitude'],
    0.4, 4,
    1.9, 12
  ],
  'circle-color': [
    'interpolate', ['linear'], ['get', 'magnitude'],
    0.4, '#10B981',
    0.7, '#F59E0B',
    1.2, '#F97316',
    1.5, '#EF4444'
  ]
  ```
- [ ] Add hover effects with cursor change
- [ ] Create popup component for event details
- [ ] Style popup with modern card design

**Deliverable**: Interactive map with all events visible

---

### Phase 3: State Management (Day 5)

#### Event Store (Zustand)
```typescript
interface EventStore {
  allEvents: ETSEvent[];
  filteredEvents: ETSEvent[];
  selectedEvent: ETSEvent | null;
  dateRange: { start: Date | null; end: Date | null };
  
  loadEvents: (events: ETSEvent[]) => void;
  filterByDateRange: (start: Date, end: Date) => void;
  selectEvent: (id: number) => void;
  clearSelection: () => void;
}
```

#### Playback Store
```typescript
interface PlaybackStore {
  isPlaying: boolean;
  currentIndex: number;
  speed: number;              // 1 = 1 event/second
  fadeDurationMs: number;     // Default 3000ms
  activeEventIds: Set<number>;
  
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setFadeDuration: (ms: number) => void;
}
```

**Deliverable**: Working state management system

---

### Phase 4: Playback Engine (Days 6-7)

#### Day 6 - Playback Logic
- [ ] Create `useEventPlayback` hook
- [ ] Sort events by timestamp
- [ ] Implement interval-based playback
- [ ] Calculate time between events based on actual timestamps and speed
- [ ] Add event to active set when played
- [ ] Handle edge cases (empty array, single event)

#### Day 7 - Fade Animation
- [ ] Implement fade timer system
- [ ] Calculate opacity based on time elapsed since appearance
- [ ] Remove events from map after fade completes
- [ ] Add pulse animation on event appearance:
  ```typescript
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
  }
  ```
- [ ] Optimize performance (batch updates, requestAnimationFrame)
- [ ] Test with various speeds (0.1x, 1x, 10x)

**Deliverable**: Smooth temporal playback with fade effects

---

### Phase 5: UI Controls (Days 8-9)

#### Day 8 - Playback Controls
Create modern control panel with:
- [ ] Play/Pause button (animated icon transition)
- [ ] Speed slider (0.1x - 10x)
  - Visual: Modern range input with value display
  - Logarithmic scale for better UX
- [ ] Fade duration slider (1s - 10s)
- [ ] Reset button
- [ ] Current event counter ("Event 145 / 2,634")
- [ ] Current date/time display

**Design**: Glassmorphism panel bottom-center:
```css
.control-panel {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

#### Day 9 - Date Range Filter
- [ ] Create filter panel (right sidebar or modal)
- [ ] Add date picker component (start/end date)
- [ ] Implement "Apply Filter" button
- [ ] Add "Clear Filter" button
- [ ] Show active filter indicator
- [ ] Add quick presets:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - All events

**Deliverable**: Complete, polished MVP UI

---

### Phase 6: Polish & Deploy (Day 10)

#### Morning - Testing & Optimization
- [ ] Test all playback speeds
- [ ] Verify date filtering works correctly
- [ ] Test on different screen sizes (1920x1080, 1366x768, iPad)
- [ ] Check performance (should maintain 60fps)
- [ ] Fix any visual bugs
- [ ] Add loading skeletons

#### Afternoon - Docker & Documentation
- [ ] Create production Dockerfile
- [ ] Build production image
- [ ] Test production build locally
- [ ] Write deployment instructions for Docker Swarm
- [ ] Create `.env.example`
- [ ] Update README with:
  - Quick start guide
  - Development setup
  - Production deployment
  - Environment variables

**Deliverable**: Production-ready MVP

---

## 🏗️ Simplified Architecture

```
┌─────────────────────────────────────────────┐
│         React App (Single Page)             │
├─────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐    │
│  │  MapContainer (Mapbox GL)          │    │
│  │  • GeoJSON Layer (all events)      │    │
│  │  • Active Events (during playback) │    │
│  │  • Fade Animations                 │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  ControlPanel (Bottom Center)      │    │
│  │  • Play/Pause/Reset                │    │
│  │  • Speed Slider                    │    │
│  │  • Fade Duration Slider            │    │
│  │  • Event Counter                   │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  FilterPanel (Right Sidebar)       │    │
│  │  • Date Range Picker               │    │
│  │  • Quick Presets                   │    │
│  │  • Apply/Clear Buttons             │    │
│  └────────────────────────────────────┘    │
│                                             │
│  Zustand Stores: Events + Playback         │
└─────────────────────────────────────────────┘
```

---

## 🎨 Component Design Specs

### Control Panel
```
┌──────────────────────────────────────────────┐
│  [▶️ Play]  Speed: ──●────── 2.5x           │
│                                              │
│  Fade: ───────●── 3s                        │
│  Event 145 / 2,634  |  Aug 15, 2025 14:23  │
│  [🔄 Reset]                                  │
└──────────────────────────────────────────────┘
```

### Filter Panel
```
┌─────────────────────┐
│   Filter Events     │
├─────────────────────┤
│ Date Range          │
│ From: [Aug 1, 2025] │
│ To:   [Nov 30, 2025]│
│                     │
│ Quick Presets:      │
│ • Last 7 days       │
│ • Last 30 days      │
│ • All events        │
│                     │
│ [Apply] [Clear]     │
└─────────────────────┘
```

### Event Popup
```
┌─────────────────────────┐
│ ETS Event #1438085      │
├─────────────────────────┤
│ 📍 47.046°N, 123.222°W  │
│ 📊 Magnitude: 1.1       │
│ 📏 Depth: 60.0 km       │
│ ⚡ Energy: 70,477       │
│ 🕒 Aug 2, 2025 11:37 AM │
│ 📡 7 stations           │
└─────────────────────────┘
```

---

## 🔧 Development Workflow

### Daily Development
```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up

# Or without Docker
npm run dev

# Access at http://localhost:5173
```

### Building for Production
```bash
# Build Docker image
docker build -t ets-events-viz:latest .

# Test production build locally
docker run -p 8080:80 \
  -e VITE_MAPBOX_TOKEN=your_token \
  ets-events-viz:latest

# Deploy to Swarm
docker stack deploy -c docker-stack.yml ets-viz
```

---

## 📊 MVP Success Criteria

### Performance
- [ ] Initial load < 3 seconds
- [ ] Playback runs at 60fps
- [ ] Date filter applies < 500ms
- [ ] No memory leaks during long playback sessions

### Functionality
- [ ] All 2,634 events render correctly
- [ ] Playback works smoothly at all speeds
- [ ] Fade animations are smooth
- [ ] Date filtering works accurately
- [ ] Event popups show correct data

### Visual Quality
- [ ] Modern, polished appearance
- [ ] Responsive on desktop (1920px - 1366px)
- [ ] Clean animations and transitions
- [ ] High contrast, readable text
- [ ] Professional color scheme

### Deployment
- [ ] Docker image < 50MB
- [ ] Builds successfully
- [ ] Runs on Docker Desktop
- [ ] Ready for Docker Swarm

---

## 🚀 Post-MVP Roadmap (V2)

### Quick Wins (1-2 days each)
1. Timeline scrubber with progress bar
2. Magnitude range filter
3. Event clustering (non-playback)
4. Dark mode toggle

### Medium Features (3-5 days each)
5. Advanced search (by ID, location)
6. GeoJSON export
7. Animation quality settings
8. Heatmap visualization mode

### Advanced Features (1 week+)
9. 3D terrain view
10. Compare multiple time periods
11. Animation recording/export
12. Real-time streaming (if data source available)

---

## 📋 Pre-Development Checklist

- [x] Mapbox token available ("Hushrush-Omada-API")
- [ ] Docker Desktop running
- [ ] Node.js 20+ installed
- [ ] VS Code with extensions:
  - Docker
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
- [ ] Git configured
- [ ] Terminal ready (PowerShell or WSL)

---

## 💡 Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scope** | MVP First | Ship working version quickly, iterate based on feedback |
| **Design** | Modern Glassmorphism | Professional, polished, contemporary look |
| **Dev Environment** | Docker Desktop | Simpler setup, similar to production Swarm |
| **Colors** | Magnitude-based gradient | Intuitive visual encoding of event strength |
| **Timeline** | 10 days MVP | Realistic timeline with buffer for polish |

---

## 🤝 Next Steps

1. **Review this revised plan** - Confirm MVP scope is good
2. **Confirm Mapbox token** - Verify "Hushrush-Omada-API" works
3. **Start Phase 1** - Initialize project with Vite + React + TypeScript
4. **Daily check-ins** - Brief updates at end of each phase

**Questions before we start?**
- Any MVP features you want to add/remove?
- Color preferences or design adjustments?
- Docker Desktop installed and ready?
- Ready to proceed with Phase 1?