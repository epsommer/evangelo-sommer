"use client"

import React from 'react'
import { format, addMinutes, parseISO } from 'date-fns'
import { Clock } from 'lucide-react'

// Height thresholds for different display modes (in pixels)
const COMPACT_HEIGHT_THRESHOLD = 35 // Below this: ultra-compact (time only)
const MEDIUM_HEIGHT_THRESHOLD = 50 // Below this: compact (time + short info)

interface PlaceholderEventProps {
  date: string // 'yyyy-MM-dd' format
  hour: number // 0-23
  minutes?: number // 0-59, for precise positioning
  duration?: number // in minutes, default 15 for compact initial display
  title?: string // optional, from form input
  pixelsPerHour?: number // default 80
  endDate?: string // optional, for multi-day events
  endHour?: number // optional, for multi-day events
  isMultiDay?: boolean // flag for multi-day styling
}

/**
 * PlaceholderEvent - Visual ghost event box
 *
 * Appears when user initiates event creation via double-click or drag.
 * Uses compact display when small, expanding to show more details as height increases.
 */
const PlaceholderEvent: React.FC<PlaceholderEventProps> = ({
  date,
  hour,
  minutes = 0,
  duration = 15,
  title,
  pixelsPerHour = 80,
  endDate,
  endHour,
  isMultiDay = false
}) => {
  // Calculate position and height with precise minute positioning
  // Top position includes minutes offset for precise placement
  const top = (hour * pixelsPerHour) + ((minutes / 60) * pixelsPerHour)
  const maxGridHeight = 24 * pixelsPerHour
  const rawHeight = (duration / 60) * pixelsPerHour
  // Clamp height so placeholder doesn't extend past midnight (24:00)
  const height = Math.min(rawHeight, maxGridHeight - top)
  const displayHeight = Math.max(height, 20) // Minimum 20px for visibility

  // Determine display mode based on height
  const isUltraCompact = displayHeight < COMPACT_HEIGHT_THRESHOLD
  const isCompact = displayHeight < MEDIUM_HEIGHT_THRESHOLD

  // Calculate time range display
  const startDateTime = `${date}T${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  const start = parseISO(startDateTime)
  const end = addMinutes(start, duration)

  // Use shorter time format for compact modes
  const formatTimeShort = (date: Date) => format(date, 'h:mma').toLowerCase()
  const formatTimeFull = (date: Date) => format(date, 'h:mm a')
  const formatDate = (date: Date) => format(date, 'MMM d')

  // Time range with optional multi-day display
  let timeRange: string
  let timeRangeShort: string
  if (isMultiDay && endDate) {
    timeRange = `${formatDate(start)} ${formatTimeFull(start)} - ${formatDate(end)} ${formatTimeFull(end)}`
    timeRangeShort = `${formatTimeShort(start)} - ${formatTimeShort(end)}`
  } else {
    timeRange = `${formatTimeFull(start)} - ${formatTimeFull(end)}`
    timeRangeShort = `${formatTimeShort(start)} - ${formatTimeShort(end)}`
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
      className="absolute left-0 right-0 rounded-md transition-all pointer-events-none"
      style={{
        top: `${top}px`,
        height: `${displayHeight}px`,
        left: '2px',
        right: '2px',
        zIndex: 5 // Below real events (z-index 10) but above grid
      }}
    >
      <div
        className={`h-full rounded-r-md border-2 border-dashed bg-accent/30 border-accent flex shadow-sm ${
          isUltraCompact
            ? 'flex-row items-center justify-center px-2 py-0.5'
            : 'flex-col justify-center px-3 py-1'
        }`}
        style={{
          borderLeftWidth: '4px',
          borderLeftStyle: 'dashed'
        }}
      >
        {/* Ultra-compact mode: just time range inline */}
        {isUltraCompact && (
          <div className="flex items-center gap-1 text-xs text-accent-foreground/70 font-primary font-medium">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{timeRangeShort}</span>
          </div>
        )}

        {/* Compact mode: time range with optional duration */}
        {!isUltraCompact && isCompact && (
          <>
            <div className="flex items-center gap-1 text-xs text-accent-foreground/70 font-primary font-medium">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{timeRangeShort}</span>
              {duration >= 30 && (
                <span className="text-accent-foreground/50 ml-1">
                  ({formatDuration(duration)})
                </span>
              )}
            </div>
          </>
        )}

        {/* Full mode: title, time, and duration */}
        {!isUltraCompact && !isCompact && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}

export default PlaceholderEvent
