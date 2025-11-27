import { create } from 'zustand';

// Days per second options - how many days of event time pass per real second
export type PlaybackSpeed = 1 | 7 | 30 | 60 | 90 | 180 | 365;

interface PlaybackState {
  // Playback controls
  isPlaying: boolean;
  speed: PlaybackSpeed; // days per second
  
  // Time management
  currentTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  
  // Display settings
  fadeOutDuration: number; // days before event fades out
  showAllEvents: boolean;  // toggle between playback mode and show-all mode
  
  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setCurrentTime: (time: Date) => void;
  setTimeRange: (start: Date, end: Date) => void;
  setFadeOutDuration: (duration: number) => void;
  setShowAllEvents: (show: boolean) => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  // Initial state
  isPlaying: false,
  speed: 30, // Default: 30 days per second (good for multi-year datasets)
  currentTime: null,
  startTime: null,
  endTime: null,
  fadeOutDuration: 30, // 30 days fade window
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
  setTimeRange: (startTime, endTime) => set({ startTime, endTime, currentTime: startTime }),
  setFadeOutDuration: (fadeOutDuration) => set({ fadeOutDuration }),
  setShowAllEvents: (showAllEvents) => set({ showAllEvents, isPlaying: false }),
  reset: () => set((state) => ({ 
    isPlaying: false, 
    currentTime: state.startTime,
    showAllEvents: true
  })),
}));
