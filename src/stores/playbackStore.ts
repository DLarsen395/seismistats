import { create } from 'zustand';

// Days per second options - how many days of event time pass per real second
export type PlaybackSpeed = 1 | 7 | 14 | 30 | 60 | 120 | 240 | 365;

// Compute fade duration based on speed: 2s at 1 day/s, scaling to 0.5s at 365 days/s
// Using logarithmic scale for smooth transition
export const getFadeOutDuration = (speed: PlaybackSpeed): number => {
  const minFade = 0.5;
  const maxFade = 2.0;
  const logSpeed = Math.log(speed);
  const logMax = Math.log(365);
  const t = logSpeed / logMax; // 0 to 1
  return maxFade - t * (maxFade - minFade);
};

interface PlaybackState {
  // Playback controls
  isPlaying: boolean;
  speed: PlaybackSpeed; // days per second
  
  // Time management
  currentTime: Date | null;
  startTime: Date | null;  // Earliest event in data
  endTime: Date | null;    // Latest event in data
  rangeStart: Date | null; // User-selected playback start (bracket slider)
  rangeEnd: Date | null;   // User-selected playback end (bracket slider)
  
  // Display settings
  showAllEvents: boolean;  // toggle between playback mode and show-all mode
  
  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setCurrentTime: (time: Date) => void;
  setTimeRange: (start: Date, end: Date) => void;
  setRangeStart: (time: Date) => void;
  setRangeEnd: (time: Date) => void;
  setShowAllEvents: (show: boolean) => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  // Initial state
  isPlaying: false,
  speed: 30, // Default: 30 days per second (1 mo/s)
  currentTime: null,
  startTime: null,
  endTime: null,
  rangeStart: null,
  rangeEnd: null,
  showAllEvents: true, // Start showing all events
  
  // Actions
  play: () => set({ isPlaying: true, showAllEvents: false }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ 
    isPlaying: !state.isPlaying,
    showAllEvents: state.isPlaying ? state.showAllEvents : false 
  })),
  setSpeed: (speed) => set({ speed }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setTimeRange: (startTime, endTime) => set({ 
    startTime, 
    endTime, 
    rangeStart: startTime,
    rangeEnd: endTime,
    currentTime: startTime 
  }),
  setRangeStart: (rangeStart) => set((state) => ({ 
    rangeStart,
    currentTime: state.currentTime && state.currentTime < rangeStart ? rangeStart : state.currentTime
  })),
  setRangeEnd: (rangeEnd) => set((state) => ({
    rangeEnd,
    currentTime: state.currentTime && state.currentTime > rangeEnd ? rangeEnd : state.currentTime
  })),
  setShowAllEvents: (showAllEvents) => set({ showAllEvents, isPlaying: false }),
  reset: () => set((state) => ({ 
    isPlaying: false, 
    currentTime: state.rangeStart || state.startTime
    // Keep showAllEvents unchanged - just reset playhead
  })),
}));
