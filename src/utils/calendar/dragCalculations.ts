/**
 * Calendar Event Drag & Drop Time Calculations
 *
 * Utilities for calculating event times during drag and drop operations.
 * Ensures timezone consistency and accurate time mapping.
 */

import { parseISO, format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns'
import { UnifiedEvent } from '@/components/EventCreationModal'

export interface DropSlot {
  date: string // Format: 'yyyy-MM-dd'
  hour: number // 0-23
  minute?: number // 0-59, defaults to 0
}

export interface DragDropTimeCalculation {
  newStartDateTime: string // ISO format without Z (local time)
  newEndDateTime: string // ISO format without Z (local time)
  duration: number // minutes
}

/**
 * Calculate new event times when dragging from one slot to another
 *
 * This function ensures:
 * - Timezone consistency (all times stay in local timezone)
 * - Accurate time mapping to the drop slot
 * - Preservation of event duration
 * - Preservation of original minutes/seconds if not specified in drop slot
 *
 * @param event - The event being dragged
 * @param fromSlot - The original time slot (not used but kept for API consistency)
 * @param toSlot - The target drop slot
 * @returns New start/end times and duration
 */
export function calculateDragDropTimes(
  event: UnifiedEvent,
  fromSlot: DropSlot,
  toSlot: DropSlot
): DragDropTimeCalculation {
  console.group('🎯 [dragCalculations] calculateDragDropTimes')

  // Parse original event times
  const originalStart = parseISO(event.startDateTime)
  const originalDuration = event.duration || 60 // Default to 60 minutes if not specified

  console.log('Original event:', {
    title: event.title,
    startDateTime: event.startDateTime,
    duration: originalDuration,
    parsedStart: originalStart.toISOString()
  })

  console.log('Drop target:', {
    date: toSlot.date,
    hour: toSlot.hour,
    minute: toSlot.minute || 0
  })

  // Create new start time using the drop slot
  // IMPORTANT: Use local date construction to avoid timezone issues
  const [year, month, day] = toSlot.date.split('-').map(Number)

  // Create date in local timezone
  let newStart = new Date(year, month - 1, day) // month is 0-indexed in Date constructor

  // Set the hour from the drop slot
  newStart = setHours(newStart, toSlot.hour)

  // Set minutes: use drop slot minute if provided, otherwise preserve original minutes
  const targetMinute = toSlot.minute !== undefined ? toSlot.minute : originalStart.getMinutes()
  newStart = setMinutes(newStart, targetMinute)

  // Clear seconds and milliseconds for clean time slots
  newStart = setSeconds(newStart, 0)
  newStart = setMilliseconds(newStart, 0)

  // Calculate new end time by adding the duration
  const newEnd = new Date(newStart.getTime() + originalDuration * 60000)

  // Format as ISO string WITHOUT timezone suffix (local time)
  // Using slice(0, 19) removes the timezone part, keeping it as local time
  const newStartDateTime = newStart.toISOString().slice(0, 19)
  const newEndDateTime = newEnd.toISOString().slice(0, 19)

  console.log('Calculated times:', {
    newStart: newStart.toISOString(),
    newEnd: newEnd.toISOString(),
    newStartDateTime,
    newEndDateTime,
    duration: originalDuration,
    verification: {
      expectedHour: toSlot.hour,
      actualHour: newStart.getHours(),
      expectedMinute: targetMinute,
      actualMinute: newStart.getMinutes(),
      match: newStart.getHours() === toSlot.hour && newStart.getMinutes() === targetMinute
    }
  })

  console.groupEnd()

  return {
    newStartDateTime,
    newEndDateTime,
    duration: originalDuration
  }
}

/**
 * Calculate time slot from pixel position
 * Useful for calculating drop position from mouse coordinates
 *
 * @param containerTop - Top offset of the calendar container
 * @param scrollTop - Scroll position of the container
 * @param clientY - Mouse Y position
 * @param pixelsPerHour - Height of one hour in pixels (default: 80)
 * @param snapMinutes - Snap interval in minutes (default: 15)
 * @returns Hour and minute for the drop position
 */
export function calculateTimeFromPixelPosition(
  containerTop: number,
  scrollTop: number,
  clientY: number,
  pixelsPerHour: number = 80,
  snapMinutes: number = 15
): { hour: number; minute: number } {
  // Calculate relative position within the scrollable container
  const relativeY = clientY - containerTop + scrollTop

  // Convert to total minutes from midnight
  const totalMinutes = Math.floor((relativeY / pixelsPerHour) * 60)

  // Snap to the nearest interval
  const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes

  // Calculate hour and minute
  const hour = Math.floor(snappedMinutes / 60)
  const minute = snappedMinutes % 60

  // Ensure values are within valid ranges
  const validHour = Math.max(0, Math.min(23, hour))
  const validMinute = Math.max(0, Math.min(59, minute))

  return { hour: validHour, minute: validMinute }
}

/**
 * Verify that calculated times match the intended drop slot
 * Useful for debugging timezone and calculation issues
 */
export function verifyTimeCalculation(
  calculatedTime: string,
  expectedSlot: DropSlot
): boolean {
  const parsed = parseISO(calculatedTime)
  const [year, month, day] = expectedSlot.date.split('-').map(Number)

  const dateMatches = (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )

  const hourMatches = parsed.getHours() === expectedSlot.hour
  const minuteMatches = expectedSlot.minute === undefined || parsed.getMinutes() === expectedSlot.minute

  return dateMatches && hourMatches && minuteMatches
}
