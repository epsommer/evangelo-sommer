"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { format, addDays } from 'date-fns'

const DEFAULT_PIXELS_PER_HOUR = 80
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
 * Clamps to 24-hour boundary (max 23:45 for 15-min snapping)
 */
function yToTime(y: number, gridTop: number, pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR) {
  const relativeY = Math.max(0, y - gridTop)
  const totalMinutes = (relativeY / pixelsPerHour) * 60

  // Clamp total minutes to max 24 hours (1440 minutes)
  // Use 23:45 as max since that's the last 15-min snap point before midnight
  const clampedTotalMinutes = Math.min(totalMinutes, 23 * 60 + 45)

  const hour = Math.floor(clampedTotalMinutes / 60)
  const minutes = Math.round((clampedTotalMinutes % 60) / SNAP_MINUTES) * SNAP_MINUTES

  // Clamp to valid range
  const clampedHour = Math.max(0, Math.min(23, hour))
  const clampedMinutes = Math.max(0, Math.min(45, minutes)) // Max 45 for last snap point

  return { hour: clampedHour, minutes: clampedMinutes }
}

/**
 * Convert X position to day column index
 * @param maxDayIndex - Maximum valid day index (0 for day view, 6 for week view)
 */
function xToDay(x: number, gridLeft: number, timeColumnWidth: number, columnWidth: number, maxDayIndex: number = 6) {
  const relativeX = x - gridLeft - timeColumnWidth
  const dayIndex = Math.floor(relativeX / columnWidth)

  // Clamp to valid range (0 to maxDayIndex)
  return Math.max(0, Math.min(maxDayIndex, dayIndex))
}

/**
 * Calculate duration between two date/times
 * For same-day events, clamps to not exceed midnight
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
  let durationMinutes = Math.round(durationMs / (1000 * 60))

  // For same-day events, cap duration so event doesn't extend past midnight
  if (startDate === endDate) {
    const startTotalMinutes = startHour * 60 + startMinutes
    const maxDuration = (24 * 60) - startTotalMinutes // Minutes until midnight
    durationMinutes = Math.min(durationMinutes, maxDuration)
  }

  // Ensure minimum duration
  return Math.max(MIN_DURATION_MINUTES, durationMinutes)
}

/**
 * Hook for managing click-and-drag event creation
 * @param gridContainerRef - Reference to the grid container element
 * @param weekStartDate - Start date (for week view) or current date (for day view)
 * @param callbacks - Optional callbacks for drag events
 * @param pixelsPerHour - Pixels per hour for time calculations
 * @param dayColumnCount - Number of day columns (1 for day view, 7 for week view)
 */
export function useEventCreationDrag(
  gridContainerRef: React.RefObject<HTMLElement | null>,
  weekStartDate: Date,
  callbacks: DragCallbacks = {},
  pixelsPerHour: number = DEFAULT_PIXELS_PER_HOUR,
  dayColumnCount: number = 7
): UseEventCreationDragResult {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isTrackingMouse, setIsTrackingMouse] = useState(false) // State to trigger listener setup

  // Use refs for callbacks to avoid re-creating memoized functions
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Use ref for weekStartDate to avoid dependency issues
  const weekStartDateRef = useRef(weekStartDate)
  weekStartDateRef.current = weekStartDate

  // Use ref for pixelsPerHour to avoid dependency issues
  const pixelsPerHourRef = useRef(pixelsPerHour)
  pixelsPerHourRef.current = pixelsPerHour

  // Use ref for dayColumnCount to avoid dependency issues
  const dayColumnCountRef = useRef(dayColumnCount)
  dayColumnCountRef.current = dayColumnCount

  const dragStartRef = useRef<{
    date: string
    hour: number
    minutes: number // Precise minutes from click position
    dayIndex: number
    mouseY: number
    mouseX: number
    gridTop: number
    gridLeft: number
    timeColumnWidth: number
    dayColumnWidth: number
  } | null>(null)

  // Track last drag state values to prevent redundant updates
  const lastDragStateRef = useRef<{
    startDate: string
    startHour: number
    startMinutes: number
    currentDate: string
    currentHour: number
    currentMinutes: number
    duration: number
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

      // Calculate grid layout dimensions based on dayColumnCount
      // For day view (1 column), we don't need X-based day calculations
      const totalWidth = rect.width
      const numColumns = dayColumnCountRef.current
      const timeColumnWidth = totalWidth / (numColumns + 1) // 1 time column + N day columns
      const dayColumnWidth = numColumns > 0 ? (totalWidth - timeColumnWidth) / numColumns : totalWidth

      // Calculate precise start time from mouse Y position (not just the integer hour)
      const initialTime = yToTime(e.clientY, rect.top, pixelsPerHourRef.current)

      // Store initial drag data with precise time
      dragStartRef.current = {
        date,
        hour: initialTime.hour,
        minutes: initialTime.minutes, // Store precise minutes from click position
        dayIndex,
        mouseY: e.clientY,
        mouseX: e.clientX,
        gridTop: rect.top,
        gridLeft: rect.left,
        timeColumnWidth,
        dayColumnWidth
      }

      mouseMoveStartedRef.current = false
      setIsTrackingMouse(true) // Trigger useEffect to add global listeners
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
    }

    if (mouseMoveStartedRef.current) {
      // Calculate current time from mouse position
      const currentTime = yToTime(e.clientY, startData.gridTop, pixelsPerHourRef.current)
      // For day view (1 column), maxDayIndex is 0; for week view (7 columns), it's 6
      const maxDayIndex = Math.max(0, dayColumnCountRef.current - 1)
      const currentDayIndex = xToDay(e.clientX, startData.gridLeft, startData.timeColumnWidth, startData.dayColumnWidth, maxDayIndex)

      // Calculate current date based on day index (use ref to avoid dependency)
      const currentDate = format(addDays(weekStartDateRef.current, currentDayIndex), 'yyyy-MM-dd')

      // Determine start and end based on drag direction
      // Use precise minutes from initial click position
      let startDate = startData.date
      let startHour = startData.hour
      let startMinutes = startData.minutes
      let endDate = currentDate
      let endHour = currentTime.hour
      let endMinutes = currentTime.minutes

      // Handle backward drag (swap start and end)
      const startDateTime = new Date(`${startDate}T${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}:00`)
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

      // Check if values have actually changed to prevent redundant updates
      const lastState = lastDragStateRef.current
      const hasChanged = !lastState ||
        lastState.startDate !== startDate ||
        lastState.startHour !== startHour ||
        lastState.startMinutes !== startMinutes ||
        lastState.currentDate !== endDate ||
        lastState.currentHour !== endHour ||
        lastState.currentMinutes !== endMinutes ||
        lastState.duration !== duration

      if (hasChanged) {
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

        // Update ref before state to track what we're setting
        lastDragStateRef.current = {
          startDate,
          startHour,
          startMinutes,
          currentDate: endDate,
          currentHour: endHour,
          currentMinutes: endMinutes,
          duration
        }

        setDragState(newDragState)
        callbacksRef.current.onDragMove?.(newDragState)
      }
    }
  }, []) // No dependencies - uses refs instead

  // Use ref to access dragState without dependency
  const dragStateRef = useRef(dragState)
  dragStateRef.current = dragState

  /**
   * Handle mouse up (end drag)
   */
  const handleMouseUp = useCallback(() => {
    if (mouseMoveStartedRef.current && dragStateRef.current) {
      callbacksRef.current.onDragEnd?.(dragStateRef.current)
    }

    // Reset drag tracking
    dragStartRef.current = null
    mouseMoveStartedRef.current = false
    setIsDragging(false)
    setIsTrackingMouse(false) // Stop tracking mouse

    // Note: We don't clear dragState here - parent component should do that
    // after syncing with sidebar form
  }, []) // No dependencies - uses refs instead

  /**
   * Reset drag state (called by parent)
   */
  const resetDrag = useCallback(() => {
    setDragState(null)
    setIsDragging(false)
    setIsTrackingMouse(false)
    lastDragStateRef.current = null
    dragStartRef.current = null
    mouseMoveStartedRef.current = false
    clickCountRef.current = 0
  }, [])

  /**
   * Set up global mouse event listeners when tracking is active
   */
  useEffect(() => {
    if (isTrackingMouse) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isTrackingMouse, handleMouseMove, handleMouseUp])

  return {
    dragState,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetDrag
  }
}
