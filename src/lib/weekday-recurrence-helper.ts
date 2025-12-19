import { RecurrenceRule } from '@/components/EventCreationModal';
import { WeekdaySelection } from '@/types/multiday-selection';
import { format } from 'date-fns';

/**
 * Helper utilities for creating weekday-based recurring events
 */

export interface WeekdayRecurrenceConfig {
  weekdays: number[]; // 0-6 (Sun-Sat)
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  startTime: string; // HH:MM format
  duration: number; // minutes
  weekSpan: number; // number of weeks to repeat across
}

/**
 * Convert a WeekdaySelection to a recurrence rule configuration
 */
export function weekdaySelectionToRecurrence(
  selection: WeekdaySelection
): WeekdayRecurrenceConfig {
  const weekSpan = selection.endWeekIndex - selection.startWeekIndex + 1;

  return {
    weekdays: selection.weekdays,
    startDate: format(selection.startDate, 'yyyy-MM-dd'),
    endDate: format(selection.endDate, 'yyyy-MM-dd'),
    startTime: selection.startTime,
    duration: selection.duration,
    weekSpan,
  };
}

/**
 * Create a recurrence rule from weekday configuration
 * This creates daily events that only occur on specific weekdays
 */
export function createWeekdayRecurrenceRule(
  config: WeekdayRecurrenceConfig
): RecurrenceRule {
  return {
    frequency: 'weekly',
    interval: 1, // Every week
    intervalType: 'weeks',
    endDate: config.endDate,
    weekDays: config.weekdays,
  };
}

/**
 * Format weekday selection for display
 */
export function formatWeekdaySelection(weekdays: number[]): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (weekdays.length === 0) return 'No days selected';
  if (weekdays.length === 7) return 'Every day';

  // Check for weekdays (Mon-Fri)
  if (
    weekdays.length === 5 &&
    weekdays.includes(1) &&
    weekdays.includes(2) &&
    weekdays.includes(3) &&
    weekdays.includes(4) &&
    weekdays.includes(5)
  ) {
    return 'Weekdays (Mon-Fri)';
  }

  // Check for weekends
  if (weekdays.length === 2 && weekdays.includes(0) && weekdays.includes(6)) {
    return 'Weekends (Sat-Sun)';
  }

  // Otherwise, list the days
  if (weekdays.length <= 3) {
    return weekdays.map(day => dayNames[day]).join(', ');
  } else {
    return weekdays.map(day => shortNames[day]).join(', ');
  }
}

/**
 * Get a human-readable description of the recurrence
 */
export function describeWeekdayRecurrence(config: WeekdayRecurrenceConfig): string {
  const dayDescription = formatWeekdaySelection(config.weekdays);
  const weekDescription =
    config.weekSpan === 1
      ? 'this week'
      : config.weekSpan === 2
      ? 'next 2 weeks'
      : `next ${config.weekSpan} weeks`;

  const timeDescription = `${config.startTime} (${config.duration} min)`;

  return `${dayDescription} • ${weekDescription} • ${timeDescription}`;
}

/**
 * Pre-populate modal data from weekday selection
 */
export function prepareModalDataFromSelection(
  selection: WeekdaySelection,
  defaultTitle: string = 'Recurring Event'
) {
  const config = weekdaySelectionToRecurrence(selection);

  return {
    title: defaultTitle,
    date: config.startDate,
    startTime: config.startTime,
    duration: config.duration,
    endDate: config.endDate,
    isRecurring: true,
    recurrenceFrequency: 'weekly' as const,
    recurrenceInterval: 1,
    recurrenceEndDate: config.endDate,
    weekDays: config.weekdays,
    // Helper metadata for UI
    _weekdayConfig: config,
  };
}
