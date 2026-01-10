/**
 * Timezone Toggle Component
 *
 * Allows users to switch between UTC and local time display.
 * Uses the timezoneStore for persistence across sessions.
 */

import { useTimezoneStore } from '../../stores/timezoneStore';
import { getLocalTimezoneOffset } from '../../utils/dateUtils';

export function TimezoneToggle() {
  const { preference, toggle } = useTimezoneStore();
  const localOffset = getLocalTimezoneOffset();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600"
      title={`Click to switch to ${preference === 'utc' ? 'local' : 'UTC'} time`}
    >
      <span className="text-slate-400">🕐</span>
      <span className={preference === 'utc' ? 'text-blue-400 font-medium' : 'text-slate-400'}>
        UTC
      </span>
      <span className="text-slate-500">/</span>
      <span className={preference === 'local' ? 'text-blue-400 font-medium' : 'text-slate-400'}>
        {localOffset}
      </span>
    </button>
  );
}

/**
 * Compact timezone indicator (just shows current mode)
 */
export function TimezoneIndicator() {
  const { preference, toggle } = useTimezoneStore();
  const localOffset = getLocalTimezoneOffset();

  return (
    <button
      onClick={toggle}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      title={`Displaying in ${preference === 'utc' ? 'UTC' : 'local'} time. Click to toggle.`}
    >
      {preference === 'utc' ? 'UTC' : localOffset}
    </button>
  );
}
