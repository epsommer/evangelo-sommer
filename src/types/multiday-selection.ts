// Types for multi-day recurring event creation in calendar month view

export interface WeekdaySelection {
  weekdays: number[]; // Array of weekday indices (0-6, Sun-Sat)
  startWeekIndex: number; // Which week row started
  endWeekIndex: number; // Which week row ended (for multi-week)
  startDate: Date;
  endDate: Date;
  startTime: string; // HH:MM format
  duration: number; // minutes
}

export type DragMode = 'idle' | 'detecting' | 'horizontal_select' | 'vertical_convert' | 'creating';

export interface DragState {
  mode: DragMode;
  startDate: Date | null;
  currentDate: Date | null;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
  selection: WeekdaySelection | null;
}

export interface ResizeHandleState {
  isResizing: boolean;
  handle: 'top' | 'bottom' | null;
  initialSelection: WeekdaySelection | null;
  startY: number;
}

// Constants
export const VERTICAL_DRAG_THRESHOLD = 40; // pixels - when to switch to vertical mode
export const MIN_HORIZONTAL_DRAG = 10; // pixels - minimum horizontal movement to count as drag
export const DEFAULT_EVENT_DURATION = 15; // minutes - for recurring weekday events
export const DEFAULT_START_HOUR = 9; // 9 AM default start time
