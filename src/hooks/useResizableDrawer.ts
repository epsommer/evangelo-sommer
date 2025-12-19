"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseResizableDrawerOptions {
  minHeight: number
  maxHeight: number
  defaultHeight?: number
  snapThreshold?: number
  onHeightChange?: (height: number) => void
}

interface UseResizableDrawerReturn {
  height: number
  isExpanded: boolean
  isDragging: boolean
  handlePointerDown: (e: React.PointerEvent) => void
  toggleExpanded: () => void
  setHeight: (height: number) => void
}

/**
 * Hook for managing resizable drawer behavior with touch and mouse support
 *
 * Features:
 * - Drag to resize with smooth animations
 * - Snap to min/max heights when close to threshold
 * - Touch and mouse event support
 * - Session-based height persistence (not across page reloads)
 *
 * @param options Configuration options for drawer behavior
 * @returns Drawer state and handlers
 */
export function useResizableDrawer({
  minHeight,
  maxHeight,
  defaultHeight = minHeight,
  snapThreshold = 50,
  onHeightChange
}: UseResizableDrawerOptions): UseResizableDrawerReturn {
  const [height, setHeightState] = useState(defaultHeight)
  const [isDragging, setIsDragging] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultHeight > minHeight + snapThreshold)

  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  const setHeight = useCallback((newHeight: number) => {
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))
    setHeightState(clampedHeight)
    setIsExpanded(clampedHeight > minHeight + snapThreshold)
    onHeightChange?.(clampedHeight)
  }, [minHeight, maxHeight, snapThreshold, onHeightChange])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return

    const deltaY = startYRef.current - e.clientY
    const newHeight = startHeightRef.current + deltaY

    setHeight(newHeight)
  }, [isDragging, setHeight])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // Snap to min or max if close to threshold
    const currentHeight = height
    if (currentHeight < minHeight + snapThreshold) {
      setHeight(minHeight)
    } else if (currentHeight > maxHeight - snapThreshold) {
      setHeight(maxHeight)
    }
  }, [isDragging, height, minHeight, maxHeight, snapThreshold, setHeight])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = height
  }, [height])

  const toggleExpanded = useCallback(() => {
    if (isExpanded) {
      setHeight(minHeight)
    } else {
      setHeight(maxHeight)
    }
  }, [isExpanded, minHeight, maxHeight, setHeight])

  // Attach global pointer event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)

      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerUp)
      }
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  return {
    height,
    isExpanded,
    isDragging,
    handlePointerDown,
    toggleExpanded,
    setHeight
  }
}
