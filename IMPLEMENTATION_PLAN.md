# ETS Events Visualization - Implementation Plan

## Phase 1: Project Foundation (Days 1-2)

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure tsconfig.json with strict mode
- [ ] Set up Tailwind CSS
- [ ] Install core dependencies:
  - `mapbox-gl` - Map rendering
  - `zustand` - State management
  - `date-fns` - Time utilities
  - `@types/*` packages for TypeScript support
- [ ] Install dev dependencies:
  - `vitest` - Testing framework
  - `@testing-library/react` - Component testing
  - `eslint` + `prettier` - Code quality
- [ ] Create directory structure
- [ ] Set up environment variables (.env.example)
- [ ] Configure Vite build optimizations

**Deliverable**: Working dev environment with `npm run dev`

### 1.2 Type Definitions
- [ ] Create `src/types/event.ts` for GeoJSON structure
- [ ] Create `src/types/map.ts` for map-related types
- [ ] Create `src/types/playback.ts` for playback state types
- [ ] Create `src/types/filters.ts` for filter configuration
- [ ] Add TypeScript declarations for Mapbox GL

**Deliverable**: Complete type coverage for all data structures

### 1.3 Data Loading
- [ ] Copy ETS_events.json to `public/` directory
- [ ] Create `src/utils/eventParser.ts` for GeoJSON parsing
- [ ] Create data loading hook `useEventData.ts`
- [ ] Add error handling and loading states
- [ ] Implement data validation (ensure all required fields exist)
- [ ] Add unit tests for parser

**Deliverable**: Reliable event data loading system

---

## Phase 2: Core Map Implementation (Days 3-4)

### 2.1 Basic Map Setup
- [ ] Create `src/components/Map/MapContainer.tsx`
- [ ] Initialize Mapbox GL with proper configuration
- [ ] Set up base map style (terrain/satellite toggle)
- [ ] Configure initial viewport (Pacific Northwest region)
- [ ] Add zoom controls and navigation
- [ ] Implement responsive sizing
- [ ] Add map loading state

**Deliverable**: Interactive base map displaying correctly

### 2.2 Event Rendering
- [ ] Create `src/components/Map/EventLayer.tsx`
- [ ] Add GeoJSON source to map
- [ ] Create circle layer for event markers
- [ ] Implement data-driven styling:
  - Color by magnitude (gradient: green → yellow → red)
  - Size by energy or magnitude
- [ ] Add hover effects
- [ ] Create event popup component
- [ ] Display event details on click

**Deliverable**: Events visible on map with interactive popups

### 2.3 Map Utilities
- [ ] Create `src/utils/mapUtils.ts`
- [ ] Implement bounds calculation for events
- [ ] Add coordinate validation
- [ ] Create legend component for color scale
- [ ] Add map style switcher

**Deliverable**: Fully functional map utilities

---

## Phase 3: State Management (Day 5)

### 3.1 Event Store (Zustand)
- [ ] Create `src/stores/eventStore.ts`
- [ ] Define state shape:
  ```typescript
  {
    allEvents: ETSEvent[]
    filteredEvents: ETSEvent[]
    selectedEvent: ETSEvent | null
    isLoading: boolean
    error: string | null
  }
  ```
- [ ] Implement actions:
  - `loadEvents()`
  - `filterEvents(filters)`
  - `selectEvent(id)`
  - `clearSelection()`
- [ ] Add persistence (optional)

### 3.2 Playback Store
- [ ] Create `src/stores/playbackStore.ts`
- [ ] Define state shape:
  ```typescript
  {
    isPlaying: boolean
    currentIndex: number
    speed: number (0.5 - 10)
    fadeDuration: number (1 - 30 seconds)
    visibleEvents: Set<number>
    fadingEvents: Map<number, number> // id -> fadeStartTime
  }
  ```
- [ ] Implement actions:
  - `play()`, `pause()`, `reset()`
  - `setSpeed(speed)`
  - `setFadeDuration(seconds)`
  - `jumpToIndex(index)`

### 3.3 Filter Store
- [ ] Create `src/stores/filterStore.ts`
- [ ] Define filter state:
  ```typescript
  {
    dateRange: { start: Date, end: Date }
    magnitudeRange: { min: number, max: number }
    depthRange: { min: number, max: number }
    energyRange: { min: number, max: number }
  }
  ```
- [ ] Implement filter application logic
- [ ] Add preset filters (e.g., "Last 30 days", "Magnitude > 1.0")

**Deliverable**: Complete state management system

---

## Phase 4: Playback System (Days 6-7)

### 4.1 Playback Engine
- [ ] Create `src/hooks/useEventPlayback.ts`
- [ ] Implement time-based event scheduling
- [ ] Calculate intervals based on real timestamps and playback speed
- [ ] Handle edge cases (empty data, single event, etc.)
- [ ] Add event queue management
- [ ] Implement pause/resume logic

### 4.2 Fade Animation System
- [ ] Create `src/utils/fadeAnimations.ts`
- [ ] Implement opacity calculation based on time elapsed
- [ ] Add event removal logic after fade completion
- [ ] Create reusable fade function
- [ ] Optimize performance (remove from DOM vs. opacity)
- [ ] Handle rapid speed changes

### 4.3 Visual Feedback
- [ ] Create `src/components/Map/PlaybackMarkers.tsx`
- [ ] Render active events with full opacity
- [ ] Apply fade effect to expiring events
- [ ] Add "pulse" animation on event appearance
- [ ] Implement efficient marker updates (batch DOM operations)
- [ ] Add marker pooling for performance

**Deliverable**: Smooth temporal playback with fade effects

---

## Phase 5: UI Controls (Days 8-9)

### 5.1 Playback Controls Component
- [ ] Create `src/components/Controls/PlaybackControls.tsx`
- [ ] Add play/pause button with icon toggle
- [ ] Implement speed slider (0.5x - 10x)
  - Logarithmic scale for better UX
  - Display current speed value
- [ ] Add fade duration slider (1s - 30s)
- [ ] Create reset button
- [ ] Add skip forward/backward buttons
- [ ] Display current timestamp
- [ ] Show events counter (current / total)

### 5.2 Timeline Component
- [ ] Create `src/components/Controls/Timeline.tsx`
- [ ] Implement progress bar
- [ ] Add scrubbing capability (drag to specific time)
- [ ] Show event markers on timeline
- [ ] Display time range labels
- [ ] Add zoom controls for timeline
- [ ] Implement keyboard controls (space, arrows)

### 5.3 Filter Panel
- [ ] Create `src/components/Filters/FilterPanel.tsx`
- [ ] Add date range picker
  - Calendar UI or text inputs
  - Preset ranges (Last 7/30/90 days, All time)
- [ ] Add magnitude range slider (two-thumb)
- [ ] Add depth range slider
- [ ] Add energy range slider (optional)
- [ ] Implement "Apply Filters" button
- [ ] Add "Reset Filters" button
- [ ] Show active filter count badge
- [ ] Add filter presets dropdown

### 5.4 Info Panel
- [ ] Create `src/components/Info/EventDetails.tsx`
- [ ] Display selected event information
- [ ] Show event statistics
- [ ] Add data source attribution
- [ ] Create collapsible panel

**Deliverable**: Complete, polished UI controls

---

## Phase 6: Advanced Features (Days 10-11)

### 6.1 Event Clustering (Non-Playback Mode)
- [ ] Implement Mapbox clustering
- [ ] Style cluster markers by count
- [ ] Add zoom-to-cluster on click
- [ ] Disable clustering during playback
- [ ] Add cluster count labels

### 6.2 Search & Navigation
- [ ] Add event search by ID or date
- [ ] Implement "Jump to Event" functionality
- [ ] Add location search (geocoding)
- [ ] Create bookmarks for interesting events

### 6.3 Visual Enhancements
- [ ] Add magnitude legend
- [ ] Implement dark/light mode toggle
- [ ] Add animation quality settings (performance toggle)
- [ ] Create loading skeleton screens
- [ ] Add smooth transitions between filter changes

### 6.4 Data Export
- [ ] Implement filtered data export as GeoJSON
- [ ] Add CSV export option
- [ ] Create shareable URLs with current state
- [ ] Add screenshot/record animation feature (optional)

**Deliverable**: Enhanced user experience with advanced features

---

## Phase 7: Optimization & Polish (Day 12)

### 7.1 Performance Optimization
- [ ] Implement virtual scrolling for event lists (if needed)
- [ ] Optimize marker rendering (canvas vs. DOM)
- [ ] Add Web Worker for heavy computations
- [ ] Implement lazy loading for large datasets
- [ ] Reduce bundle size:
  - Code splitting for map library
  - Tree-shaking unused Mapbox modules
  - Optimize images and assets
- [ ] Add performance monitoring
- [ ] Profile and optimize re-renders

### 7.2 Accessibility
- [ ] Add keyboard shortcuts documentation
- [ ] Ensure all interactive elements are keyboard accessible
- [ ] Add ARIA labels to all controls
- [ ] Test with screen reader
- [ ] Ensure color contrast meets WCAG AA
- [ ] Add focus indicators
- [ ] Implement skip links

### 7.3 Error Handling
- [ ] Add global error boundary
- [ ] Implement retry logic for data loading
- [ ] Add user-friendly error messages
- [ ] Create fallback UI for map loading failures
- [ ] Add data validation errors

### 7.4 Testing
- [ ] Write unit tests for utilities (>80% coverage)
- [ ] Add integration tests for playback system
- [ ] Create component tests for UI controls
- [ ] Add E2E tests for critical flows (Playwright/Cypress)
- [ ] Test on multiple browsers and devices

**Deliverable**: Production-ready, optimized application

---

## Phase 8: Docker Deployment (Day 13)

### 8.1 Docker Setup
- [ ] Create `Dockerfile` with multi-stage build:
  ```dockerfile
  # Stage 1: Build
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # Stage 2: Production
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

### 8.2 Nginx Configuration
- [ ] Create `nginx.conf`
- [ ] Configure gzip compression
- [ ] Add caching headers for static assets
- [ ] Set up SPA routing (redirect to index.html)
- [ ] Configure security headers
- [ ] Add rate limiting (optional)

### 8.3 Docker Compose
- [ ] Create `docker-compose.yml` for development
- [ ] Add volume mounts for hot-reload
- [ ] Configure environment variables
- [ ] Add health checks

### 8.4 CI/CD (Optional)
- [ ] Create GitHub Actions workflow
- [ ] Add build and test pipeline
- [ ] Implement Docker image building
- [ ] Add automatic deployment (if needed)

**Deliverable**: Containerized application ready for deployment

---

## Phase 9: Documentation & Handoff (Day 14)

### 9.1 User Documentation
- [ ] Create user guide with screenshots
- [ ] Document keyboard shortcuts
- [ ] Add FAQ section
- [ ] Create video tutorial (optional)

### 9.2 Developer Documentation
- [ ] Document architecture decisions
- [ ] Add API documentation (if applicable)
- [ ] Create contribution guidelines
- [ ] Document deployment procedures
- [ ] Add troubleshooting guide

### 9.3 Code Quality
- [ ] Final code review
- [ ] Ensure consistent formatting
- [ ] Add missing comments for complex logic
- [ ] Update all TODOs
- [ ] Verify all linter rules pass

### 9.4 Final Testing
- [ ] Manual testing on production build
- [ ] Cross-browser testing
- [ ] Mobile responsiveness check
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit

**Deliverable**: Complete, documented, production-ready application

---

## Technical Decisions Summary

### Why React + TypeScript + Vite?
✅ **Type Safety**: TypeScript catches errors at compile time, crucial for GeoJSON data structures  
✅ **Performance**: Vite provides instant HMR and optimized builds  
✅ **Developer Experience**: Excellent tooling and IDE support  
✅ **Community**: Large ecosystem with mature libraries  
✅ **Maintainability**: Strongly typed codebase is easier to refactor and extend  

### Why Mapbox GL JS?
✅ **Performance**: WebGL rendering handles thousands of markers smoothly  
✅ **Features**: Built-in clustering, animations, and layer management  
✅ **Customization**: Full control over styling and interactions  
✅ **Documentation**: Excellent docs and TypeScript support  

### Why Zustand over Redux?
✅ **Simplicity**: Less boilerplate, easier to learn  
✅ **TypeScript-First**: Better type inference  
✅ **Size**: Much smaller bundle size  
✅ **Performance**: No unnecessary re-renders by default  

### Why Tailwind CSS?
✅ **Speed**: Rapid UI development  
✅ **Consistency**: Design system built in  
✅ **Performance**: Purged unused CSS in production  
✅ **Flexibility**: Easy to customize  

---

## Risk Assessment

### High Risk
- **Large Dataset Performance**: 2600+ events may cause slowdowns
  - **Mitigation**: Implement clustering, virtual scrolling, efficient rendering
  
### Medium Risk
- **Mapbox Token Management**: Token needs to be secured
  - **Mitigation**: Environment variables, rate limiting
  
- **Browser Compatibility**: Older browsers may not support WebGL
  - **Mitigation**: Feature detection, fallback message

### Low Risk
- **Third-Party API Availability**: Mapbox service reliability
  - **Mitigation**: Offline map fallback, error handling

---

## Success Criteria

✅ Application loads in < 3 seconds  
✅ Playback runs smoothly at various speeds (no jank)  
✅ Filters apply instantly (< 500ms)  
✅ All events are accurately represented  
✅ Responsive on mobile (768px+) and desktop  
✅ Accessible (WCAG 2.1 AA)  
✅ Docker image < 50MB  
✅ Test coverage > 70%  
✅ Zero TypeScript errors  
✅ Lighthouse score > 90  

---

## Timeline Estimate

- **Phases 1-3**: 5 days (Foundation)
- **Phases 4-6**: 6 days (Core Features)
- **Phases 7-9**: 3 days (Polish & Deploy)

**Total**: ~14 days (2-3 weeks with buffer)

---

## Next Steps After Review

1. Review this plan together
2. Prioritize features (MVP vs. Nice-to-Have)
3. Adjust timeline based on feedback
4. Get Mapbox API token
5. Begin Phase 1 implementation