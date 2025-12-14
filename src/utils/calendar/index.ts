/**
 * Calendar Utilities Index
 *
 * Exports all calendar-related utilities for unified event handling
 */

export {
  eventsOverlap,
  findCollisionGroups,
  assignColumns,
  calculateEventPositions,
  getEventsForTimeSlot,
  calculateEventHeight,
  calculateEventTop,
  type EventPosition,
  type CollisionGroup
} from './eventOverlap'

export {
  pixelsToMinutes,
  minutesToPixels,
  snapToGrid,
  snapTimeToInterval,
  calculateResizedTimes,
  calculateResizePreviewStyles,
  enforceResizeBounds,
  formatTimeRange,
  formatDuration,
  isCornerHandle,
  isVerticalHandle,
  isHorizontalHandle,
  getCursorForHandle,
  pixelPositionToTime,
  timeToPixelPosition,
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_SNAP_MINUTES,
  MIN_EVENT_DURATION_MINUTES,
  type ResizeHandle,
  type ResizeState,
  type ResizeBounds,
  type TimeCalculation
} from './resizeCalculations'

export {
  calculateDragDropTimes,
  calculateTimeFromPixelPosition,
  verifyTimeCalculation,
  type DropSlot,
  type DragDropTimeCalculation
} from './dragCalculations'
