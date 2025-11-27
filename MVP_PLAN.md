# ETS Events Visualization - MVP Plan

## MVP Scope
The minimum viable product focuses on core visualization and playback functionality.

## MVP Features

### ✅ Completed
1. **Map Display**
   - Mapbox GL dark-themed map
   - Pacific Northwest centered view
   - Navigation controls

2. **Event Visualization**
   - Load 20,000+ events from GeoJSON
   - Circle markers with magnitude-based sizing
   - Color gradient (green → yellow → orange → red)
   - Click popups with event details

### 🔄 In Progress
3. **Playback System**
   - Play/Pause button
   - Speed control (1x, 2x, 5x, 10x)
   - Current timestamp display
   - Events appear chronologically
   - Fade-out after configurable duration

### 📋 Pending
4. **Control Panel**
   - Glassmorphism styled panel
   - Date range selection
   - Fade duration slider
   - Dark mode toggle

5. **Docker Deployment**
   - Development container
   - Production multi-stage build
   - Docker Swarm stack file

## MVP User Flow
1. User opens application
2. Map loads with all events visible (or none if playback mode)
3. User clicks Play to start chronological playback
4. Events appear at their recorded times
5. Events fade out after configured duration
6. User can adjust speed and scrub timeline
7. User can pause and inspect individual events

## Success Criteria
- [ ] Map renders without errors
- [ ] All 20,000 events load successfully
- [ ] Playback animates events chronologically
- [ ] Events fade out smoothly
- [ ] Controls are responsive and intuitive
- [ ] Works in Docker container

## Post-MVP Enhancements
- User-selectable color palettes
- Event clustering
- Statistics dashboard
- Mobile responsive layout
- Keyboard shortcuts
- URL state persistence
