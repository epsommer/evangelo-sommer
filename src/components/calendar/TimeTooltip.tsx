"use client"

import React from 'react'
import { Clock } from 'lucide-react'
import { formatTimeRange, formatDuration } from '@/utils/calendar/resizeCalculations'

export interface TimeTooltipProps {
  startTime: Date
  endTime: Date
  duration: number
  position: { x: number; y: number }
  isVisible: boolean
  className?: string
}

/**
 * TimeTooltip Component
 *
 * Displays current start/end times and duration during event resize operations.
 * Follows the mouse cursor to provide immediate visual feedback.
 */
const TimeTooltip: React.FC<TimeTooltipProps> = ({
  startTime,
  endTime,
  duration,
  position,
  isVisible,
  className = ''
}) => {
  if (!isVisible) return null

  return (
    <div
      className={`
        fixed z-[9999] pointer-events-none
        bg-black/95 text-white
        px-3 py-2 rounded-lg shadow-2xl
        text-sm font-medium
        border border-accent/50
        ${className}
      `}
      style={{
        left: `${position.x + 15}px`,
        top: `${position.y - 10}px`,
        transform: 'translateY(-100%)'
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

      {/* Tooltip arrow */}
      <div
        className="absolute bottom-0 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"
        style={{ transform: 'translateY(100%)' }}
      />
    </div>
  )
}

export default TimeTooltip
