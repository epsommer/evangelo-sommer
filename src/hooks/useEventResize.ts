"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { parseISO, format } from 'date-fns'
import { UnifiedEvent } from '@/components/EventCreationModal'
import {
  ResizeHandle,
  ResizeState,
  calculateResizedTimes,
  calculateResizePreviewStyles,
  DEFAULT_PIXELS_PER_HOUR,
  DEFAULT_SNAP_MINUTES
} from '@/utils/calendar/resizeCalculations'
import { useEventMutation } from './useEventMutation'

export interface UseEventResizeOptions {
  pixelsPerHour?: number
  snapMinutes?: number
  onResizeStart?: (event: UnifiedEvent, handle: ResizeHandle) => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  onResize?: (event: UnifiedEvent, previewStart: string, previewEnd: string) => void
  enablePersistence?: boolean
  onPersistSuccess?: (event: UnifiedEvent) => void
  onPersistError?: (error: Error, originalEvent: UnifiedEvent) => void
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
    onPersistError
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
  const currentEventRef = useRef<UnifiedEvent | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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
        currentDeltaX: 0
      })

      setMousePosition({ x: clientX, y: clientY })
      currentEventRef.current = event

      onResizeStart?.(event, handle)
    },
    [onResizeStart]
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

        // Calculate preview times
        const timeCalc = calculateResizedTimes(
          currentEventRef.current!,
          deltaY,
          resizeState.handle!,
          pixelsPerHour,
          snapMinutes
        )

        const previewStart = format(timeCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
        const previewEnd = format(timeCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")

        // Update resize state with deltas and preview times
        setResizeState(prev => ({
          ...prev,
          currentDeltaY: deltaY,
          currentDeltaX: deltaX,
          previewStart,
          previewEnd
        }))

        // Notify parent of preview update
        onResize?.(currentEventRef.current!, previewStart, previewEnd)
      })
    },
    [resizeState.isResizing, resizeState.startY, resizeState.startX, resizeState.handle, pixelsPerHour, snapMinutes, onResize]
  )

  /**
   * Handle resize end with persistence
   */
  const handleResizeEndCallback = useCallback(async () => {
    if (!resizeState.isResizing || !currentEventRef.current || !resizeState.handle) return

    const event = currentEventRef.current
    const deltaY = resizeState.currentDeltaY

    // Calculate final times
    const timeCalc = calculateResizedTimes(
      event,
      deltaY,
      resizeState.handle,
      pixelsPerHour,
      snapMinutes
    )

    const newStartString = format(timeCalc.newStart, "yyyy-MM-dd'T'HH:mm:ss")
    const newEndString = format(timeCalc.newEnd, "yyyy-MM-dd'T'HH:mm:ss")

    // Original times for comparison
    const originalStart = parseISO(event.startDateTime)
    const originalEnd = event.endDateTime
      ? parseISO(event.endDateTime)
      : new Date(originalStart.getTime() + (event.duration || 60) * 60000)

    const originalStartString = format(originalStart, "yyyy-MM-dd'T'HH:mm:ss")
    const originalEndString = format(originalEnd, "yyyy-MM-dd'T'HH:mm:ss")

    // Only trigger resize end if times actually changed
    if (newStartString !== originalStartString || newEndString !== originalEndString) {
      // Notify parent component
      onResizeEnd?.(event, newStartString, newEndString)

      // Persist to database if enabled
      if (enablePersistence) {
        console.log('🔄 Persisting resized event to database...')

        await updateEvent(event.id, {
          startDateTime: newStartString,
          endDateTime: newEndString,
          duration: Math.round((timeCalc.newEnd.getTime() - timeCalc.newStart.getTime()) / 60000)
        })
      }
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
      previewEnd: undefined
    })

    currentEventRef.current = null
  }, [resizeState, pixelsPerHour, snapMinutes, onResizeEnd, enablePersistence, updateEvent])

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
      handleResizeEndCallback()
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
    persistError: mutationState.error
  }
}
