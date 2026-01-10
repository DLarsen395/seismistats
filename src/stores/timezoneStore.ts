/**
 * Timezone Preference Store
 *
 * Manages user preference for displaying dates/times in UTC or local timezone.
 * Persists to localStorage for consistency across sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimezonePreference } from '../utils/dateUtils';

interface TimezoneStore {
  /** Current timezone preference: 'utc' or 'local' */
  preference: TimezonePreference;

  /** Set the timezone preference */
  setPreference: (pref: TimezonePreference) => void;

  /** Toggle between UTC and local */
  toggle: () => void;
}

export const useTimezoneStore = create<TimezoneStore>()(
  persist(
    (set) => ({
      // Default to UTC for scientific accuracy
      preference: 'utc',

      setPreference: (pref) => set({ preference: pref }),

      toggle: () =>
        set((state) => ({
          preference: state.preference === 'utc' ? 'local' : 'utc',
        })),
    }),
    {
      name: 'seismistats-timezone',
    }
  )
);
