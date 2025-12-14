"use client"

import React, { useState, useRef, useCallback } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Clock, MapPin, User, AlertTriangle, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'
import { ConflictResult } from '@/lib/conflict-detector'
import { EventPosition } from '@/utils/calendar/eventOverlap'
import ResizeHandle from '@/components/calendar/ResizeHandle'
import TimeTooltip from '@/components/calendar/TimeTooltip'
import { useEventResize } from '@/hooks/useEventResize'
import { ResizeHandle as HandleType } from '@/utils/calendar/resizeCalculations'

export type CalendarViewMode = 'day' | 'week' | 'month'

export interface CalendarEventProps {
  event: UnifiedEvent
  viewMode: CalendarViewMode
  position?: EventPosition
  conflicts?: ConflictResult
  conflictingEvents?: UnifiedEvent[]
  pixelsPerHour?: number
  isCompact?: boolean
  showResizeHandles?: boolean
  showDragHandle?: boolean
  onClick?: (event: UnifiedEvent) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  onDragStart?: (event: UnifiedEvent, handle: 'body') => void
  onDragEnd?: (event: UnifiedEvent) => void
  onResizeStart?: (event: UnifiedEvent, handle: HandleType) => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Unified CalendarEvent component
 * Adapts display based on view mode (day, week, month)
 * Supports Google Calendar-style overlap positioning
 */
const CalendarEvent: React.FC<CalendarEventProps> = ({
  event,
  viewMode,
  position,
  conflicts,
  conflictingEvents = [],
  pixelsPerHour = 80,
  isCompact = false,
  showResizeHandles = true,
  showDragHandle = true,
  onClick,
  onConflictClick,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
  className = '',
  style = {}
}) => {
  const eventRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Use resize hook for smooth resize behavior
  const {
    resizeState,
    isResizing,
    handleResizeStart: startResize,
    previewStyles,
    mousePosition
  } = useEventResize({
    pixelsPerHour,
    snapMinutes: 15,
    onResizeStart: (evt, handle) => {
      onResizeStart?.(evt, handle)
    },
    onResizeEnd: (evt, newStart, newEnd) => {
      onResizeEnd?.(evt, newStart, newEnd)
    }
  })

  // Determine compact mode based on view
  const isEffectivelyCompact = isCompact || viewMode === 'month'

  // Calculate dimensions based on view mode and overlap position
  const eventStyle: React.CSSProperties = {
    ...style,
    ...(isResizing ? previewStyles : {})
  }

  // Apply overlap positioning if provided
  if (position && viewMode !== 'month') {
    eventStyle.width = `${position.width}%`
    eventStyle.left = `${position.left}%`
    eventStyle.zIndex = isResizing ? 1000 : position.zIndex
    eventStyle.position = 'relative'
  }

  // Priority-based colors
  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 text-red-200 border-l-red-500 hover:bg-red-900/40'
      case 'high':
        return 'bg-orange-900/30 text-orange-200 border-l-orange-500 hover:bg-orange-900/40'
      case 'medium':
        return 'bg-accent/20 text-accent border-l-accent hover:bg-accent/30'
      case 'low':
        return 'bg-green-900/30 text-green-200 border-l-green-500 hover:bg-green-900/40'
      default:
        return 'bg-muted/50 text-muted-foreground border-l-muted-foreground hover:bg-muted/60'
    }
  }

  // Format time display
  const formatEventTime = (startDateTime: string, duration: number): string => {
    const start = parseISO(startDateTime)
    const end = addMinutes(start, duration)

    if (viewMode === 'month') {
      return format(start, 'h:mm a')
    }

    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isConflictButton = target.closest('button[class*="conflict"]')
    const isDragHandle = target.closest('[data-drag-handle]')
    const isResizeHandle = target.closest('[data-resize-handle]')

    if (isConflictButton || isDragHandle || isResizeHandle) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    onClick?.(event)
  }, [event, onClick])

  // Handle conflict click
  const handleConflictClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (conflicts) {
      onConflictClick?.(conflicts)
    }
  }, [conflicts, onConflictClick])

  // Handle drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isDragHandle = target.closest('[data-drag-handle]')

    if (!isDragHandle) return

    e.preventDefault()
    onDragStart?.(event, 'body')
  }, [event, onDragStart])

  // Handle resize
  const handleResizeStartWrapper = useCallback((e: React.MouseEvent | React.TouchEvent, handle: HandleType) => {
    e.preventDefault()
    e.stopPropagation()
    startResize(e, event, handle)
  }, [event, startResize])

  // Determine which resize handles to show based on view mode
  const getResizeHandles = (): HandleType[] => {
    if (viewMode === 'month') {
      return [] // No resize in month view
    } else if (viewMode === 'day') {
      return ['top', 'bottom'] // Only vertical resize in day view
    } else if (viewMode === 'week') {
      return ['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] // Full resize in week view
    }
    return []
  }

  // Calculate preview times for tooltip
  const getPreviewTimes = () => {
    if (!isResizing || !resizeState.previewStart || !resizeState.previewEnd) {
      return null
    }

    const start = parseISO(resizeState.previewStart)
    const end = parseISO(resizeState.previewEnd)
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    return { start, end, duration }
  }

  const previewTimes = getPreviewTimes()

  // Total conflicts count
  const totalConflicts = (conflicts?.conflicts.length || 0) + conflictingEvents.length

  return (
    <div
      ref={eventRef}
      data-event-block="true"
      data-event-id={event.id}
      className={`
        relative group cursor-pointer select-none transition-all duration-200
        ${getPriorityColor(event.priority)}
        border-l-4 rounded-r-md shadow-sm hover:shadow-md
        ${isEffectivelyCompact ? 'p-2' : 'p-3'}
        ${className}
      `}
      style={eventStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onMouseDown={handleDragStart}
    >
      {/* Drag Handle - for day/week views */}
      {showDragHandle && !isEffectivelyCompact && (
        <div
          data-drag-handle="true"
          className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-20 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-current" />
          </div>
        </div>
      )}

      {/* Resize Handles - for day/week views */}
      {showResizeHandles && !isEffectivelyCompact && getResizeHandles().map((handle) => (
        <ResizeHandle
          key={handle}
          handle={handle}
          onResizeStart={handleResizeStartWrapper}
          isVisible={true}
          isCompact={isEffectivelyCompact}
        />
      ))}

      {/* Time Tooltip - shown during resize */}
      {previewTimes && (
        <TimeTooltip
          startTime={previewTimes.start}
          endTime={previewTimes.end}
          duration={previewTimes.duration}
          position={mousePosition}
          isVisible={isResizing}
        />
      )}

      {/* Event Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h4 className={`font-semibold font-primary truncate mr-2 ${
            isEffectivelyCompact ? 'text-xs' : 'text-sm'
          }`}>
            {event.title}
          </h4>

          {/* Badges */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Conflict indicator */}
            {totalConflicts > 0 && (
              <button
                onClick={handleConflictClick}
                className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  transition-colors hover:opacity-80 border
                  ${conflicts?.conflicts.some(c => c.severity === 'critical') || conflictingEvents.length > 0
                    ? 'text-red-600 bg-red-100 border-red-200'
                    : conflicts?.conflicts.some(c => c.severity === 'error')
                    ? 'text-orange-600 bg-orange-100 border-orange-200'
                    : 'text-yellow-600 bg-yellow-100 border-yellow-200'
                  }
                `}
                title={`${totalConflicts} conflict(s) - Click to resolve`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{totalConflicts}</span>
              </button>
            )}

            {/* Priority badge - hide in month view */}
            {!isEffectivelyCompact && (
              <Badge variant="outline" className="text-xs">
                {event.priority.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Event Details - adaptive based on view mode */}
        {!isEffectivelyCompact && (
          <div className="space-y-1 text-xs opacity-80">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {formatEventTime(event.startDateTime, event.duration || 60)}
              </span>
            </div>

            {event.location && (
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {event.clientName && (
              <div className="flex items-center">
                <User className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{event.clientName}</span>
              </div>
            )}
          </div>
        )}

        {/* Compact mode - month view */}
        {isEffectivelyCompact && (
          <div className="text-xs opacity-75 truncate">
            {format(parseISO(event.startDateTime), 'h:mm a')}
            {event.clientName && ` • ${event.clientName}`}
          </div>
        )}
      </div>

      {/* Conflict Details Popup - shown on hover */}
      {isHovered && totalConflicts > 0 && (
        <div
          className="absolute left-0 right-0 bg-black/95 text-white text-xs rounded-md shadow-lg z-40 p-3 -top-2"
          style={{
            transform: 'translateY(-100%)',
            maxWidth: '280px'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="font-semibold mb-2 text-red-300">
            {totalConflicts} Total Conflict{totalConflicts > 1 ? 's' : ''}:
          </div>

          <div className="space-y-3 max-h-28 overflow-y-auto">
            {/* System-detected conflicts */}
            {conflicts?.hasConflicts && (
              <div>
                <div className="text-xs text-yellow-300 font-medium mb-1">
                  System Conflicts ({conflicts.conflicts.length}):
                </div>
                {conflicts.conflicts.slice(0, 2).map((conflict) => (
                  <div key={conflict.id} className="border-l-2 border-yellow-400 pl-2 mb-1">
                    <div className="text-xs text-gray-300">
                      • {conflict.message}
                    </div>
                  </div>
                ))}
                {conflicts.conflicts.length > 2 && (
                  <div className="text-xs text-gray-400 pl-2">
                    +{conflicts.conflicts.length - 2} more system conflicts...
                  </div>
                )}
              </div>
            )}

            {/* Overlapping events */}
            {conflictingEvents.length > 0 && (
              <div>
                <div className="text-xs text-red-300 font-medium mb-1">
                  Overlapping Events ({conflictingEvents.length}):
                </div>
                {conflictingEvents.map((conflictEvent) => (
                  <div
                    key={conflictEvent.id}
                    className="border-l-2 border-red-400 pl-2 hover:bg-white/10 rounded p-1 cursor-pointer mb-1"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onClick?.(conflictEvent)
                    }}
                  >
                    <div className="font-medium text-white">
                      {conflictEvent.title}
                    </div>
                    <div className="text-xs text-gray-300">
                      {formatEventTime(conflictEvent.startDateTime, conflictEvent.duration || 60)}
                    </div>
                    {conflictEvent.clientName && (
                      <div className="text-xs text-gray-400">
                        {conflictEvent.clientName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-2 text-center border-t border-gray-600 pt-2">
            {conflictingEvents.length > 0 ? 'Click events to view details • ' : ''}Click triangle to resolve conflicts
          </div>

          {/* Arrow pointing down to the event */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95" />
        </div>
      )}
    </div>
  )
}

export default CalendarEvent
