"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { UnifiedEvent as UnifiedEventType } from '@/components/EventCreationModal'
import UnifiedEvent from './UnifiedEvent'

export interface EventStackProps {
  events: UnifiedEventType[]
  maxVisible?: number
  onEventClick?: (event: UnifiedEventType) => void
  onEventDrag?: (eventId: string, newStart: Date) => void
  className?: string
}

/**
 * EventStack Component
 *
 * Manages stacking and overflow display of multiple events in a single day/cell.
 * Used primarily in Month view to handle multiple events gracefully.
 *
 * Features:
 * - Shows first N events with "+N more" indicator
 * - Expandable/collapsible to show all events
 * - Smooth Framer Motion animations
 * - Drag support for individual events
 */
const EventStack: React.FC<EventStackProps> = ({
  events,
  maxVisible = 3,
  onEventClick,
  onEventDrag,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleEvents = isExpanded ? events : events.slice(0, maxVisible)
  const hiddenCount = Math.max(0, events.length - maxVisible)

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <AnimatePresence initial={false}>
        {visibleEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05
            }}
          >
            <UnifiedEvent
              event={event}
              view="month"
              onClick={onEventClick}
              onDrag={onEventDrag}
              isCompact={true}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {hiddenCount > 0 && !isExpanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
          whileTap={{ scale: 0.95 }}
          className="
            w-full text-xs text-center py-1 px-2
            text-muted-foreground hover:text-foreground
            rounded transition-colors
            flex items-center justify-center gap-1
          "
          onClick={toggleExpanded}
        >
          <ChevronDown className="h-3 w-3" />
          <span>+{hiddenCount} more</span>
        </motion.button>
      )}

      {isExpanded && events.length > maxVisible && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{
            scale: 1.05,
            backgroundColor: 'rgba(0, 0, 0, 0.1)'
          }}
          whileTap={{ scale: 0.95 }}
          className="
            w-full text-xs text-center py-1 px-2
            text-muted-foreground hover:text-foreground
            rounded transition-colors
            flex items-center justify-center gap-1
          "
          onClick={toggleExpanded}
        >
          <ChevronUp className="h-3 w-3" />
          <span>Show less</span>
        </motion.button>
      )}
    </div>
  )
}

export default EventStack
