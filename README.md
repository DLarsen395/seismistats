# ETS Events Visualization

An interactive web application for visualizing Episodic Tremor and Slip (ETS) seismic events on a map with temporal playback capabilities.

## Overview

This project provides an interactive map-based visualization of ETS (Episodic Tremor and Slip) seismic events, inspired by the PNSN Tremor Map (https://pnsn.org/tremor). The application allows users to view events geographically and play them back chronologically with customizable fade effects.

## Features

- **Interactive Map**: Geographic visualization of ETS events using Leaflet/Mapbox
- **Temporal Playback**: Play events in chronological order with visual fade-out effects
- **Event Filtering**: Filter events by date range, magnitude, depth, and other properties
- **Playback Controls**: 
  - Adjustable playback speed
  - Configurable fade duration
  - Play/pause/reset controls
  - Timeline scrubbing
- **Event Details**: Click events to view detailed information (magnitude, depth, energy, location, timestamp)
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Deployment**: Easy deployment using Docker containers

## Data Source

The application uses `ETS_events.json`, a GeoJSON file containing ETS event data with the following properties per event:
- **Coordinates**: Longitude, Latitude
- **Depth**: Event depth in km
- **Duration**: Event duration in seconds
- **Energy**: Energy measurement
- **Magnitude**: Event magnitude
- **Time**: Event timestamp
- **Number of Stations**: Recording stations count

## Technology Stack

### Frontend Framework
**Recommendation: React with TypeScript + Vite**

**Rationale:**
- **TypeScript**: Type safety for GeoJSON data structures, API responses, and state management
- **React**: Component-based architecture ideal for map controls, filters, and timeline UI
- **Vite**: Fast development server, optimized builds, excellent TypeScript support
- **Modern**: Industry standard with extensive ecosystem and community support

### Mapping Library
**Recommendation: Mapbox GL JS**

**Rationale:**
- High-performance WebGL rendering (critical for thousands of events)
- Built-in clustering and layer management
- Smooth animations for temporal playback
- Excellent documentation and TypeScript support
- Free tier suitable for this project

### State Management
**Recommendation: Zustand**

**Rationale:**
- Lightweight and simple compared to Redux
- TypeScript-first design
- Perfect for managing playback state, filters, and event data

### Styling
**Recommendation: Tailwind CSS**

**Rationale:**
- Rapid UI development
- Responsive design utilities
- Small production bundle size
- Easy theming

### Build & Deployment
**Docker with multi-stage builds**

**Rationale:**
- Reproducible builds
- Easy deployment to any container platform
- Nginx for efficient static file serving
- Small production image size

## Project Structure

```
hushrush-ets-events/
├── .github/
│   └── workflows/          # CI/CD workflows
├── public/
│   └── ETS_events.json     # Event data
├── src/
│   ├── components/         # React components
│   │   ├── Map/           # Map and event rendering
│   │   ├── Controls/      # Playback controls
│   │   ├── Filters/       # Event filtering UI
│   │   └── Timeline/      # Timeline scrubber
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   │   ├── eventParser.ts # GeoJSON parsing
│   │   ├── timeUtils.ts   # Time calculations
│   │   └── mapUtils.ts    # Map helper functions
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── Dockerfile             # Production container
├── docker-compose.yml     # Development environment
├── nginx.conf             # Production web server config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Core Features Implementation

### 1. Event Playback System
- Parse and sort events by timestamp
- Render events on map as they "occur" during playback
- Implement fade-out effect using opacity transitions
- Calculate appropriate playback intervals

### 2. Filtering System
- Date range picker (start/end dates)
- Magnitude range slider
- Depth range slider
- Multiple event selection for detailed comparison

### 3. Map Visualization
- Color-code events by magnitude or depth
- Size markers based on energy or magnitude
- Clustering for dense areas when not in playback mode
- Smooth animations during transitions

### 4. Timeline Controls
- Play/pause button
- Speed control (0.5x to 10x)
- Fade duration control (1s to 30s)
- Progress bar with scrubbing capability
- Current event counter display

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker Deployment

```bash
# Build production image
docker build -t ets-events-viz .

# Run container
docker run -p 80:80 ets-events-viz

# Or use docker-compose
docker-compose up -d
```

## Environment Variables

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_URL=optional_backend_url
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Considerations

- **Event Data**: ~2600+ events - consider virtualization for large datasets
- **Map Performance**: Use clustering when not in playback mode
- **Memory Management**: Clean up event markers after fade completion
- **Bundle Size**: Code splitting for map library (~500KB)

## Future Enhancements

- Export filtered events as GeoJSON
- Compare multiple time periods
- Heatmap visualization mode
- 3D terrain visualization
- Real-time event streaming (if data source available)
- Custom color schemes
- Animation recording/export

## License

[To be determined]

## Contributing

[Guidelines to be added]

## Acknowledgments

- PNSN (Pacific Northwest Seismic Network) for inspiration
- Data source: [To be credited]

