/**
 * Calendar Event Resize Calculations
 *
 * Utilities for calculating event positions, times, and constraints during resize operations.
 * Supports smooth mouse-following behavior with grid snapping.
 */

import { addMinutes, parseISO, format } from 'date-fns'
import { UnifiedEvent } from '@/components/EventCreationModal'

export const DEFAULT_PIXELS_PER_HOUR = 80
export const DEFAULT_SNAP_MINUTES = 15
export const MIN_EVENT_DURATION_MINUTES = 15

export type ResizeHandle =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface ResizeState {
  isResizing: boolean
  handle: ResizeHandle | null
  startY: number
  startX: number
  originalHeight: number
  originalWidth: number
  initialTop: number
  initialLeft: number
  currentDeltaY: number
  currentDeltaX: number
  previewStart?: string
  previewEnd?: string
}

export interface ResizeBounds {
  minTop: number
  maxTop: number
  minLeft: number
  maxLeft: number
  minHeight: number
  maxHeight: number
  minWidth: number
  maxWidth: number
}

export interface TimeCalculation {
  newStart: Date
  newEnd: Date
  duration: number
}

/**
 * Convert pixels to minutes based on pixels per hour
 */
export function pixelsToMinutes(pixels: number, pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR): number {
  return Math.round((pixels / pixelsPerHour) * 60)
}

/**
 * Convert minutes to pixels based on pixels per hour
 */
export function minutesToPixels(minutes: number, pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR): number {
  return (minutes / 60) * pixelsPerHour
}

/**
 * Snap pixels to grid based on snap interval
 */
export function snapToGrid(
  pixels: number,
  snapMinutes: number = DEFAULT_SNAP_MINUTES,
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR
): number {
  const pixelsPerSnap = minutesToPixels(snapMinutes, pixelsPerHour)
  return Math.round(pixels / pixelsPerSnap) * pixelsPerSnap
}

/**
 * Snap time to nearest interval
 */
export function snapTimeToInterval(date: Date, snapMinutes: number = DEFAULT_SNAP_MINUTES): Date {
  const minutes = date.getMinutes()
  const snappedMinutes = Math.round(minutes / snapMinutes) * snapMinutes
  const result = new Date(date)
  result.setMinutes(snappedMinutes)
  result.setSeconds(0)
  result.setMilliseconds(0)
  return result
}

/**
 * Calculate new event times based on resize delta
 */
export function calculateResizedTimes(
  event: UnifiedEvent,
  deltaY: number,
  handle: ResizeHandle,
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR,
  snapMinutes: number = DEFAULT_SNAP_MINUTES
): TimeCalculation {
  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  // Snap delta to grid
  const snappedDelta = snapToGrid(deltaY, snapMinutes, pixelsPerHour)
  const deltaMinutes = pixelsToMinutes(snappedDelta, pixelsPerHour)

  let newStart = currentStart
  let newEnd = currentEnd

  // Handle vertical resize (top/bottom handles)
  if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
    // Top handle: adjust start time, keep end time fixed
    newStart = addMinutes(currentStart, deltaMinutes)

    // Ensure minimum duration
    if (newStart >= addMinutes(currentEnd, -MIN_EVENT_DURATION_MINUTES)) {
      newStart = addMinutes(currentEnd, -MIN_EVENT_DURATION_MINUTES)
    }
  } else if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
    // Bottom handle: adjust end time, keep start time fixed
    newEnd = addMinutes(currentEnd, deltaMinutes)

    // Ensure minimum duration
    if (newEnd <= addMinutes(currentStart, MIN_EVENT_DURATION_MINUTES)) {
      newEnd = addMinutes(currentStart, MIN_EVENT_DURATION_MINUTES)
    }
  }

  const duration = Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60))

  return { newStart, newEnd, duration }
}

/**
 * Calculate visual styles for resize preview
 */
export function calculateResizePreviewStyles(
  resizeState: ResizeState,
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR,
  snapMinutes: number = DEFAULT_SNAP_MINUTES
): React.CSSProperties {
  const styles: React.CSSProperties = {}

  if (!resizeState.isResizing || !resizeState.handle) {
    return styles
  }

  const snapDeltaY = snapToGrid(resizeState.currentDeltaY, snapMinutes, pixelsPerHour)
  const minHeight = minutesToPixels(MIN_EVENT_DURATION_MINUTES, pixelsPerHour)

  const { handle, originalHeight, initialTop } = resizeState

  // Apply resize transformations based on handle
  if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
    // Top handle resize: extend/shrink from the top
    if (snapDeltaY < 0) {
      // Extending upward: move element up and increase height
      styles.position = 'absolute'
      styles.top = `${initialTop + snapDeltaY}px`
      styles.height = `${originalHeight + Math.abs(snapDeltaY)}px`
    } else {
      // Shrinking from top: move element down and decrease height
      styles.position = 'absolute'
      styles.top = `${initialTop + snapDeltaY}px`
      styles.height = `${Math.max(minHeight, originalHeight - snapDeltaY)}px`
    }
  } else if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
    // Bottom handle resize: extend/shrink from the bottom
    styles.position = 'absolute'
    styles.top = `${initialTop}px`
    styles.height = `${Math.max(minHeight, originalHeight + snapDeltaY)}px`
  }

  // Visual feedback styling
  styles.transition = 'none'
  styles.zIndex = 1000
  styles.border = '2px dashed #f59e0b'
  styles.backgroundColor = 'rgba(245, 158, 11, 0.15)'

  return styles
}

/**
 * Enforce calendar bounds during resize
 */
export function enforceResizeBounds(
  top: number,
  height: number,
  bounds: ResizeBounds
): { top: number; height: number } {
  let newTop = Math.max(bounds.minTop, Math.min(top, bounds.maxTop))
  let newHeight = Math.max(bounds.minHeight, Math.min(height, bounds.maxHeight))

  // Ensure event doesn't exceed bottom bound
  if (newTop + newHeight > bounds.maxTop + bounds.maxHeight) {
    newHeight = bounds.maxTop + bounds.maxHeight - newTop
  }

  // Ensure minimum height is maintained
  if (newHeight < bounds.minHeight) {
    newHeight = bounds.minHeight
    newTop = Math.min(newTop, bounds.maxTop + bounds.maxHeight - bounds.minHeight)
  }

  return { top: newTop, height: newHeight }
}

/**
 * Format time range for tooltip display
 */
export function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}m`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}

/**
 * Check if resize handle is a corner handle
 */
export function isCornerHandle(handle: ResizeHandle): boolean {
  return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handle)
}

/**
 * Check if resize handle affects vertical dimension
 */
export function isVerticalHandle(handle: ResizeHandle): boolean {
  return ['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handle)
}

/**
 * Check if resize handle affects horizontal dimension
 */
export function isHorizontalHandle(handle: ResizeHandle): boolean {
  return ['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(handle)
}

/**
 * Get cursor style for resize handle
 */
export function getCursorForHandle(handle: ResizeHandle): string {
  switch (handle) {
    case 'top':
      return 'n-resize'
    case 'bottom':
      return 's-resize'
    case 'left':
      return 'w-resize'
    case 'right':
      return 'e-resize'
    case 'top-left':
      return 'nw-resize'
    case 'top-right':
      return 'ne-resize'
    case 'bottom-left':
      return 'sw-resize'
    case 'bottom-right':
      return 'se-resize'
    default:
      return 'default'
  }
}

/**
 * Calculate time from pixel position
 */
export function pixelPositionToTime(
  pixelY: number,
  startHour: number = 0,
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR,
  baseDate: Date = new Date()
): Date {
  const totalMinutes = pixelsToMinutes(pixelY, pixelsPerHour)
  const hours = Math.floor(totalMinutes / 60) + startHour
  const minutes = totalMinutes % 60

  const result = new Date(baseDate)
  result.setHours(hours, minutes, 0, 0)

  return result
}

/**
 * Calculate pixel position from time
 */
export function timeToPixelPosition(
  time: Date,
  startHour: number = 0,
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR
): number {
  const hours = time.getHours() - startHour
  const minutes = time.getMinutes()
  const totalMinutes = hours * 60 + minutes

  return minutesToPixels(totalMinutes, pixelsPerHour)
}
