/**
 * Date Utilities for SeismiStats
 *
 * IMPORTANT: All date handling in this application follows these rules:
 *
 * 1. USGS API uses UTC exclusively
 * 2. Database stores timestamps in UTC (TIMESTAMPTZ)
 * 3. API queries should use UTC date ranges
 * 4. Display can be either UTC or local time based on user preference
 *
 * This module provides utilities to ensure consistent UTC handling
 * throughout the application.
 */

/**
 * Timezone display preference
 */
export type TimezonePreference = 'utc' | 'local';

// =============================================================================
// UTC Date Range Creation
// =============================================================================

/**
 * Get today's date in UTC as YYYY-MM-DD string
 * Use this when you need "today" for date range queries
 */
export function getTodayUTC(): string {
  const now = new Date();
  return formatDateUTC(now);
}

/**
 * Format a Date object to YYYY-MM-DD in UTC
 * This is the format USGS API expects for date-only parameters
 */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to YYYY-MM-DD in local timezone
 * Use for display purposes when user prefers local time
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a Date object for start of day in UTC
 * @param dateStr - YYYY-MM-DD string (interpreted as UTC)
 * @returns Date set to 00:00:00.000 UTC on that day
 */
export function startOfDayUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Create a Date object for end of day in UTC
 * @param dateStr - YYYY-MM-DD string (interpreted as UTC)
 * @returns Date set to 23:59:59.999 UTC on that day
 */
export function endOfDayUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/**
 * Get a date N days ago from now, as UTC YYYY-MM-DD
 */
export function daysAgoUTC(days: number): string {
  const now = new Date();
  const past = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days
  ));
  return formatDateUTC(past);
}

/**
 * Get a date N months ago from now, as UTC YYYY-MM-DD
 */
export function monthsAgoUTC(months: number): string {
  const now = new Date();
  const past = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - months,
    now.getUTCDate()
  ));
  return formatDateUTC(past);
}

/**
 * Get a date N years ago from now, as UTC YYYY-MM-DD
 */
export function yearsAgoUTC(years: number): string {
  const now = new Date();
  const past = new Date(Date.UTC(
    now.getUTCFullYear() - years,
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  return formatDateUTC(past);
}

// =============================================================================
// Display Formatting
// =============================================================================

/**
 * Format a timestamp for display based on user's timezone preference
 * @param timestamp - ISO string or Unix timestamp (ms)
 * @param preference - 'utc' or 'local'
 * @param includeTime - Whether to include time component
 */
export function formatForDisplay(
  timestamp: string | number | Date,
  preference: TimezonePreference,
  includeTime: boolean = true
): string {
  const date = new Date(timestamp);

  if (preference === 'utc') {
    if (includeTime) {
      return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
    }
    return formatDateUTC(date);
  }

  // Local time display
  if (includeTime) {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  }
  return formatDateLocal(date);
}

/**
 * Format a timestamp as relative time (e.g., "3 minutes ago")
 * This is timezone-agnostic since it's relative to now
 */
export function formatRelativeTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  // Fall back to formatted date for older items
  return formatDateLocal(date);
}

/**
 * Format date range for display in UI
 * Shows "UTC" suffix when in UTC mode
 */
export function formatDateRangeForDisplay(
  startDate: string,
  endDate: string,
  preference: TimezonePreference
): string {
  const suffix = preference === 'utc' ? ' (UTC)' : '';
  return `${startDate} → ${endDate}${suffix}`;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if a string is a valid YYYY-MM-DD date
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(date.getTime());
}

/**
 * Parse a date string as UTC
 * @param dateStr - YYYY-MM-DD string
 * @returns Date object representing midnight UTC on that day
 */
export function parseDateAsUTC(dateStr: string): Date {
  return startOfDayUTC(dateStr);
}

// =============================================================================
// Timezone Info
// =============================================================================

/**
 * Get the user's local timezone offset as a string (e.g., "UTC-8" or "UTC+5:30")
 */
export function getLocalTimezoneOffset(): string {
  const offsetMin = new Date().getTimezoneOffset();
  const sign = offsetMin <= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMin);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Get the user's local timezone name (e.g., "America/Los_Angeles")
 */
export function getLocalTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// =============================================================================
// UTC Date Range Presets for Seeding
// =============================================================================

export interface DateRange {
  startDate: string; // YYYY-MM-DD in UTC
  endDate: string;   // YYYY-MM-DD in UTC
}

/**
 * Get date range for "Last N months" in UTC
 */
export function getLastMonthsRangeUTC(months: number): DateRange {
  return {
    startDate: monthsAgoUTC(months),
    endDate: getTodayUTC(),
  };
}

/**
 * Get date range for "Last N years" in UTC
 */
export function getLastYearsRangeUTC(years: number): DateRange {
  return {
    startDate: yearsAgoUTC(years),
    endDate: getTodayUTC(),
  };
}

/**
 * Get date range for a specific decade (e.g., 2010-2019)
 */
export function getDecadeRangeUTC(startYear: number): DateRange {
  return {
    startDate: `${startYear}-01-01`,
    endDate: `${startYear + 9}-12-31`,
  };
}
