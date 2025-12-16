"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useDragDrop } from './DragDropContext'
import { UnifiedEvent } from '@/components/EventCreationModal'

interface DropZoneProps {
  date: string
  hour: number
  isOccupied?: boolean
  events?: UnifiedEvent[]
  onTimeSlotClick?: (date: Date, hour: number) => void
  onTimeSlotDoubleClick?: (date: Date, hour: number) => void
  onMouseDownOnSlot?: (e: React.MouseEvent, date: string, hour: number, dayIndex: number) => void
  className?: string
  children?: React.ReactNode
  showAlways?: boolean
  compact?: boolean
  dayIndex?: number // Day of week index (0-6 for Sun-Sat)
}

const DropZone: React.FC<DropZoneProps> = ({
  date,
  hour,
  isOccupied = false,
  events = [],
  onTimeSlotClick,
  onTimeSlotDoubleClick,
  onMouseDownOnSlot,
  className = '',
  children,
  showAlways = false,
  compact = false,
  dayIndex = 0
}) => {
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const {
    dragState,
    dropZoneState,
    showDropZones,
    setHoveredDropZone,
    setActiveDropZone
  } = useDragDrop()

  // Check if this is the currently active drop zone
  const isActiveDropZone = (
    dropZoneState.activeDropZone?.date === date &&
    dropZoneState.activeDropZone?.hour === hour
  )

  // Check if this is the currently hovered drop zone
  const isHoveredDropZone = (
    dropZoneState.hoveredDropZone?.date === date &&
    dropZoneState.hoveredDropZone?.hour === hour
  )

  // Format time for display
  const formatTimeSlot = (hour: number) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${period}`
  }

  // Handle drag enter
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragState.isDragging) {
      setIsDraggedOver(true)
      setHoveredDropZone({ date, hour })
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragState.isDragging) {
      setActiveDropZone({ date, hour })
    }
  }

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger leave if we're actually leaving the drop zone
    const rect = dropZoneRef.current?.getBoundingClientRect()
    if (rect) {
      const { clientX, clientY } = e
      const isOutside = (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      )
      
      if (isOutside) {
        setIsDraggedOver(false)
        if (isHoveredDropZone) {
          setHoveredDropZone(null)
        }
        if (isActiveDropZone) {
          setActiveDropZone(null)
        }
      }
    }
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggedOver(false)
    // The actual drop logic is handled in the DragDropContext
  }

  // Handle mousedown to track drag-on-double-click
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't trigger if clicking on an event
    const target = e.target as HTMLElement
    const clickedOnEvent = target.closest('[data-event-block]') || target.closest('.group.cursor-pointer')

    if (!dragState.isDragging && !clickedOnEvent && onMouseDownOnSlot) {
      onMouseDownOnSlot(e, date, hour, dayIndex)
    }
  }

  // Calculate 15-minute precision time from click Y position
  const calculatePreciseTime = (clientY: number): number => {
    const dropZoneElement = dropZoneRef.current
    if (!dropZoneElement) return hour

    const rect = dropZoneElement.getBoundingClientRect()
    const relativeY = clientY - rect.top
    const slotHeight = rect.height

    // Calculate which 15-minute segment was clicked (0, 15, 30, or 45)
    const minuteSegment = Math.floor((relativeY / slotHeight) * 4)
    const minutes = Math.min(45, minuteSegment * 15) // Clamp to 45 max

    return hour + (minutes / 60) // Return fractional hour for precise positioning
  }

  // Handle click to create new event (with double-click detection)
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger time slot click if clicking on an event
    const target = e.target as HTMLElement
    const clickedOnEvent = target.closest('[data-event-block]') || target.closest('.group.cursor-pointer')

    if (!dragState.isDragging && !clickedOnEvent) {
      const clickDate = new Date(date + 'T00:00:00')

      // Check if this is a double-click by checking if there's a pending single-click
      if (clickTimeout) {
        // This is a double-click - clear the single-click timeout and call double-click handler
        clearTimeout(clickTimeout)
        setClickTimeout(null)
        if (onTimeSlotDoubleClick) {
          onTimeSlotDoubleClick(clickDate, hour)
        }
      } else {
        // This might be a single-click - set a timeout to call single-click handler
        const timeout = setTimeout(() => {
          if (onTimeSlotClick) {
            // Calculate precise 15-minute interval from click position
            const preciseTime = calculatePreciseTime(e.clientY)
            const preciseHour = Math.floor(preciseTime)
            const preciseMinutes = Math.round((preciseTime - preciseHour) * 60)

            // Create a new date with precise time
            const preciseDate = new Date(date + `T${preciseHour.toString().padStart(2, '0')}:${preciseMinutes.toString().padStart(2, '0')}:00`)
            onTimeSlotClick(preciseDate, preciseHour)
          }
          setClickTimeout(null)
        }, 300) // 300ms window for double-click detection
        setClickTimeout(timeout)
      }
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }
    }
  }, [clickTimeout])

  // Handle mouse events for hover feedback
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (!dragState.isDragging) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsHovered(false)
  }

  // Check if parent has group-hover class (for time column integration)
  const [isGroupHovered, setIsGroupHovered] = useState(false)
  
  useEffect(() => {
    const parentElement = dropZoneRef.current?.closest('.group')
    if (!parentElement) return
    
    const handleGroupMouseEnter = () => setIsGroupHovered(true)
    const handleGroupMouseLeave = () => setIsGroupHovered(false)
    
    parentElement.addEventListener('mouseenter', handleGroupMouseEnter)
    parentElement.addEventListener('mouseleave', handleGroupMouseLeave)
    
    return () => {
      parentElement.removeEventListener('mouseenter', handleGroupMouseEnter)
      parentElement.removeEventListener('mouseleave', handleGroupMouseLeave)
    }
  }, [])

  // Visual state calculations
  const effectiveHovered = isHovered || isGroupHovered
  const shouldShowDropZone = showDropZones || showAlways || effectiveHovered
  const shouldShowContent = isOccupied || showDropZones || showAlways || effectiveHovered // Always show content if there are events

  const isValidDropTarget = !isOccupied || events.length === 0

  // Determine if this DropZone should be interactive
  const shouldBeInteractive = shouldShowContent && (effectiveHovered || showDropZones || showAlways || dragState.isDragging)

  // For drag operations, always allow drag events even if not visually interactive
  const shouldAllowDragEvents = dragState.isDragging || shouldBeInteractive

  // When there are events (children), the DropZone should not intercept pointer events unless dragging
  // For empty slots (no children), always enable pointer events so clicks can be detected
  const shouldEnablePointerEvents = children ? dragState.isDragging : true
  const isCurrentTime = () => {
    const now = new Date()
    const currentDate = format(now, 'yyyy-MM-dd')
    const currentHour = now.getHours()
    return date === currentDate && hour === currentHour
  }

  return (
    <div
      ref={dropZoneRef}
      data-drop-zone="true"
      data-drop-date={date}
      data-drop-hour={hour.toString()}
      className={`
        relative transition-all duration-200 ease-in-out h-full overflow-visible
        ${shouldShowContent ? 'opacity-100' : 'opacity-0'}
        ${dragState.isDragging && (isActiveDropZone || isDraggedOver) && isValidDropTarget ?
          'border-2 border-accent' :
          ''}
        ${dragState.isDragging && (isActiveDropZone || isDraggedOver) && !isValidDropTarget ?
          'border-2 border-red-400' :
          ''}
        ${effectiveHovered && !dragState.isDragging && !isOccupied ?
          'bg-tactical-grey-100 border-2 border-tactical-grey-400' :
          isOccupied ? '' : 'border-2 border-transparent'}
        ${isCurrentTime() ? 'bg-tactical-gold-light bg-opacity-30' : ''}
        ${className}
      `}
      style={{
        zIndex: isOccupied ? 1 :                          // Occupied slots always stay below events
               dragState.isDragging ? 10 :                // During drag, but still below events (reduced from 15)
               shouldBeInteractive && !isOccupied ? 2 : 1, // Interactive but well below events (reduced from 5)
        pointerEvents: shouldEnablePointerEvents ? 'auto' : 'none'
      }}
      onDragEnter={shouldAllowDragEvents ? handleDragEnter : undefined}
      onDragOver={shouldAllowDragEvents ? handleDragOver : undefined}
      onDragLeave={shouldAllowDragEvents ? handleDragLeave : undefined}
      onDrop={shouldAllowDragEvents ? handleDrop : undefined}
      onMouseEnter={!children ? handleMouseEnter : undefined}
      onMouseLeave={!children ? handleMouseLeave : undefined}
      onMouseDown={!children ? handleMouseDown : undefined}
      onClick={!children ? handleClick : undefined}
    >
      {/* Content area */}
      <div
        className="relative h-full w-full"
        style={{
          pointerEvents: 'auto' // Always allow pointer events for children (events)
        }}
      >
        {children}

        {/* Current time indicator - always show if current time */}
        {isCurrentTime() && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-tactical-gold shadow-sm">
            <div className="absolute -left-1 -top-1 w-2 h-2 bg-tactical-gold rounded-full shadow-sm">
              <div className="absolute inset-0.5 bg-hud-text-primary rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DropZone