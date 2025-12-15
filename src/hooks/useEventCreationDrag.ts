"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { format, addDays } from 'date-fns'

const PIXELS_PER_HOUR = 80
const SNAP_MINUTES = 15
const MIN_DURATION_MINUTES = 15
const DRAG_THRESHOLD_PX = 5 // Minimum movement to trigger drag mode
const DOUBLE_CLICK_WINDOW_MS = 300 // Time window for double-click detection

export interface DragState {
  isDragging: boolean
  startDate: string // 'yyyy-MM-dd'
  startHour: number // 0-23
  startMinutes: number // 0-59
  currentDate: string // 'yyyy-MM-dd'
  currentHour: number // 0-23
  currentMinutes: number // 0-59
  duration: number // in minutes
  isMultiDay: boolean
  startDayIndex: number // 0-6 (Sun-Sat)
  currentDayIndex: number // 0-6 (Sun-Sat)
}

export interface DragCallbacks {
  onDragStart?: (state: DragState) => void
  onDragMove?: (state: DragState) => void
  onDragEnd?: (state: DragState) => void
}

export interface UseEventCreationDragResult {
  dragState: DragState | null
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent, date: string, hour: number, dayIndex: number) => void
  handleMouseMove: (e: MouseEvent) => void
  handleMouseUp: () => void
  resetDrag: () => void
}

/**
 * Convert Y position to hour and minutes
 */
function yToTime(y: number, gridTop: number, pixelsPerHour: number = PIXELS_PER_HOUR) {
  const relativeY = Math.max(0, y - gridTop)
  const totalMinutes = (relativeY / pixelsPerHour) * 60
  const hour = Math.floor(totalMinutes / 60)
  const minutes = Math.round((totalMinutes % 60) / SNAP_MINUTES) * SNAP_MINUTES

  // Clamp to valid range
  const clampedHour = Math.max(0, Math.min(23, hour))
  const clampedMinutes = Math.max(0, Math.min(59, minutes))

  return { hour: clampedHour, minutes: clampedMinutes }
}

/**
 * Convert X position to day column index (0-6 for Sun-Sat)
 */
function xToDay(x: number, gridLeft: number, timeColumnWidth: number, columnWidth: number) {
  const relativeX = x - gridLeft - timeColumnWidth
  const dayIndex = Math.floor(relativeX / columnWidth)

  // Clamp to valid range (0-6)
  return Math.max(0, Math.min(6, dayIndex))
}

/**
 * Calculate duration between two date/times
 */
function calculateDuration(
  startDate: string,
  startHour: number,
  startMinutes: number,
  endDate: string,
  endHour: number,
  endMinutes: number
): number {
  const start = new Date(`${startDate}T${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}:00`)
  const end = new Date(`${endDate}T${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`)

  const durationMs = end.getTime() - start.getTime()
  const durationMinutes = Math.round(durationMs / (1000 * 60))

  // Ensure minimum duration
  return Math.max(MIN_DURATION_MINUTES, durationMinutes)
}

/**
 * Hook for managing click-and-drag event creation
 */
export function useEventCreationDrag(
  gridContainerRef: React.RefObject<HTMLElement | null>,
  weekStartDate: Date,
  callbacks: DragCallbacks = {}
): UseEventCreationDragResult {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartRef = useRef<{
    date: string
    hour: number
    dayIndex: number
    mouseY: number
    mouseX: number
    gridTop: number
    gridLeft: number
    timeColumnWidth: number
    dayColumnWidth: number
  } | null>(null)

  const mouseMoveStartedRef = useRef(false)
  const clickCountRef = useRef(0)
  const lastClickTimeRef = useRef(0)

  /**
   * Handle mouse down on a time slot (potentially second click of double-click)
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, date: string, hour: number, dayIndex: number) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current

    // Check if this is within double-click window
    if (timeSinceLastClick < DOUBLE_CLICK_WINDOW_MS) {
      clickCountRef.current += 1
    } else {
      clickCountRef.current = 1
    }

    lastClickTimeRef.current = now

    // Only track if this is the second click of a double-click
    if (clickCountRef.current === 2 && gridContainerRef.current) {
      e.preventDefault()

      const container = gridContainerRef.current
      const rect = container.getBoundingClientRect()

      // Calculate grid layout dimensions
      const totalWidth = rect.width
      const timeColumnWidth = totalWidth / 8 // 1 time column + 7 day columns
      const dayColumnWidth = (totalWidth - timeColumnWidth) / 7

      // Store initial drag data
      dragStartRef.current = {
        date,
        hour,
        dayIndex,
        mouseY: e.clientY,
        mouseX: e.clientX,
        gridTop: rect.top,
        gridLeft: rect.left,
        timeColumnWidth,
        dayColumnWidth
      }

      mouseMoveStartedRef.current = false

      console.log('🖱️ [useEventCreationDrag] Mouse down on second click - ready to drag', {
        date,
        hour,
        dayIndex,
        mouseY: e.clientY,
        mouseX: e.clientX
      })
    }
  }, [gridContainerRef])

  /**
   * Handle mouse move during potential drag
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return

    const startData = dragStartRef.current
    const deltaY = e.clientY - startData.mouseY
    const deltaX = e.clientX - startData.mouseX

    // Check if we've moved enough to trigger drag mode
    const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD_PX || Math.abs(deltaX) > DRAG_THRESHOLD_PX

    if (hasMoved && !mouseMoveStartedRef.current) {
      mouseMoveStartedRef.current = true
      setIsDragging(true)
      console.log('🖱️ [useEventCreationDrag] Drag mode activated')
    }

    if (mouseMoveStartedRef.current) {
      // Calculate current time from mouse position
      const currentTime = yToTime(e.clientY, startData.gridTop, PIXELS_PER_HOUR)
      const currentDayIndex = xToDay(e.clientX, startData.gridLeft, startData.timeColumnWidth, startData.dayColumnWidth)

      // Calculate current date based on day index
      const currentDate = format(addDays(weekStartDate, currentDayIndex), 'yyyy-MM-dd')

      // Determine start and end based on drag direction
      let startDate = startData.date
      let startHour = startData.hour
      let startMinutes = 0
      let endDate = currentDate
      let endHour = currentTime.hour
      let endMinutes = currentTime.minutes

      // Handle backward drag (swap start and end)
      const startDateTime = new Date(`${startDate}T${startHour.toString().padStart(2, '0')}:00:00`)
      const endDateTime = new Date(`${endDate}T${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`)

      if (endDateTime < startDateTime) {
        // Swap start and end
        [startDate, endDate] = [endDate, startDate]
        ;[startHour, endHour] = [endHour, startHour]
        ;[startMinutes, endMinutes] = [endMinutes, startMinutes]
      }

      // Calculate duration
      const duration = calculateDuration(startDate, startHour, startMinutes, endDate, endHour, endMinutes)

      // Check if multi-day
      const isMultiDay = startDate !== endDate

      const newDragState: DragState = {
        isDragging: true,
        startDate,
        startHour,
        startMinutes,
        currentDate: endDate,
        currentHour: endHour,
        currentMinutes: endMinutes,
        duration,
        isMultiDay,
        startDayIndex: startData.dayIndex,
        currentDayIndex
      }

      setDragState(newDragState)
      callbacks.onDragMove?.(newDragState)
    }
  }, [weekStartDate, callbacks])

  /**
   * Handle mouse up (end drag)
   */
  const handleMouseUp = useCallback(() => {
    if (mouseMoveStartedRef.current && dragState) {
      console.log('🖱️ [useEventCreationDrag] Drag ended', dragState)
      callbacks.onDragEnd?.(dragState)
    }

    // Reset drag tracking
    dragStartRef.current = null
    mouseMoveStartedRef.current = false
    setIsDragging(false)

    // Note: We don't clear dragState here - parent component should do that
    // after syncing with sidebar form
  }, [dragState, callbacks])

  /**
   * Reset drag state (called by parent)
   */
  const resetDrag = useCallback(() => {
    setDragState(null)
    setIsDragging(false)
    dragStartRef.current = null
    mouseMoveStartedRef.current = false
    clickCountRef.current = 0
  }, [])

  /**
   * Set up global mouse event listeners
   */
  useEffect(() => {
    if (dragStartRef.current) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [handleMouseMove, handleMouseUp])

  return {
    dragState,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetDrag
  }
}
