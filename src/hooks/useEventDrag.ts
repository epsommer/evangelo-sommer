"use client"

import { useState, useCallback, useRef } from 'react'
import { parseISO, addMinutes, format } from 'date-fns'
import { UnifiedEvent } from '@/components/EventCreationModal'

export interface DragState {
  isDragging: boolean
  draggedEvent: UnifiedEvent | null
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  dragOffset: { x: number; y: number }
}

export interface UseEventDragOptions {
  pixelsPerHour?: number
  snapMinutes?: number
  onDragStart?: (event: UnifiedEvent) => void
  onDragEnd?: (event: UnifiedEvent, newStartTime: Date) => void
  onDrag?: (event: UnifiedEvent, previewStart: Date) => void
  enablePersistence?: boolean
}

export interface UseEventDragResult {
  dragState: DragState
  isDragging: boolean
  handleDragStart: (event: UnifiedEvent, clientX: number, clientY: number) => void
  handleDragMove: (clientX: number, clientY: number) => void
  handleDragEnd: () => void
  previewStyles: React.CSSProperties
  getPreviewTime: () => Date | null
}

const DEFAULT_PIXELS_PER_HOUR = 80
const DEFAULT_SNAP_MINUTES = 15

/**
 * useEventDrag Hook
 *
 * Manages drag state and calculations for calendar events with Framer Motion support.
 * Provides smooth mouse-following behavior with grid snapping.
 *
 * @param options - Configuration options for drag behavior
 * @returns Drag state and handlers
 */
export function useEventDrag(options: UseEventDragOptions = {}): UseEventDragResult {
  const {
    pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
    snapMinutes = DEFAULT_SNAP_MINUTES,
    onDragStart,
    onDragEnd,
    onDrag,
    enablePersistence = true
  } = options

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 }
  })

  const animationFrameRef = useRef<number | null>(null)

  /**
   * Calculate snapped pixel value based on snap interval
   */
  const snapToGrid = useCallback((pixels: number): number => {
    const pixelsPerSnap = (snapMinutes / 60) * pixelsPerHour
    return Math.round(pixels / pixelsPerSnap) * pixelsPerSnap
  }, [snapMinutes, pixelsPerHour])

  /**
   * Convert pixels to minutes
   */
  const pixelsToMinutes = useCallback((pixels: number): number => {
    return Math.round((pixels / pixelsPerHour) * 60)
  }, [pixelsPerHour])

  /**
   * Calculate new start time based on drag offset
   */
  const calculateNewStartTime = useCallback((
    event: UnifiedEvent,
    offsetY: number
  ): Date => {
    const currentStart = parseISO(event.startDateTime)
    const snappedOffset = snapToGrid(offsetY)
    const deltaMinutes = pixelsToMinutes(snappedOffset)

    return addMinutes(currentStart, deltaMinutes)
  }, [snapToGrid, pixelsToMinutes])

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback((
    event: UnifiedEvent,
    clientX: number,
    clientY: number
  ) => {
    setDragState({
      isDragging: true,
      draggedEvent: event,
      startPosition: { x: clientX, y: clientY },
      currentPosition: { x: clientX, y: clientY },
      dragOffset: { x: 0, y: 0 }
    })

    onDragStart?.(event)
  }, [onDragStart])

  /**
   * Handle drag move
   */
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging || !dragState.draggedEvent) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const offsetX = clientX - dragState.startPosition.x
      const offsetY = clientY - dragState.startPosition.y

      setDragState(prev => ({
        ...prev,
        currentPosition: { x: clientX, y: clientY },
        dragOffset: { x: offsetX, y: offsetY }
      }))

      // Notify parent of preview update
      if (onDrag && dragState.draggedEvent) {
        const previewStart = calculateNewStartTime(dragState.draggedEvent, offsetY)
        onDrag(dragState.draggedEvent, previewStart)
      }
    })
  }, [dragState, onDrag, calculateNewStartTime])

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedEvent) return

    const newStartTime = calculateNewStartTime(
      dragState.draggedEvent,
      dragState.dragOffset.y
    )

    // Only trigger if position actually changed
    const originalStart = parseISO(dragState.draggedEvent.startDateTime)
    if (newStartTime.getTime() !== originalStart.getTime()) {
      onDragEnd?.(dragState.draggedEvent, newStartTime)
    }

    // Reset state
    setDragState({
      isDragging: false,
      draggedEvent: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      dragOffset: { x: 0, y: 0 }
    })

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [dragState, calculateNewStartTime, onDragEnd])

  /**
   * Get preview time for current drag state
   */
  const getPreviewTime = useCallback((): Date | null => {
    if (!dragState.isDragging || !dragState.draggedEvent) return null

    return calculateNewStartTime(dragState.draggedEvent, dragState.dragOffset.y)
  }, [dragState, calculateNewStartTime])

  /**
   * Calculate preview styles for drag operation
   */
  const previewStyles: React.CSSProperties = dragState.isDragging
    ? {
        transform: `translateY(${snapToGrid(dragState.dragOffset.y)}px)`,
        transition: 'none',
        zIndex: 1000,
        opacity: 0.8
      }
    : {}

  return {
    dragState,
    isDragging: dragState.isDragging,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    previewStyles,
    getPreviewTime
  }
}
