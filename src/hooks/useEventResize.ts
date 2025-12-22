"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { parseISO, format } from 'date-fns'
import { UnifiedEvent } from '@/components/EventCreationModal'
import {
  ResizeHandle,
  ResizeState,
  GridInfo,
  calculateResizedTimes,
  calculateCornerResizedTimes,
  calculateMonthViewResizedDates,
  calculateMonthViewResizedDatesFromTarget,
  calculateResizePreviewStyles,
  isHorizontalHandle,
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_SNAP_MINUTES,
  detectVerticalWeekResize,
  calculateWeeklyInstanceDates,
  VerticalResizeWeekInfo,
  WeeklyInstanceDates
} from '@/utils/calendar/resizeCalculations'
import { useEventMutation } from './useEventMutation'

export interface UseEventResizeOptions {
  pixelsPerHour?: number
  snapMinutes?: number
  onResizeStart?: (event: UnifiedEvent, handle: ResizeHandle) => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string, isMultiDay?: boolean) => void
  onResize?: (event: UnifiedEvent, previewStart: string, previewEnd: string, daySpan: number, isMultiDay: boolean) => void
  enablePersistence?: boolean
  onPersistSuccess?: (event: UnifiedEvent) => void
  onPersistError?: (error: Error, originalEvent: UnifiedEvent) => void
  // Grid context for horizontal (multi-day) resize in week/month view
  gridContainerRef?: React.RefObject<HTMLElement | null>
  weekStartDate?: Date
  monthStartDate?: Date
  viewMode?: 'day' | 'week' | 'month'
  // Vertical week resize callback for creating weekly recurring instances
  onVerticalWeekResize?: (event: UnifiedEvent, weekInfo: VerticalResizeWeekInfo, instances: WeeklyInstanceDates[]) => void
}

export interface UseEventResizeResult {
  resizeState: ResizeState
  isResizing: boolean
  handleResizeStart: (
    e: React.MouseEvent | React.TouchEvent,
    event: UnifiedEvent,
    handle: ResizeHandle
  ) => void
  handleResizeEnd: () => void
  previewStyles: React.CSSProperties
  mousePosition: { x: number; y: number }
  isPersisting: boolean
  persistError: string | null
  // Multi-day preview info
  previewDaySpan: number
  isPreviewMultiDay: boolean
}

/**
 * useEventResize Hook
 *
 * Manages resize state and calculations for calendar events.
 * Provides smooth mouse-following behavior with grid snapping.
 * Includes database persistence and external calendar sync.
 *
 * @param options - Configuration options for resize behavior
 * @returns Resize state and handlers
 */
export function useEventResize(options: UseEventResizeOptions = {}): UseEventResizeResult {
  const {
    pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
    snapMinutes = DEFAULT_SNAP_MINUTES,
    onResizeStart,
    onResizeEnd,
    onResize,
    enablePersistence = true,
    onPersistSuccess,
    onPersistError,
    gridContainerRef,
    weekStartDate,
    monthStartDate,
    viewMode = 'day',
    onVerticalWeekResize
  } = options

  // Event mutation hook for persistence
  const { updateEvent, state: mutationState } = useEventMutation({
    onSuccess: onPersistSuccess,
    onError: onPersistError,
    showToasts: true
  })

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startY: 0,
    startX: 0,
    originalHeight: 0,
    originalWidth: 0,
    initialTop: 0,
    initialLeft: 0,
    currentDeltaY: 0,
    currentDeltaX: 0
  })

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [previewDaySpan, setPreviewDaySpan] = useState(1)
  const [isPreviewMultiDay, setIsPreviewMultiDay] = useState(false)
  const currentEventRef = useRef<UnifiedEvent | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startYRef = useRef<number>(0)
  const startXRef = useRef<number>(0)
  const currentHandleRef = useRef<ResizeHandle | null>(null)
  const gridInfoRef = useRef<GridInfo | null>(null)
  // Store last valid target date for when cursor goes outside bounds
  const lastValidTargetDateRef = useRef<Date | null>(null)

  /**
   * Find the day cell under the cursor position
   * Returns the date from the data-date attribute, or null if not over a day cell
   */
  const findDayUnderCursor = useCallback((clientX: number, clientY: number): Date | null => {
    if (!gridContainerRef?.current) return null

    // Query all day cells with data-date attribute
    const dayCells = gridContainerRef.current.querySelectorAll('[data-date]')

    for (const cell of dayCells) {
      const rect = cell.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        const dateStr = cell.getAttribute('data-date')
        if (dateStr) {
          // Parse as local date (append T00:00:00 to avoid UTC interpretation)
          return new Date(dateStr + 'T00:00:00')
        }
      }
    }

    return null
  }, [gridContainerRef])

  /**
   * Handle resize start
   */
  const handleResizeStart = useCallback(
    (
      e: React.MouseEvent | React.TouchEvent,
      event: UnifiedEvent,
      handle: ResizeHandle
    ) => {
      e.preventDefault()
      e.stopPropagation()

      const isTouch = 'touches' in e
      const clientY = isTouch ? e.touches[0].clientY : e.clientY
      const clientX = isTouch ? e.touches[0].clientX : e.clientX

      // Get the event element to capture its dimensions
      const eventElement = (e.currentTarget as HTMLElement).closest('[data-event-block]') as HTMLElement
      if (!eventElement) return

      const originalHeight = eventElement.offsetHeight
      const originalWidth = eventElement.offsetWidth
      const initialTop = eventElement.offsetTop
      const initialLeft = eventElement.offsetLeft

      // Store in refs for reliable access in callbacks
      startYRef.current = clientY
      startXRef.current = clientX
      currentHandleRef.current = handle
      currentEventRef.current = event

      // Capture grid info for horizontal resize in week/month view (corners and left/right handles)
      let gridInfo: GridInfo | undefined = undefined

      if (viewMode === 'week' && gridContainerRef?.current && isHorizontalHandle(handle) && weekStartDate) {
        const container = gridContainerRef.current
        const containerRect = container.getBoundingClientRect()

        // Grid has 8 columns: 1 time + 7 days
        // Calculate column widths from grid layout
        const totalWidth = containerRect.width
        const timeColumnWidth = totalWidth / 8 // First column is time
        const dayColumnWidth = (totalWidth - timeColumnWidth) / 7

        // Get event's current day index relative to week start
        const eventDate = parseISO(event.startDateTime)
        const eventEndDate = event.endDateTime ? parseISO(event.endDateTime) : eventDate

        // Calculate day index (0-6) within the week
        const startDayIndex = eventDate.getDay()
        const endDayIndex = eventEndDate.getDay()

        gridInfo = {
          dayColumnWidth,
          timeColumnWidth,
          containerLeft: containerRect.left,
          weekStartDate,
          startDayIndex,
          endDayIndex
        }

        gridInfoRef.current = gridInfo
      }

      // Month view: 7 columns (days), multiple rows (weeks)
      if (viewMode === 'month' && gridContainerRef?.current && isHorizontalHandle(handle) && monthStartDate) {
        const container = gridContainerRef.current
        const containerRect = container.getBoundingClientRect()

        // Month grid has 7 equal columns (no time column)
        const totalWidth = containerRect.width
        const dayColumnWidth = totalWidth / 7

        // Get event's current day index (0=Sun, 6=Sat)
        const eventDate = parseISO(event.startDateTime)
        const eventEndDate = event.endDateTime ? parseISO(event.endDateTime) : eventDate

        const startDayIndex = eventDate.getDay()
        const endDayIndex = eventEndDate.getDay()

        gridInfo = {
          dayColumnWidth,
          timeColumnWidth: 0, // No time column in month view
          containerLeft: containerRect.left,
          weekStartDate: monthStartDate, // Use month start for reference
          startDayIndex,
          endDayIndex,
          isMonthView: true
        }

        gridInfoRef.current = gridInfo
      }

      setResizeState({
        isResizing: true,
        handle,
        startY: clientY,
        startX: clientX,
        originalHeight,
        originalWidth,
        initialTop,
        initialLeft,
        currentDeltaY: 0,
        currentDeltaX: 0,
        gridInfo
      })

      setMousePosition({ x: clientX, y: clientY })
      setPreviewDaySpan(1)
      setIsPreviewMultiDay(false)

      onResizeStart?.(event, handle)
    },
    [onResizeStart, viewMode, gridContainerRef, weekStartDate]
  )

  /**
   * Handle resize move (mouse/touch move during resize)
   */
  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!resizeState.isResizing || !currentEventRef.current || !resizeState.handle) return

      // Use requestAnimationFrame for smooth updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const isTouch = 'touches' in e
        const clientY = isTouch ? e.touches[0].clientY : e.clientY
        const clientX = isTouch ? e.touches[0].clientX : e.clientX

        const deltaY = clientY - resizeState.startY
        const deltaX = clientX - resizeState.startX

        // Update mouse position for tooltip
        setMousePosition({ x: clientX, y: clientY })

        let previewStart: string
        let previewEnd: string
        let daySpan = 1
        let multiDay = false

        // Month view: use date-based resize calculation that works across week rows
        if (resizeState.gridInfo?.isMonthView && isHorizontalHandle(resizeState.handle!)) {
          // Find the actual day cell under the cursor
          const targetDate = findDayUnderCursor(clientX, clientY)

          if (targetDate) {
            // Store as last valid target in case cursor goes outside bounds
            lastValidTargetDateRef.current = targetDate

            const monthCalc = calculateMonthViewResizedDatesFromTarget(
              currentEventRef.current!,
              targetDate,
              resizeState.handle!
            )

            previewStart = format(monthCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
            previewEnd = format(monthCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
            daySpan = monthCalc.daySpan
            multiDay = monthCalc.isMultiDay

            // Update preview day span state
            setPreviewDaySpan(daySpan)
            setIsPreviewMultiDay(multiDay)
          } else if (lastValidTargetDateRef.current) {
            // Cursor is outside calendar bounds - use last valid target
            const monthCalc = calculateMonthViewResizedDatesFromTarget(
              currentEventRef.current!,
              lastValidTargetDateRef.current,
              resizeState.handle!
            )

            previewStart = format(monthCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
            previewEnd = format(monthCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
            daySpan = monthCalc.daySpan
            multiDay = monthCalc.isMultiDay
          } else {
            // Fallback to deltaX-based calculation (shouldn't happen often)
            const monthCalc = calculateMonthViewResizedDates(
              currentEventRef.current!,
              deltaX,
              resizeState.handle!,
              resizeState.gridInfo
            )

            previewStart = format(monthCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
            previewEnd = format(monthCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
            daySpan = monthCalc.daySpan
            multiDay = monthCalc.isMultiDay
          }

          // Update preview day span state
          setPreviewDaySpan(daySpan)
          setIsPreviewMultiDay(multiDay)
        }
        // Week view: use multi-day resize calculation for handles that affect horizontal dimension
        else if (isHorizontalHandle(resizeState.handle!) && resizeState.gridInfo) {
          const cornerCalc = calculateCornerResizedTimes(
            currentEventRef.current!,
            deltaY,
            clientX,
            resizeState.handle!,
            pixelsPerHour,
            snapMinutes,
            resizeState.gridInfo
          )

          previewStart = format(cornerCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
          previewEnd = format(cornerCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
          daySpan = cornerCalc.daySpan
          multiDay = cornerCalc.isMultiDay

          // Update preview day span state
          setPreviewDaySpan(daySpan)
          setIsPreviewMultiDay(multiDay)
        } else {
          // Standard vertical-only resize
          const timeCalc = calculateResizedTimes(
            currentEventRef.current!,
            deltaY,
            resizeState.handle!,
            pixelsPerHour,
            snapMinutes
          )

          previewStart = format(timeCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
          previewEnd = format(timeCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
        }

        // Update resize state with deltas and preview times
        setResizeState(prev => ({
          ...prev,
          currentDeltaY: deltaY,
          currentDeltaX: deltaX,
          previewStart,
          previewEnd
        }))

        // Notify parent of preview update with multi-day info for synchronous overlay updates
        onResize?.(currentEventRef.current!, previewStart, previewEnd, daySpan, multiDay)
      })
    },
    [resizeState.isResizing, resizeState.startY, resizeState.startX, resizeState.handle, resizeState.gridInfo, pixelsPerHour, snapMinutes, onResize, findDayUnderCursor]
  )

  /**
   * Handle resize end with persistence
   * @param finalClientY - The final Y position from the mouse/touch event
   * @param finalClientX - The final X position from the mouse/touch event
   */
  const handleResizeEndCallback = useCallback(async (finalClientY?: number, finalClientX?: number) => {
    if (!currentEventRef.current || !currentHandleRef.current) {
      return
    }

    const event = currentEventRef.current
    const handle = currentHandleRef.current
    const gridInfo = gridInfoRef.current

    // Calculate deltaY from the final mouse position if provided, otherwise use state
    let deltaY: number
    if (finalClientY !== undefined) {
      deltaY = finalClientY - startYRef.current
    } else {
      deltaY = resizeState.currentDeltaY
    }

    let newStartString: string
    let newEndString: string
    let duration: number
    let isMultiDay = false

    // Calculate deltaX from the final mouse position if provided
    let deltaX: number = 0
    if (finalClientX !== undefined) {
      deltaX = finalClientX - startXRef.current
    }

    // VERTICAL WEEK RESIZE DETECTION (month view only, top/bottom handles)
    // Detect if we're resizing vertically across week rows to create weekly recurrence
    if (gridInfo?.isMonthView && (handle === 'top' || handle === 'bottom') &&
        monthStartDate && finalClientX !== undefined && finalClientY !== undefined) {

      const targetDate = findDayUnderCursor(finalClientX, finalClientY)

      if (targetDate) {
        const weekInfo = detectVerticalWeekResize(
          event,
          targetDate,
          handle,
          monthStartDate
        )

        // If we're crossing week boundaries, trigger weekly recurrence creation
        if (weekInfo.isVerticalWeekResize && onVerticalWeekResize) {
          const instances = calculateWeeklyInstanceDates(
            event,
            weekInfo.startWeekRow,
            weekInfo.endWeekRow,
            monthStartDate
          )

          console.log('🔄 Vertical week resize detected:', {
            weekRowsSpanned: weekInfo.weekRowsSpanned,
            direction: weekInfo.direction,
            instanceCount: instances.length
          })

          // Call the vertical week resize callback - parent will handle instance creation
          onVerticalWeekResize(event, weekInfo, instances)

          // Reset state and return early - don't do normal resize
          setResizeState({
            isResizing: false,
            handle: null,
            startY: 0,
            startX: 0,
            originalHeight: 0,
            originalWidth: 0,
            initialTop: 0,
            initialLeft: 0,
            currentDeltaY: 0,
            currentDeltaX: 0,
            previewStart: undefined,
            previewEnd: undefined,
            gridInfo: undefined
          })

          setPreviewDaySpan(1)
          setIsPreviewMultiDay(false)
          gridInfoRef.current = null
          lastValidTargetDateRef.current = null
          currentEventRef.current = null
          currentHandleRef.current = null
          startYRef.current = 0

          return
        }
      }
    }

    // Month view: use target-date-based resize calculation that works across week rows
    if (gridInfo?.isMonthView && isHorizontalHandle(handle)) {
      // Find the day cell under the final cursor position
      let targetDate: Date | null = null
      if (finalClientX !== undefined && finalClientY !== undefined) {
        targetDate = findDayUnderCursor(finalClientX, finalClientY)
      }

      // Use target date if found, otherwise use last valid target
      const effectiveTargetDate = targetDate || lastValidTargetDateRef.current

      if (effectiveTargetDate) {
        const monthCalc = calculateMonthViewResizedDatesFromTarget(
          event,
          effectiveTargetDate,
          handle
        )

        newStartString = format(monthCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
        newEndString = format(monthCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
        duration = monthCalc.duration
        isMultiDay = monthCalc.isMultiDay

      } else {
        // Fallback to deltaX-based calculation
        const monthCalc = calculateMonthViewResizedDates(
          event,
          deltaX,
          handle,
          gridInfo
        )

        newStartString = format(monthCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
        newEndString = format(monthCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
        duration = monthCalc.duration
        isMultiDay = monthCalc.isMultiDay
      }
    }
    // Week view: use multi-day resize calculation for handles that affect horizontal dimension
    else if (isHorizontalHandle(handle) && gridInfo && finalClientX !== undefined) {
      const cornerCalc = calculateCornerResizedTimes(
        event,
        deltaY,
        finalClientX,
        handle,
        pixelsPerHour,
        snapMinutes,
        gridInfo
      )

      newStartString = format(cornerCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
      newEndString = format(cornerCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
      duration = cornerCalc.duration
      isMultiDay = cornerCalc.isMultiDay
    } else {
      // Standard vertical-only resize
      const timeCalc = calculateResizedTimes(
        event,
        deltaY,
        handle,
        pixelsPerHour,
        snapMinutes
      )

      newStartString = format(timeCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
      newEndString = format(timeCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")
      duration = timeCalc.duration
    }

    // Original times for comparison
    const originalStart = parseISO(event.startDateTime)
    const originalEnd = event.endDateTime
      ? parseISO(event.endDateTime)
      : new Date(originalStart.getTime() + (event.duration || 60) * 60000)

    const originalStartString = format(originalStart, "yyyy-MM-dd'T'HH:mm:ss")
    const originalEndString = format(originalEnd, "yyyy-MM-dd'T'HH:mm:ss")

    const timesChanged = newStartString !== originalStartString || newEndString !== originalEndString

    // Always notify parent that resize ended (so it can clear preview state)
    // Parent will receive the new times (which may be same as original if user cancelled)
    onResizeEnd?.(event, newStartString, newEndString, isMultiDay)

    // Only persist to database if times actually changed
    if (timesChanged && enablePersistence) {
      await updateEvent(event.id, {
        startDateTime: newStartString,
        endDateTime: newEndString,
        duration,
        isMultiDay
      })
    }

    // Reset state
    setResizeState({
      isResizing: false,
      handle: null,
      startY: 0,
      startX: 0,
      originalHeight: 0,
      originalWidth: 0,
      initialTop: 0,
      initialLeft: 0,
      currentDeltaY: 0,
      currentDeltaX: 0,
      previewStart: undefined,
      previewEnd: undefined,
      gridInfo: undefined
    })

    // Reset multi-day preview state
    setPreviewDaySpan(1)
    setIsPreviewMultiDay(false)
    gridInfoRef.current = null
    lastValidTargetDateRef.current = null

    currentEventRef.current = null
    currentHandleRef.current = null
    startYRef.current = 0
  }, [resizeState.currentDeltaY, pixelsPerHour, snapMinutes, onResizeEnd, enablePersistence, updateEvent, findDayUnderCursor, monthStartDate, onVerticalWeekResize])

  /**
   * Set up global mouse/touch event listeners during resize
   */
  useEffect(() => {
    if (!resizeState.isResizing) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      handleResizeMove(e)
    }

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      // Get the final X and Y positions from the mouse/touch event
      const isTouch = 'changedTouches' in e
      const finalClientY = isTouch ? e.changedTouches[0].clientY : e.clientY
      const finalClientX = isTouch ? e.changedTouches[0].clientX : e.clientX
      handleResizeEndCallback(finalClientY, finalClientX)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [resizeState.isResizing, handleResizeMove, handleResizeEndCallback])

  /**
   * Calculate preview styles
   */
  const previewStyles = calculateResizePreviewStyles(resizeState, pixelsPerHour, snapMinutes)

  return {
    resizeState,
    isResizing: resizeState.isResizing,
    handleResizeStart,
    handleResizeEnd: handleResizeEndCallback,
    previewStyles,
    mousePosition,
    isPersisting: mutationState.isLoading,
    persistError: mutationState.error,
    previewDaySpan,
    isPreviewMultiDay
  }
}
