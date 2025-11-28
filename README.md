# ETS Events Visualization

An interactive web application for visualizing Pacific Northwest ETS (Episodic Tremor and Slip) seismic events with real-time playback, live data integration, and mobile-responsive design.

![ETS Events Map](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-7.2-purple)

## 🌟 Features

### Core Functionality
- **Interactive Map Visualization** - Mapbox GL JS with custom dark theme
- **Live Data Integration** - Real-time events from PNSN Tremor API
- **Temporal Playback** - Watch events unfold chronologically with play/pause controls
- **Multiple Time Ranges** - 48 hours, week, month, year, or custom date range
- **Depth-Based Coloring** - Events colored by depth (25-45km, cyan→purple gradient)
- **Magnitude-Based Sizing** - Event markers sized by magnitude (0.4-1.6+)
- **Speed Controls** - Playback speeds from 0.1x to 10x
- **Timeline Scrubbing** - Click or drag to jump to any point in time
- **Range Brackets** - Set custom playback start/end within loaded data

### UI Components
- **Legend** - Visual guide for depth colors and magnitude sizes
- **Statistics Panel** - Real-time stats (total events, mag range, avg depth, date range)
- **Mode Toggle** - Switch between "Show All Events" and "Playback" modes
- **Mobile Responsive** - Collapsible Info panel for phones and tablets
- **Loading Indicators** - Visual feedback during data fetches

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Mapbox API token ([Get one free](https://account.mapbox.com/))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hushrush-ets-events

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Mapbox token to .env
VITE_MAPBOX_TOKEN=pk.eyJ1...your-token-here

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Map Library**: Mapbox GL JS with custom style
- **State Management**: Zustand
- **Data Source**: PNSN Tremor API (https://tremorapi.pnsn.org)
- **Styling**: Tailwind CSS with dark mode, glassmorphism effects

## 📊 Data Source

Events are fetched from the Pacific Northwest Seismic Network (PNSN) Tremor API:
- **API**: https://tremorapi.pnsn.org/api/v3.0/events
- **Coverage**: Cascadia Subduction Zone
- **Update Frequency**: Real-time
- **Data Format**: GeoJSON

## 🎮 Usage

### Viewing Events
1. **Select Time Range** - Use preset buttons (48h, Week, Month, Year) or Custom Range
2. **Choose Mode**:
   - **Show All Events** - Display all events at once
   - **Playback** - Watch events appear chronologically
3. **Adjust Speed** - Use speed controls (0.1x - 10x)
4. **Scrub Timeline** - Click or drag the timeline to jump to any time
5. **Set Range** - Drag bracket handles to focus on a specific time window

### Mobile Usage
- Tap **Info** button (bottom right) to access:
  - Display mode toggle
  - Speed controls
  - Statistics
  - Legend

## 📁 Project Structure

```
src/
├── components/
│   ├── Controls/
│   │   ├── DataRangeSelector.tsx    # Time range preset buttons
│   │   ├── EventStats.tsx            # Statistics panel
│   │   ├── Legend.tsx                # Depth/magnitude legend
│   │   ├── MobileInfoPanel.tsx       # Mobile collapsible panel
│   │   ├── PlaybackControls.tsx      # Timeline and playback buttons
│   │   └── SideControls.tsx          # Mode toggle and speed controls
│   └── Map/
│       └── MapContainer.tsx          # Mapbox map component
├── hooks/
│   ├── useEventData.ts               # Data fetching from API
│   ├── useIsMobile.ts                # Mobile/tablet detection
│   └── usePlayback.ts                # Playback logic and filtering
├── services/
│   └── tremor-api.ts                 # PNSN API integration
├── stores/
│   └── playbackStore.ts              # Zustand state management
├── types/
│   └── event.ts                      # TypeScript interfaces
└── App.tsx                           # Main application
```

## ⚙️ Configuration

### Environment Variables

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

### Map Configuration

- **Style**: `mapbox://styles/dlarsen395/cmihxx3wa005o01stf9mm69b6`
- **Center**: [-124.0, 44.5] (Cascadia Subduction Zone)
- **Initial Zoom**: 5.2

### Event Styling

**Depth Colors** (interpolated):
- 25km: `#67E8F9` (cyan)
- 30km: `#38BDF8` (sky blue)
- 35km: `#818CF8` (indigo)
- 40km: `#A855F7` (purple)
- 45km: `#7C3AED` (violet)

**Magnitude Sizes**:
- < 0.7: 3px radius
- 1.0: 6px radius
- 1.6+: 10.5px radius

## 🔧 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Components**: Functional components with hooks
- **State**: Zustand for global state, useState for local
- **Styling**: Tailwind utility classes + inline styles for dynamic values

## 📦 Deployment

### Production Build

```bash
npm run build
```

Outputs optimized static files to `dist/` directory.

### Docker (Coming Soon)

```bash
# Build image
docker build -t ets-events .

# Run container
docker run -p 8080:80 -e VITE_MAPBOX_TOKEN=your_token ets-events
```

## 🗺️ Roadmap

### ✅ Completed (V1)
- [x] Live PNSN API integration
- [x] Temporal playback engine
- [x] Custom time range selection
- [x] Depth-based event coloring
- [x] Legend and statistics panels
- [x] Mobile responsive design
- [x] Timeline scrubbing with range brackets
- [x] Loading states and error handling

### 🔜 Next (V2)
- [ ] Docker deployment configuration
- [ ] User-selectable color schemes
- [ ] Event clustering at low zoom levels
- [ ] Keyboard shortcuts
- [ ] URL state persistence
- [ ] Export/share functionality

## 🐛 Troubleshooting

### Map not displaying?
1. Verify Mapbox token in `.env` file
2. Restart dev server after `.env` changes
3. Check browser console for errors
4. Ensure token has required scopes

### Events not loading?
1. Check internet connection
2. Verify PNSN API is accessible: https://tremorapi.pnsn.org
3. Check browser network tab for 5XX errors
4. Try different time range (API may timeout for large ranges)

### Performance issues?
1. Use smaller time ranges (Week instead of Year)
2. Close other browser tabs
3. Use "Show All Events" mode for static viewing
4. Clear browser cache

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- **PNSN** - Pacific Northwest Seismic Network for tremor data API
- **Mapbox** - Map tiles and GL JS library
- **React Team** - React 19 framework
- **Vite Team** - Lightning-fast build tool

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
