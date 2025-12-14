"use client"

import React from 'react'
import { ResizeHandle as HandleType, getCursorForHandle } from '@/utils/calendar/resizeCalculations'

export interface ResizeHandleProps {
  handle: HandleType
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, handle: HandleType) => void
  isVisible?: boolean
  isCompact?: boolean
  className?: string
}

/**
 * ResizeHandle Component
 *
 * Reusable resize handle for calendar events.
 * Supports both mouse and touch events with appropriate cursor styles.
 */
const ResizeHandle: React.FC<ResizeHandleProps> = ({
  handle,
  onResizeStart,
  isVisible = true,
  isCompact = false,
  className = ''
}) => {
  const cursor = getCursorForHandle(handle)

  const getHandleClasses = (): string => {
    const baseClasses = `
      absolute transition-all duration-200 z-50
      ${isCompact
        ? 'opacity-0 hover:opacity-80 group-hover:opacity-50'
        : 'opacity-20 hover:opacity-100 group-hover:opacity-60'}
      bg-accent/70 hover:bg-accent
      ${className}
    `

    // Position and size based on handle type
    switch (handle) {
      case 'top':
        return `${baseClasses} -top-1 left-2 right-2 ${isCompact ? 'h-1' : 'h-2'} cursor-n-resize rounded-full`

      case 'bottom':
        return `${baseClasses} -bottom-1 left-2 right-2 ${isCompact ? 'h-1' : 'h-2'} cursor-s-resize rounded-full`

      case 'left':
        return `${baseClasses} -left-1 top-2 bottom-2 ${isCompact ? 'w-1' : 'w-2'} cursor-w-resize rounded-full`

      case 'right':
        return `${baseClasses} -right-1 top-2 bottom-2 ${isCompact ? 'w-1' : 'w-2'} cursor-e-resize rounded-full`

      case 'top-left':
        return `${baseClasses} -top-1 -left-1 w-3 h-3 cursor-nw-resize rounded-full`

      case 'top-right':
        return `${baseClasses} -top-1 -right-1 w-3 h-3 cursor-ne-resize rounded-full`

      case 'bottom-left':
        return `${baseClasses} -bottom-1 -left-1 w-3 h-3 cursor-sw-resize rounded-full`

      case 'bottom-right':
        return `${baseClasses} -bottom-1 -right-1 w-3 h-3 cursor-se-resize rounded-full`

      default:
        return baseClasses
    }
  }

  const getHandleIndicator = () => {
    // Edge handles get a centered bar indicator
    if (['top', 'bottom'].includes(handle)) {
      return (
        <div
          className={`absolute ${handle === 'top' ? 'top-0' : 'bottom-0'} left-1/2 transform -translate-x-1/2 w-6 h-1 bg-current rounded-full opacity-60`}
        />
      )
    }

    if (['left', 'right'].includes(handle)) {
      return (
        <div
          className={`absolute ${handle === 'left' ? 'left-0' : 'right-0'} top-1/2 transform -translate-y-1/2 h-6 w-1 bg-current rounded-full opacity-60`}
        />
      )
    }

    // Corner handles don't need additional indicators
    return null
  }

  if (!isVisible) return null

  return (
    <div
      data-resize-handle={handle}
      draggable={false}
      className={getHandleClasses()}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onResizeStart(e, handle)
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onResizeStart(e, handle)
      }}
    >
      {getHandleIndicator()}
    </div>
  )
}

export default ResizeHandle
