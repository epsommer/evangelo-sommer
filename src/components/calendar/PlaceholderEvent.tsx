"use client"

import React from 'react'
import { format, addMinutes, parseISO } from 'date-fns'
import { Clock } from 'lucide-react'

interface PlaceholderEventProps {
  date: string // 'yyyy-MM-dd' format
  hour: number // 0-23
  duration?: number // in minutes, default 60
  title?: string // optional, from form input
  pixelsPerHour?: number // default 80
  endDate?: string // optional, for multi-day events
  endHour?: number // optional, for multi-day events
  isMultiDay?: boolean // flag for multi-day styling
}

/**
 * PlaceholderEvent - Visual ghost event box
 *
 * Appears when user initiates event creation via double-click.
 * Shows where the event will be scheduled with semi-transparent styling.
 */
const PlaceholderEvent: React.FC<PlaceholderEventProps> = ({
  date,
  hour,
  duration = 60,
  title,
  pixelsPerHour = 80,
  endDate,
  endHour,
  isMultiDay = false
}) => {
  // Calculate position and height
  const top = hour * pixelsPerHour
  const height = (duration / 60) * pixelsPerHour

  // Calculate time range display
  const startDateTime = `${date}T${hour.toString().padStart(2, '0')}:00:00`
  const start = parseISO(startDateTime)
  const end = addMinutes(start, duration)

  const formatTime = (date: Date) => format(date, 'h:mm a')
  const formatDate = (date: Date) => format(date, 'MMM d')

  // Time range with optional multi-day display
  let timeRange: string
  if (isMultiDay && endDate) {
    timeRange = `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`
  } else {
    timeRange = `${formatTime(start)} - ${formatTime(end)}`
  }

  // Format duration for display
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  return (
    <div
      className="absolute left-0 right-0 rounded-md transition-all pointer-events-none animate-pulse"
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 25)}px`,
        left: '2px',
        right: '2px',
        zIndex: 5 // Below real events (z-index 10) but above grid
      }}
    >
      <div
        className="h-full rounded-r-md border-2 border-dashed bg-accent/30 border-accent flex flex-col justify-center px-3 py-2 shadow-lg"
        style={{
          borderLeftWidth: '4px',
          borderLeftStyle: 'dashed'
        }}
      >
        <div className="text-sm font-semibold text-accent-foreground/80 truncate font-primary">
          {title || 'New Event'}
        </div>
        <div className="flex items-center gap-1 text-xs text-accent-foreground/60 font-primary">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{timeRange}</span>
        </div>
        {duration > 60 && (
          <div className="text-xs text-accent-foreground/50 font-primary font-medium">
            {formatDuration(duration)}
          </div>
        )}
        {isMultiDay && (
          <div className="text-xs text-accent-foreground/70 font-primary font-semibold bg-accent/20 rounded px-1 py-0.5 mt-1 inline-block self-start">
            Multi-day event
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaceholderEvent
