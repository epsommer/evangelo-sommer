"use client"

import React from 'react'
import { motion } from 'framer-motion'

export interface YearDayIndicatorProps {
  eventCount: number
  onClick?: () => void
  onDoubleClick?: () => void
  isToday?: boolean
  className?: string
}

/**
 * YearDayIndicator Component
 *
 * Displays event presence indicators for days in Year view.
 * Shows either a tally count or a colored dot based on event count.
 *
 * Features:
 * - Dot indicator for days with events
 * - Tally count display (e.g., "3") when space permits
 * - Hover tooltips with event count
 * - Click to navigate to day view
 * - Today highlighting
 */
const YearDayIndicator: React.FC<YearDayIndicatorProps> = ({
  eventCount,
  onClick,
  onDoubleClick,
  isToday = false,
  className = ''
}) => {
  // Get color based on event density
  const getIndicatorColor = (): string => {
    if (eventCount === 0) return 'bg-transparent'
    if (eventCount === 1) return 'bg-accent/40'
    if (eventCount === 2) return 'bg-accent/60'
    if (eventCount <= 5) return 'bg-accent/80'
    return 'bg-accent'
  }

  // Get text color for tally
  const getTextColor = (): string => {
    if (eventCount === 0) return 'text-transparent'
    if (eventCount <= 2) return 'text-accent-foreground'
    return 'text-white'
  }

  if (eventCount === 0) {
    // No events - render empty state
    return (
      <motion.div
        className={`
          w-full h-full flex items-center justify-center
          ${isToday ? 'bg-accent/10 ring-1 ring-accent' : ''}
          ${className}
        `}
        whileHover={{ scale: 1.05 }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    )
  }

  if (eventCount <= 3) {
    // Show tally count for 1-3 events
    return (
      <motion.div
        className={`
          w-full h-full flex items-center justify-center
          relative overflow-hidden rounded-sm cursor-pointer
          ${getIndicatorColor()}
          ${isToday ? 'ring-2 ring-accent-foreground' : ''}
          ${className}
        `}
        whileHover={{
          scale: 1.1,
          backgroundColor: 'rgba(var(--accent), 1)'
        }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        title={`${eventCount} event${eventCount !== 1 ? 's' : ''}`}
      >
        <motion.span
          className={`text-[10px] font-bold ${getTextColor()}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {eventCount}
        </motion.span>
      </motion.div>
    )
  }

  // Show colored dot for 4+ events
  return (
    <motion.div
      className={`
        w-full h-full flex items-center justify-center
        relative overflow-hidden cursor-pointer
        ${isToday ? 'ring-2 ring-accent-foreground rounded-sm' : ''}
        ${className}
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      title={`${eventCount} events`}
    >
      <motion.div
        className={`
          w-2 h-2 rounded-full
          ${getIndicatorColor()}
        `}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{
          scale: 1.3,
          boxShadow: '0 0 8px rgba(var(--accent), 0.6)'
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Event count badge for many events */}
      {eventCount > 5 && (
        <motion.div
          className="
            absolute -top-1 -right-1
            bg-primary text-white
            rounded-full w-4 h-4
            flex items-center justify-center
            text-[8px] font-bold
            shadow-sm
          "
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {eventCount > 9 ? '9+' : eventCount}
        </motion.div>
      )}
    </motion.div>
  )
}

export default YearDayIndicator
