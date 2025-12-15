"use client"

import React, { useRef, useState } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { format, parseISO, addMinutes } from 'date-fns'
import { Clock, MapPin, User, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent as UnifiedEventType, Priority } from '@/components/EventCreationModal'
import { ConflictResult } from '@/lib/conflict-detector'
import ResizeHandle from './ResizeHandle'
import { ResizeHandle as HandleType } from '@/utils/calendar/resizeCalculations'

export interface UnifiedEventProps {
  event: UnifiedEventType
  view: 'day' | 'week' | 'month'
  onResize?: (eventId: string, newStart: Date, newEnd: Date) => void
  onDrag?: (eventId: string, newStart: Date) => void
  onClick?: (event: UnifiedEventType) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  conflicts?: ConflictResult
  pixelsPerHour?: number
  isCompact?: boolean
  className?: string
}

/**
 * UnifiedEvent Component
 *
 * A unified event component that adapts to different calendar views (day, week, month)
 * with smooth Framer Motion animations for drag and resize operations.
 *
 * Features:
 * - Framer Motion-powered drag and resize
 * - View-specific rendering (day/week/month)
 * - Resize handles (top/bottom for day/week, edges for multi-day)
 * - Smooth animations and transitions
 * - Conflict detection and visual indicators
 */
const UnifiedEvent: React.FC<UnifiedEventProps> = ({
  event,
  view,
  onResize,
  onDrag,
  onClick,
  onConflictClick,
  conflicts,
  pixelsPerHour = 80,
  isCompact = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  // Calculate event dimensions based on view
  const getEventDimensions = () => {
    const duration = event.duration || 60

    if (view === 'day' || view === 'week') {
      const height = (duration / 60) * pixelsPerHour
      return {
        height: Math.max(height, 30), // Minimum 30px
        width: '100%'
      }
    }

    if (view === 'month') {
      return {
        height: 'auto',
        width: '100%'
      }
    }

    // Year view - minimal indicator
    return {
      height: '8px',
      width: '8px'
    }
  }

  // Get priority-based colors
  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 text-red-200 border-l-4 border-l-red-500'
      case 'high':
        return 'bg-orange-900/30 text-orange-200 border-l-4 border-l-orange-500'
      case 'medium':
        return 'bg-accent/20 text-accent border-l-4 border-l-accent'
      case 'low':
        return 'bg-green-900/30 text-green-200 border-l-4 border-l-green-500'
      default:
        return 'bg-muted/50 text-muted-foreground border-l-4 border-l-muted-foreground'
    }
  }

  // Format time display
  const formatEventTime = (): string => {
    const start = parseISO(event.startDateTime)
    const end = event.endDateTime
      ? parseISO(event.endDateTime)
      : addMinutes(start, event.duration || 60)

    if (view === 'month') {
      return format(start, 'h:mm a')
    }

    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  // Handle drag
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)

    if (onDrag) {
      // Calculate new start time based on drag delta
      const deltaMinutes = Math.round((info.offset.y / pixelsPerHour) * 60)
      const newStart = addMinutes(parseISO(event.startDateTime), deltaMinutes)
      onDrag(event.id, newStart)
    }
  }

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, handle: HandleType) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }

  // Render based on view
  if (view === 'month') {
    // Month view: Compact event card
    return (
      <motion.div
        drag={!isResizing}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          ${getPriorityColor(event.priority)}
          rounded px-2 py-1 text-xs cursor-pointer
          transition-shadow hover:shadow-md
          ${isDragging ? 'opacity-50' : 'opacity-100'}
          ${conflicts?.hasConflicts ? 'ring-2 ring-yellow-400' : ''}
          ${className}
        `}
        onClick={() => onClick?.(event)}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium truncate flex-1">{event.title}</span>
          {conflicts?.hasConflicts && (
            <AlertTriangle className="h-3 w-3 text-yellow-400 ml-1" />
          )}
        </div>
        <div className="text-xs opacity-75 truncate">{formatEventTime()}</div>
      </motion.div>
    )
  }

  // Day and Week views: Full event card with resize handles
  const dimensions = getEventDimensions()

  return (
    <motion.div
      ref={containerRef}
      drag={!isResizing}
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={containerRef.current?.parentElement || undefined}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        zIndex: 50
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 5px 15px rgba(0,0,0,0.2)"
      }}
      layout
      layoutId={`event-${event.id}`}
      transition={{
        layout: { duration: 0.2 },
        scale: { duration: 0.15 }
      }}
      style={{
        height: dimensions.height,
        width: dimensions.width,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className={`
        ${getPriorityColor(event.priority)}
        rounded-lg p-3 relative group
        ${isDragging ? 'opacity-70' : 'opacity-100'}
        ${isResizing ? 'select-none' : ''}
        ${conflicts?.hasConflicts ? 'ring-2 ring-yellow-400' : ''}
        ${className}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(event)
      }}
    >
      {/* Resize Handle - Top */}
      {view === 'day' || view === 'week' ? (
        <ResizeHandle
          handle="top"
          onResizeStart={handleResizeStart}
          isVisible={!isCompact}
          className="text-accent"
        />
      ) : null}

      {/* Event Content */}
      <div className="flex flex-col h-full overflow-hidden pointer-events-none">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-bold text-sm truncate flex-1 pr-2">
            {event.title}
          </h4>
          {conflicts?.hasConflicts && (
            <motion.div
              whileHover={{ scale: 1.2 }}
              className="pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation()
                onConflictClick?.(conflicts)
              }}
            >
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </motion.div>
          )}
        </div>

        <div className="text-xs opacity-75 mb-1 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          {formatEventTime()}
        </div>

        {event.location && (
          <div className="text-xs opacity-75 mb-1 flex items-center truncate">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {event.clientName && (
          <div className="text-xs opacity-75 flex items-center truncate">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{event.clientName}</span>
          </div>
        )}

        {event.description && !isCompact && (
          <div className="text-xs opacity-60 mt-2 line-clamp-2">
            {event.description}
          </div>
        )}
      </div>

      {/* Resize Handle - Bottom */}
      {view === 'day' || view === 'week' ? (
        <ResizeHandle
          handle="bottom"
          onResizeStart={handleResizeStart}
          isVisible={!isCompact}
          className="text-accent"
        />
      ) : null}

      {/* Drag indicator */}
      <motion.div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.7 }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="text-foreground"
        >
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      </motion.div>
    </motion.div>
  )
}

export default UnifiedEvent
