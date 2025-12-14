"use client"

import React from 'react'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { ResizeState } from '@/utils/calendar/resizeCalculations'

export interface ResizePreviewProps {
  event: UnifiedEvent
  resizeState: ResizeState
  containerRef?: React.RefObject<HTMLElement>
  className?: string
}

/**
 * ResizePreview Component
 *
 * Displays a live preview overlay showing the new event boundaries during resize.
 * Uses CSS transforms for smooth, performant updates without DOM reflows.
 */
const ResizePreview: React.FC<ResizePreviewProps> = ({
  event,
  resizeState,
  containerRef,
  className = ''
}) => {
  if (!resizeState.isResizing || !resizeState.handle) {
    return null
  }

  // Calculate preview dimensions based on resize state
  const previewStyles: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 999,
    border: '2px dashed #f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: '0.375rem',
    transition: 'none'
  }

  // Apply position and size based on resize handle
  const { handle, initialTop, initialLeft, originalHeight, originalWidth, currentDeltaY, currentDeltaX } = resizeState

  if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
    previewStyles.top = `${initialTop + currentDeltaY}px`
    previewStyles.height = `${originalHeight - currentDeltaY}px`
  } else if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
    previewStyles.top = `${initialTop}px`
    previewStyles.height = `${originalHeight + currentDeltaY}px`
  }

  // Handle horizontal resize for week view (if applicable)
  if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') {
    previewStyles.left = `${initialLeft + currentDeltaX}px`
    previewStyles.width = `${originalWidth - currentDeltaX}px`
  } else if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') {
    previewStyles.left = `${initialLeft}px`
    previewStyles.width = `${originalWidth + currentDeltaX}px`
  }

  return (
    <div
      className={`resize-preview ${className}`}
      style={previewStyles}
      data-event-id={event.id}
      data-resize-handle={handle}
    >
      {/* Preview time labels */}
      {resizeState.previewStart && resizeState.previewEnd && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
            <div className="font-mono">
              {new Date(resizeState.previewStart).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
              {' - '}
              {new Date(resizeState.previewEnd).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResizePreview
