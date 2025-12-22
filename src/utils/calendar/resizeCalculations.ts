/**
 * Calendar Event Resize Calculations
 *
 * Utilities for calculating event positions, times, and constraints during resize operations.
 * Supports smooth mouse-following behavior with grid snapping.
 */

import { addMinutes, addDays, parseISO, format } from 'date-fns'
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

/**
 * Grid context information for horizontal (multi-day) resize calculations
 */
export interface GridInfo {
  dayColumnWidth: number      // Width of each day column in pixels
  timeColumnWidth: number     // Width of time column (first column) - 0 for month view
  containerLeft: number       // Left offset of the grid container
  weekStartDate: Date         // Start date of the current week/month (Sunday or month start)
  startDayIndex: number       // Original day index (0-6) of event start
  endDayIndex: number         // Original day index (0-6) of event end
  isMonthView?: boolean       // True if in month view (affects calculations)
}

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
  // Horizontal resize context for multi-day events
  gridInfo?: GridInfo
  // Preview day span for multi-day resize
  previewStartDayIndex?: number
  previewEndDayIndex?: number
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

export interface MultiDayTimeCalculation extends TimeCalculation {
  daySpan: number
  isMultiDay: boolean
  startDayIndex: number
  endDayIndex: number
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

  // Visual feedback styling - minimal changes to preserve original appearance
  styles.transition = 'none'
  styles.zIndex = 1000
  // Preserve width during resize - don't let it collapse
  styles.width = '100%'
  // Add subtle outline instead of changing background color
  styles.outline = '2px dashed #f59e0b'
  styles.outlineOffset = '-2px'

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

// ============================================================================
// HORIZONTAL (MULTI-DAY) RESIZE CALCULATIONS
// ============================================================================

/**
 * Calculate day index from mouse X position relative to the grid
 * Returns 0-6 (Sunday-Saturday) clamped to valid range
 */
export function calculateDayIndexFromX(
  clientX: number,
  gridInfo: GridInfo | undefined
): number {
  if (!gridInfo) return 0

  const { dayColumnWidth, timeColumnWidth, containerLeft } = gridInfo

  // Calculate relative X position within the day columns area
  const relativeX = clientX - containerLeft - timeColumnWidth

  // Calculate day index
  const dayIndex = Math.floor(relativeX / dayColumnWidth)

  // Clamp to valid range (0-6)
  return Math.max(0, Math.min(6, dayIndex))
}

/**
 * Calculate new start/end dates for horizontal resize
 * Left handles adjust start date, right handles adjust end date
 */
export function calculateHorizontalResizedDates(
  event: UnifiedEvent,
  newStartDayIndex: number,
  newEndDayIndex: number,
  handle: ResizeHandle,
  gridInfo: GridInfo
): { newStartDate: Date; newEndDate: Date; daySpan: number } {
  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  const { weekStartDate, startDayIndex, endDayIndex } = gridInfo

  let newStartDate = new Date(currentStart)
  let newEndDate = new Date(currentEnd)

  // Left handles (top-left, bottom-left) affect start date
  if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') {
    // Calculate day difference and apply to start date
    const dayDiff = newStartDayIndex - startDayIndex
    newStartDate = addDays(currentStart, dayDiff)

    // Don't allow start to go past end date
    if (newStartDate > newEndDate) {
      // Set to same day as end (minimum 1 day event)
      newStartDate = new Date(newEndDate)
      newStartDate.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0)
    }
  }

  // Right handles (top-right, bottom-right) affect end date
  if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') {
    // Calculate day difference and apply to end date
    const dayDiff = newEndDayIndex - endDayIndex
    newEndDate = addDays(currentEnd, dayDiff)

    // Don't allow end to go before start date
    if (newEndDate < newStartDate) {
      // Set to same day as start (minimum 1 day event)
      newEndDate = new Date(newStartDate)
      newEndDate.setHours(currentEnd.getHours(), currentEnd.getMinutes(), 0, 0)
    }
  }

  // Calculate day span (number of days the event spans)
  const startDay = new Date(newStartDate.getFullYear(), newStartDate.getMonth(), newStartDate.getDate())
  const endDay = new Date(newEndDate.getFullYear(), newEndDate.getMonth(), newEndDate.getDate())
  const daySpan = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1)

  return { newStartDate, newEndDate, daySpan }
}

/**
 * Combined calculation for corner handles - adjusts BOTH time (vertical) AND date (horizontal)
 */
export function calculateCornerResizedTimes(
  event: UnifiedEvent,
  deltaY: number,
  clientX: number,
  handle: ResizeHandle,
  pixelsPerHour: number,
  snapMinutes: number,
  gridInfo: GridInfo | undefined
): MultiDayTimeCalculation {
  // First, calculate vertical (time) changes
  const timeCalc = calculateResizedTimes(event, deltaY, handle, pixelsPerHour, snapMinutes)

  // If no grid info or not a horizontal handle, return time-only calculation
  if (!gridInfo || !isHorizontalHandle(handle)) {
    return {
      ...timeCalc,
      daySpan: 1,
      isMultiDay: false,
      startDayIndex: gridInfo?.startDayIndex ?? 0,
      endDayIndex: gridInfo?.endDayIndex ?? 0
    }
  }

  // Calculate which day column the mouse is currently over
  const currentDayIndex = calculateDayIndexFromX(clientX, gridInfo)

  // Determine new start and end day indices based on which handle is being dragged
  let newStartDayIndex = gridInfo.startDayIndex
  let newEndDayIndex = gridInfo.endDayIndex

  if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') {
    // Left handles change start day
    newStartDayIndex = Math.min(currentDayIndex, gridInfo.endDayIndex)
  }

  if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') {
    // Right handles change end day
    newEndDayIndex = Math.max(currentDayIndex, gridInfo.startDayIndex)
  }

  // Calculate horizontal (date) changes
  const dateCalc = calculateHorizontalResizedDates(
    event,
    newStartDayIndex,
    newEndDayIndex,
    handle,
    gridInfo
  )

  // Merge time and date calculations
  const newStart = new Date(dateCalc.newStartDate)
  newStart.setHours(timeCalc.newStart.getHours(), timeCalc.newStart.getMinutes(), 0, 0)

  const newEnd = new Date(dateCalc.newEndDate)
  newEnd.setHours(timeCalc.newEnd.getHours(), timeCalc.newEnd.getMinutes(), 0, 0)

  const duration = Math.round((newEnd.getTime() - newStart.getTime()) / (60 * 1000))
  const isMultiDay = dateCalc.daySpan > 1

  return {
    newStart,
    newEnd,
    duration,
    daySpan: dateCalc.daySpan,
    isMultiDay,
    startDayIndex: newStartDayIndex,
    endDayIndex: newEndDayIndex
  }
}

/**
 * Calculate new dates for month view horizontal resize (left/right handles only)
 * Handles week row wrapping - when extending past Saturday, continues to next week's Sunday
 * Only changes dates, preserves original times
 *
 * @deprecated Use calculateMonthViewResizedDatesFromTarget instead for better cross-row support
 */
export function calculateMonthViewResizedDates(
  event: UnifiedEvent,
  deltaX: number,
  handle: ResizeHandle,
  gridInfo: GridInfo
): MultiDayTimeCalculation {
  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  const { dayColumnWidth } = gridInfo

  // Calculate day offset from mouse movement
  const dayOffset = Math.round(deltaX / dayColumnWidth)

  let newStart = new Date(currentStart)
  let newEnd = new Date(currentEnd)

  if (handle === 'left') {
    // Left handle: adjust start date
    newStart = addDays(currentStart, dayOffset)

    // Don't allow start to go past end date
    if (newStart > newEnd) {
      newStart = new Date(newEnd)
      // Keep same time as original start
      newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0)
    }
  } else if (handle === 'right') {
    // Right handle: adjust end date
    newEnd = addDays(currentEnd, dayOffset)

    // Don't allow end to go before start date
    if (newEnd < newStart) {
      newEnd = new Date(newStart)
      // Keep same time as original end
      newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes(), 0, 0)
    }
  }

  // Calculate day span
  const startDay = new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate())
  const endDay = new Date(newEnd.getFullYear(), newEnd.getMonth(), newEnd.getDate())
  const daySpan = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  const isMultiDay = daySpan > 1

  const duration = Math.round((newEnd.getTime() - newStart.getTime()) / (60 * 1000))

  return {
    newStart,
    newEnd,
    duration,
    daySpan,
    isMultiDay,
    startDayIndex: newStart.getDay(),
    endDayIndex: newEnd.getDay()
  }
}

/**
 * Calculate new dates for month view horizontal resize based on target date
 * This version works correctly when cursor moves to different week rows
 *
 * @param event - The event being resized
 * @param targetDate - The date under the cursor (found via DOM query)
 * @param handle - Which resize handle is being dragged
 * @returns The new start/end dates and related info
 */
export function calculateMonthViewResizedDatesFromTarget(
  event: UnifiedEvent,
  targetDate: Date,
  handle: ResizeHandle
): MultiDayTimeCalculation {
  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  let newStart = new Date(currentStart)
  let newEnd = new Date(currentEnd)

  // Get just the date portion of target (no time)
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())

  if (handle === 'left') {
    // Left handle: set start date to target date, preserving original time
    newStart = new Date(targetDay)
    newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0)

    // Don't allow start to go past end date
    const endDay = new Date(currentEnd.getFullYear(), currentEnd.getMonth(), currentEnd.getDate())
    if (targetDay > endDay) {
      newStart = new Date(endDay)
      newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0)
    }
  } else if (handle === 'right') {
    // Right handle: set end date to target date, preserving original time
    newEnd = new Date(targetDay)
    newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes(), 0, 0)

    // Don't allow end to go before start date
    const startDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate())
    if (targetDay < startDay) {
      newEnd = new Date(startDay)
      newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes(), 0, 0)
    }
  }

  // Calculate day span
  const startDay = new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate())
  const endDay = new Date(newEnd.getFullYear(), newEnd.getMonth(), newEnd.getDate())
  const daySpan = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  const isMultiDay = daySpan > 1

  const duration = Math.round((newEnd.getTime() - newStart.getTime()) / (60 * 1000))

  return {
    newStart,
    newEnd,
    duration,
    daySpan,
    isMultiDay,
    startDayIndex: newStart.getDay(),
    endDayIndex: newEnd.getDay()
  }
}

// ============================================================================
// VERTICAL (MULTI-WEEK) RESIZE CALCULATIONS
// ============================================================================

/**
 * Calculate which week row a date belongs to in the month view
 * Week rows are indexed from 0 (first week) to 5 (last possible week)
 */
export function getWeekRowIndex(date: Date, monthStartDate: Date): number {
  // Get the start of the week containing the month start date (Sunday)
  const firstWeekStart = new Date(monthStartDate)
  firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay())

  // Calculate weeks difference
  const daysDiff = Math.floor((date.getTime() - firstWeekStart.getTime()) / (24 * 60 * 60 * 1000))
  return Math.floor(daysDiff / 7)
}

/**
 * Detect if a vertical resize crosses week row boundaries
 * Returns info about which weeks are being spanned
 */
export interface VerticalResizeWeekInfo {
  isVerticalWeekResize: boolean
  startWeekRow: number
  endWeekRow: number
  weekRowsSpanned: number
  direction: 'up' | 'down' | 'none'
}

export function detectVerticalWeekResize(
  event: UnifiedEvent,
  targetDate: Date,
  handle: ResizeHandle,
  monthStartDate: Date
): VerticalResizeWeekInfo {
  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  // Get week row indices for current event
  const originalStartWeek = getWeekRowIndex(currentStart, monthStartDate)
  const originalEndWeek = getWeekRowIndex(currentEnd, monthStartDate)

  // Get week row for target date
  const targetWeek = getWeekRowIndex(targetDate, monthStartDate)

  let startWeekRow = originalStartWeek
  let endWeekRow = originalEndWeek
  let direction: 'up' | 'down' | 'none' = 'none'

  // Determine which week boundaries are being crossed
  if (handle === 'top') {
    startWeekRow = targetWeek
    if (targetWeek < originalStartWeek) {
      direction = 'up'
    } else if (targetWeek > originalStartWeek) {
      direction = 'down'
    }
  } else if (handle === 'bottom') {
    endWeekRow = targetWeek
    if (targetWeek > originalEndWeek) {
      direction = 'down'
    } else if (targetWeek < originalEndWeek) {
      direction = 'up'
    }
  }

  const weekRowsSpanned = Math.abs(endWeekRow - startWeekRow) + 1
  const isVerticalWeekResize = weekRowsSpanned > 1 && direction !== 'none'

  return {
    isVerticalWeekResize,
    startWeekRow,
    endWeekRow,
    weekRowsSpanned,
    direction
  }
}

/**
 * Calculate the dates for weekly recurring instances when vertically resizing
 * Returns an array of {startDate, endDate} for each week the event should appear
 */
export interface WeeklyInstanceDates {
  startDateTime: string
  endDateTime: string
  weekRow: number
}

export function calculateWeeklyInstanceDates(
  event: UnifiedEvent,
  startWeekRow: number,
  endWeekRow: number,
  monthStartDate: Date
): WeeklyInstanceDates[] {
  const instances: WeeklyInstanceDates[] = []

  const currentStart = parseISO(event.startDateTime)
  const currentEnd = event.endDateTime
    ? parseISO(event.endDateTime)
    : addMinutes(currentStart, event.duration || 60)

  // Get the day-of-week span (e.g., Mon-Wed = days 1-3)
  const startDayOfWeek = currentStart.getDay()
  const endDayOfWeek = currentEnd.getDay()
  const timeStart = { hours: currentStart.getHours(), minutes: currentStart.getMinutes() }
  const timeEnd = { hours: currentEnd.getHours(), minutes: currentEnd.getMinutes() }

  // Calculate first week's Sunday
  const firstWeekStart = new Date(monthStartDate)
  firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay())

  // Generate instance for each week row
  for (let weekRow = startWeekRow; weekRow <= endWeekRow; weekRow++) {
    // Calculate the Sunday of this week row
    const weekSunday = new Date(firstWeekStart)
    weekSunday.setDate(weekSunday.getDate() + (weekRow * 7))

    // Calculate start date for this instance (Sunday + startDayOfWeek)
    const instanceStart = new Date(weekSunday)
    instanceStart.setDate(instanceStart.getDate() + startDayOfWeek)
    instanceStart.setHours(timeStart.hours, timeStart.minutes, 0, 0)

    // Calculate end date for this instance (Sunday + endDayOfWeek)
    const instanceEnd = new Date(weekSunday)
    instanceEnd.setDate(instanceEnd.getDate() + endDayOfWeek)
    instanceEnd.setHours(timeEnd.hours, timeEnd.minutes, 0, 0)

    instances.push({
      startDateTime: format(instanceStart, "yyyy-MM-dd'T'HH:mm:ss"),
      endDateTime: format(instanceEnd, "yyyy-MM-dd'T'HH:mm:ss"),
      weekRow
    })
  }

  return instances
}
