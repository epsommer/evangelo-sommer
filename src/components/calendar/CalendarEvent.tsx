"use client"

import React, { useState, useRef, useCallback } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Clock, MapPin, User, AlertTriangle, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'
import { ConflictResult } from '@/lib/conflict-detector'
import { EventPosition } from '@/utils/calendar/eventOverlap'
import ResizeHandle from '@/components/calendar/ResizeHandle'
import TimeTooltip from '@/components/calendar/TimeTooltip'
import { useEventResize } from '@/hooks/useEventResize'
import { ResizeHandle as HandleType } from '@/utils/calendar/resizeCalculations'
import { useDragDrop } from '@/components/DragDropContext'

export type CalendarViewMode = 'day' | 'week' | 'month'

// Compatible interface with DragAndDropEvent
export interface DragData {
  event: UnifiedEvent
  originalSlot: {
    date: string
    hour: number
  }
  dragOffset: { x: number; y: number }
}

export interface DropZoneData {
  date: string
  hour: number
  element: HTMLElement
}

export interface CalendarEventProps {
  event: UnifiedEvent
  viewMode?: CalendarViewMode
  // Props for compatibility with DragAndDropEvent
  currentDate?: string
  currentHour?: number
  position?: EventPosition
  conflicts?: ConflictResult
  conflictingEvents?: UnifiedEvent[]
  pixelsPerHour?: number
  isCompact?: boolean
  showResizeHandles?: boolean
  showDragHandle?: boolean
  showConflicts?: boolean
  isDragging?: boolean
  isResizing?: boolean
  onClick?: (event: UnifiedEvent) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  // New simplified callbacks
  onDragStart?: (data: DragData) => void
  onDragEnd?: (data: DragData, dropZone: DropZoneData | null) => void
  onResizeStart?: (event: UnifiedEvent, handle: HandleType) => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Unified CalendarEvent component
 * Adapts display based on view mode (day, week, month)
 * Supports Google Calendar-style overlap positioning
 * Compatible with existing DragDropContext for HTML5 drag/drop
 */
const CalendarEvent: React.FC<CalendarEventProps> = ({
  event,
  viewMode,
  currentDate,
  currentHour,
  position,
  conflicts,
  conflictingEvents = [],
  pixelsPerHour = 80,
  isCompact = false,
  showResizeHandles = true,
  showDragHandle = true,
  showConflicts = true,
  isDragging: externalIsDragging = false,
  isResizing: externalIsResizing = false,
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

  // Get DragDrop context - wrapped in try/catch for components outside provider
  let dragDropContext: ReturnType<typeof useDragDrop> | null = null
  try {
    dragDropContext = useDragDrop()
  } catch {
    // Component is used outside DragDropProvider
  }

  // Use resize hook for smooth resize behavior
  // Disable auto-persistence - let parent handle it via onResizeEnd callback and confirmation modal
  const {
    resizeState,
    isResizing: hookIsResizing,
    handleResizeStart: startResize,
    previewStyles,
    mousePosition
  } = useEventResize({
    pixelsPerHour,
    snapMinutes: 15,
    enablePersistence: false, // Parent handles persistence via confirmation modal
    onResizeStart: (evt, handle) => {
      onResizeStart?.(evt, handle)
    },
    onResizeEnd: (evt, newStart, newEnd) => {
      onResizeEnd?.(evt, newStart, newEnd)
    }
  })

  const isResizing = hookIsResizing || externalIsResizing

  // Derive viewMode from currentDate/currentHour if not provided
  const effectiveViewMode = viewMode || 'day'

  // Determine compact mode based on view
  const isEffectivelyCompact = isCompact || effectiveViewMode === 'month'

  // Calculate dimensions based on view mode and overlap position
  const eventStyle: React.CSSProperties = {
    ...style,
    ...(isResizing ? previewStyles : {})
  }

  // Apply overlap positioning if provided
  if (position && effectiveViewMode !== 'month') {
    eventStyle.width = `${position.width}%`
    eventStyle.left = `${position.left}%`
    eventStyle.zIndex = isResizing ? 1000 : position.zIndex
    eventStyle.position = 'relative'
  }

  // Check if this event is currently being dragged
  const isDragging = externalIsDragging || (dragDropContext?.dragState.isDragging && dragDropContext?.dragState.draggedEvent?.id === event.id)

  // Get event type/priority-based colors using CSS variables
  const getEventTypeClass = (event: UnifiedEvent): string => {
    // Determine event type category
    const eventType = event.type || 'event'

    // Map event types to color classes
    // Tasks map to task colors
    if (eventType === 'task') {
      return 'event-type-task'
    }
    // Goals and milestones map to meeting colors (blue) for distinction
    if (eventType === 'goal' || eventType === 'milestone') {
      return 'event-type-meeting'
    }

    // For regular events, use priority-based colors
    const priority = event.priority
    switch (priority) {
      case 'urgent':
        return 'event-priority-urgent'
      case 'high':
        return 'event-priority-high'
      case 'medium':
        return 'event-priority-medium'
      case 'low':
        return 'event-priority-low'
      default:
        return 'event-type-default'
    }
  }

  // Get inline styles for event colors
  const getEventColorStyles = (event: UnifiedEvent): React.CSSProperties => {
    const eventClass = getEventTypeClass(event)

    // Map class names to CSS variable keys
    const colorMap: Record<string, { bg: string; fg: string; border: string; hover: string }> = {
      'event-type-meeting': {
        bg: 'var(--event-meeting-bg)',
        fg: 'var(--event-meeting-fg)',
        border: 'var(--event-meeting-border)',
        hover: 'var(--event-meeting-hover)'
      },
      'event-type-task': {
        bg: 'var(--event-task-bg)',
        fg: 'var(--event-task-fg)',
        border: 'var(--event-task-border)',
        hover: 'var(--event-task-hover)'
      },
      'event-type-blocked': {
        bg: 'var(--event-blocked-bg)',
        fg: 'var(--event-blocked-fg)',
        border: 'var(--event-blocked-border)',
        hover: 'var(--event-blocked-hover)'
      },
      'event-type-external': {
        bg: 'var(--event-external-bg)',
        fg: 'var(--event-external-fg)',
        border: 'var(--event-external-border)',
        hover: 'var(--event-external-hover)'
      },
      'event-priority-urgent': {
        bg: 'var(--event-urgent-bg)',
        fg: 'var(--event-urgent-fg)',
        border: 'var(--event-urgent-border)',
        hover: 'var(--event-urgent-hover)'
      },
      'event-priority-high': {
        bg: 'var(--event-high-bg)',
        fg: 'var(--event-high-fg)',
        border: 'var(--event-high-border)',
        hover: 'var(--event-high-hover)'
      },
      'event-priority-medium': {
        bg: 'var(--event-medium-bg)',
        fg: 'var(--event-medium-fg)',
        border: 'var(--event-medium-border)',
        hover: 'var(--event-medium-hover)'
      },
      'event-priority-low': {
        bg: 'var(--event-low-bg)',
        fg: 'var(--event-low-fg)',
        border: 'var(--event-low-border)',
        hover: 'var(--event-low-hover)'
      },
      'event-type-default': {
        bg: 'var(--event-default-bg)',
        fg: 'var(--event-default-fg)',
        border: 'var(--event-default-border)',
        hover: 'var(--event-default-hover)'
      }
    }

    const colors = colorMap[eventClass] || colorMap['event-type-default']

    return {
      backgroundColor: `hsl(${colors.bg})`,
      color: `hsl(${colors.fg})`,
      borderLeftColor: `hsl(${colors.border})`,
      '--hover-bg': `hsl(${colors.hover})`
    } as React.CSSProperties
  }

  // Format time display
  const formatEventTime = (startDateTime: string, duration: number): string => {
    const start = parseISO(startDateTime)
    const end = addMinutes(start, duration)

    if (effectiveViewMode === 'month') {
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

  // HTML5 Drag and Drop handlers
  const handleDragStartHTML5 = useCallback((e: React.DragEvent) => {
    // Calculate drag offset
    const rect = eventRef.current?.getBoundingClientRect()
    const dragOffset = rect
      ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
      : { x: 0, y: 0 }

    // Get the slot info
    const slotDate = currentDate || format(parseISO(event.startDateTime), 'yyyy-MM-dd')
    const slotHour = currentHour ?? parseISO(event.startDateTime).getHours()

    const dragData: DragData = {
      event,
      originalSlot: { date: slotDate, hour: slotHour },
      dragOffset
    }

    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'

    // Set drag image (with slight offset)
    if (eventRef.current) {
      e.dataTransfer.setDragImage(eventRef.current, dragOffset.x, dragOffset.y)
    }

    // Notify context
    if (dragDropContext) {
      dragDropContext.startDrag(event, dragOffset, { date: slotDate, hour: slotHour })
    }

    // Notify parent
    onDragStart?.(dragData)
  }, [event, currentDate, currentHour, dragDropContext, onDragStart])

  const handleDragEndHTML5 = useCallback((e: React.DragEvent) => {
    // Get drop zone from context
    const dropZone = dragDropContext?.dropZoneState.activeDropZone

    const slotDate = currentDate || format(parseISO(event.startDateTime), 'yyyy-MM-dd')
    const slotHour = currentHour ?? parseISO(event.startDateTime).getHours()

    const dragData: DragData = {
      event,
      originalSlot: { date: slotDate, hour: slotHour },
      dragOffset: { x: 0, y: 0 }
    }

    // Construct DropZoneData if we have a drop zone
    const dropZoneData: DropZoneData | null = dropZone
      ? { date: dropZone.date, hour: dropZone.hour, element: e.target as HTMLElement }
      : null

    // End drag in context
    if (dragDropContext) {
      dragDropContext.endDrag()
    }

    // Notify parent
    onDragEnd?.(dragData, dropZoneData)
  }, [event, currentDate, currentHour, dragDropContext, onDragEnd])

  // Legacy mouse-based drag (fallback)
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const isDragHandleEl = target.closest('[data-drag-handle]')

    if (!isDragHandleEl) return

    // Let HTML5 drag handle it
  }, [event])

  // Handle resize
  const handleResizeStartWrapper = useCallback((e: React.MouseEvent | React.TouchEvent, handle: HandleType) => {
    e.preventDefault()
    e.stopPropagation()
    startResize(e, event, handle)
  }, [event, startResize])

  // Determine which resize handles to show based on view mode
  const getResizeHandles = (): HandleType[] => {
    if (effectiveViewMode === 'month') {
      return [] // No resize in month view
    } else if (effectiveViewMode === 'day') {
      return ['top', 'bottom'] // Only vertical resize in day view
    } else if (effectiveViewMode === 'week') {
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

  // Use a wrapper div for HTML5 drag, motion.div for animations
  return (
    <div
      className="group overflow-visible relative"
      draggable={effectiveViewMode !== 'month'}
      onDragStart={handleDragStartHTML5}
      onDragEnd={handleDragEndHTML5}
    >
      <motion.div
        ref={eventRef}
        data-event-block="true"
        data-event-id={event.id}
        className={`
          relative cursor-pointer select-none
          border-l-4 rounded-r-md shadow-sm transition-colors
          ${getEventTypeClass(event)}
          ${isEffectivelyCompact ? 'p-2' : 'p-3'}
          ${isDragging ? 'opacity-50 ring-2' : ''}
          ${className}
        `}
        style={{
          ...eventStyle,
          borderLeftWidth: '4px',
          opacity: isDragging ? 0.5 : 1
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onMouseDown={handleDragStart}
        // Framer Motion animations
        initial={false}
        animate={{
          scale: isDragging ? 1.02 : 1,
          boxShadow: isDragging
            ? `0 10px 25px rgba(0,0,0,0.3), 0 0 0 2px hsl(var(--event-active-glow))`
            : isHovered
              ? '0 4px 12px rgba(0,0,0,0.15)'
              : '0 1px 3px rgba(0,0,0,0.1)'
        }}
        whileHover={{
          scale: 1.01
        }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        layout
        layoutId={`event-${event.id}`}
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
      </motion.div>
    </div>
  )
}

export default CalendarEvent
