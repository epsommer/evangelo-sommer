"use client"

import React, { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'
import { formatDuration } from '@/utils/calendar/resizeCalculations'

export interface TimeTooltipProps {
  startTime: Date
  endTime: Date
  duration: number
  position: { x: number; y: number }
  isVisible: boolean
  className?: string
  /** Optional calendar container ref for boundary detection */
  calendarContainerRef?: React.RefObject<HTMLElement | null>
}

// Tooltip dimensions (approximate - used for boundary calculations)
const TOOLTIP_WIDTH = 160
const TOOLTIP_HEIGHT = 100
const HORIZONTAL_GAP = 8
const VERTICAL_OFFSET = 8

/**
 * TimeTooltip Component
 *
 * Displays current start/end times and duration during event resize operations.
 * Uses React Portal to render to document.body, escaping any parent CSS
 * transforms (like framer-motion) that would break fixed positioning.
 */
const TimeTooltip: React.FC<TimeTooltipProps> = ({
  startTime,
  endTime,
  duration,
  position,
  isVisible,
  className = '',
  calendarContainerRef
}) => {
  // Track if we're mounted (needed for Portal)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Calculate bounded position to keep tooltip within viewport
  const tooltipPosition = useMemo(() => {
    if (!isVisible) return { left: 0, top: 0, flipHorizontal: false, flipVertical: false }

    // Get viewport dimensions
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

    // Try to get calendar container bounds for more accurate boundary detection
    let rightBoundary = viewportWidth - 20 // Default with small margin

    if (calendarContainerRef?.current) {
      const rect = calendarContainerRef.current.getBoundingClientRect()
      rightBoundary = rect.right - 10 // Stay within calendar container
    } else {
      // Fallback: detect sidebar by looking for common sidebar selectors
      if (typeof document !== 'undefined') {
        const sidebar = document.querySelector('[data-sidebar]') ||
                       document.querySelector('.action-sidebar') ||
                       document.querySelector('[class*="sidebar"]')
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect()
          rightBoundary = sidebarRect.left - 10
        }
      }
    }

    let left = position.x + HORIZONTAL_GAP
    let top = position.y - VERTICAL_OFFSET
    let flipHorizontal = false
    let flipVertical = false

    // Check if tooltip would go past right boundary - flip to left side of cursor
    if (left + TOOLTIP_WIDTH > rightBoundary) {
      left = position.x - TOOLTIP_WIDTH - HORIZONTAL_GAP
      flipHorizontal = true
    }

    // Check if tooltip would go past left edge after flipping
    if (left < 10) {
      left = 10
    }

    // Check if tooltip would go above viewport - flip to below cursor
    if (top - TOOLTIP_HEIGHT < 10) {
      top = position.y + VERTICAL_OFFSET + 20
      flipVertical = true
    }

    // Clamp to bottom of viewport
    if (!flipVertical && top > viewportHeight - 10) {
      top = viewportHeight - TOOLTIP_HEIGHT - 10
    }

    return { left, top, flipHorizontal, flipVertical }
  }, [position, isVisible, calendarContainerRef])

  // Don't render if not visible or not mounted (SSR safety)
  if (!isVisible || !isMounted) return null

  const tooltipContent = (
    <div
      className={`
        fixed z-[99999] pointer-events-none
        bg-black/95 text-white
        px-3 py-2 rounded-lg shadow-2xl
        text-sm font-medium
        border border-accent/50
        ${className}
      `}
      style={{
        left: `${tooltipPosition.left}px`,
        top: `${tooltipPosition.top}px`,
        transform: tooltipPosition.flipVertical ? 'none' : 'translateY(-100%)',
        // Ensure no parent can affect this
        isolation: 'isolate'
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-accent" />
        <span className="text-accent font-bold">Resizing Event</span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Start:</span>
          <span className="font-mono text-white">{startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-gray-400">End:</span>
          <span className="font-mono text-white">{endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
        </div>

        <div className="flex justify-between gap-4 pt-1 border-t border-gray-700">
          <span className="text-gray-400">Duration:</span>
          <span className="font-mono text-accent">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Tooltip arrow - flips based on position */}
      <div
        className={`absolute w-0 h-0 border-l-4 border-r-4 border-transparent ${
          tooltipPosition.flipVertical
            ? 'top-0 border-b-4 border-b-black/95'
            : 'bottom-0 border-t-4 border-t-black/95'
        } ${
          tooltipPosition.flipHorizontal ? 'right-4' : 'left-4'
        }`}
        style={{
          transform: tooltipPosition.flipVertical ? 'translateY(-100%)' : 'translateY(100%)'
        }}
      />
    </div>
  )

  // Use Portal to render to document.body
  // This escapes any parent CSS transforms (like framer-motion)
  // that would break fixed positioning
  return createPortal(tooltipContent, document.body)
}

export default TimeTooltip
