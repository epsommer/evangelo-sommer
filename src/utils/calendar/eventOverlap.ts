/**
 * Calendar Event Overlap Utilities
 *
 * Based on Google Calendar's column-based layout algorithm as documented in
 * ~/projects/apps/becky-mobile/research/calendar-ux-patterns.md
 *
 * This implements a sophisticated overlap detection and positioning system
 * that handles multiple concurrent events gracefully.
 */

import { UnifiedEvent } from '@/components/EventCreationModal'

export interface EventPosition {
  event: UnifiedEvent
  column: number
  maxColumns: number
  width: number
  left: number
  zIndex: number
}

export interface CollisionGroup {
  events: UnifiedEvent[]
  startTime: Date
  endTime: Date
  positions: Map<string, EventPosition>
}

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(event1: UnifiedEvent, event2: UnifiedEvent): boolean {
  const start1 = new Date(event1.startDateTime)
  const end1 = event1.endDateTime
    ? new Date(event1.endDateTime)
    : new Date(start1.getTime() + (event1.duration || 60) * 60000)

  const start2 = new Date(event2.startDateTime)
  const end2 = event2.endDateTime
    ? new Date(event2.endDateTime)
    : new Date(start2.getTime() + (event2.duration || 60) * 60000)

  return start1 < end2 && start2 < end1
}

/**
 * Check if an event overlaps with any events in a group
 */
function overlapsWithGroup(event: UnifiedEvent, group: UnifiedEvent[]): boolean {
  return group.some(groupEvent => eventsOverlap(event, groupEvent))
}

/**
 * Find collision groups - sets of events that overlap with each other
 * Based on Google Calendar's collision group algorithm
 */
export function findCollisionGroups(events: UnifiedEvent[]): CollisionGroup[] {
  // Sort events by start time ascending
  const sorted = [...events].sort((a, b) => {
    const timeA = new Date(a.startDateTime).getTime()
    const timeB = new Date(b.startDateTime).getTime()
    return timeA - timeB
  })

  const groups: CollisionGroup[] = []

  for (const event of sorted) {
    let placed = false

    // Try to add to an existing group
    for (const group of groups) {
      if (overlapsWithGroup(event, group.events)) {
        group.events.push(event)

        // Update group time bounds
        const eventStart = new Date(event.startDateTime)
        const eventEnd = event.endDateTime
          ? new Date(event.endDateTime)
          : new Date(eventStart.getTime() + (event.duration || 60) * 60000)

        if (eventStart < group.startTime) {
          group.startTime = eventStart
        }
        if (eventEnd > group.endTime) {
          group.endTime = eventEnd
        }

        placed = true
        break
      }
    }

    // If not placed in existing group, create new group
    if (!placed) {
      const eventStart = new Date(event.startDateTime)
      const eventEnd = event.endDateTime
        ? new Date(event.endDateTime)
        : new Date(eventStart.getTime() + (event.duration || 60) * 60000)

      groups.push({
        events: [event],
        startTime: eventStart,
        endTime: eventEnd,
        positions: new Map()
      })
    }
  }

  return groups
}

/**
 * Check if an event overlaps with any event in a specific column
 */
function overlapsWithColumn(event: UnifiedEvent, column: UnifiedEvent[]): boolean {
  return column.some(colEvent => eventsOverlap(event, colEvent))
}

/**
 * Assign columns to events within a collision group
 * Based on Google Calendar's left-to-right column assignment algorithm
 */
export function assignColumns(group: CollisionGroup): Map<string, EventPosition> {
  const columns: UnifiedEvent[][] = []
  const positions = new Map<string, EventPosition>()

  // Sort events by start time (should already be sorted, but ensure)
  const sortedEvents = [...group.events].sort((a, b) => {
    const timeA = new Date(a.startDateTime).getTime()
    const timeB = new Date(b.startDateTime).getTime()
    return timeA - timeB
  })

  // Assign each event to the leftmost available column
  for (const event of sortedEvents) {
    let columnIndex = 0

    // Find the leftmost column that doesn't conflict
    while (columnIndex < columns.length && overlapsWithColumn(event, columns[columnIndex])) {
      columnIndex++
    }

    // Create column if it doesn't exist
    if (!columns[columnIndex]) {
      columns[columnIndex] = []
    }

    // Add event to column
    columns[columnIndex].push(event)

    // Calculate position
    const maxColumns = columns.length
    const width = 100 / maxColumns
    const left = columnIndex * width
    const zIndex = 20 + columnIndex // Higher columns have higher z-index

    positions.set(event.id, {
      event,
      column: columnIndex,
      maxColumns,
      width,
      left,
      zIndex
    })
  }

  // Update all positions with final maxColumns count
  const finalMaxColumns = columns.length
  positions.forEach((position, eventId) => {
    position.maxColumns = finalMaxColumns
    position.width = 100 / finalMaxColumns
    position.left = position.column * (100 / finalMaxColumns)
  })

  group.positions = positions
  return positions
}

/**
 * Calculate positions for all events
 * Returns a map of event ID to position information
 */
export function calculateEventPositions(events: UnifiedEvent[]): Map<string, EventPosition> {
  const allPositions = new Map<string, EventPosition>()

  // Find collision groups
  const groups = findCollisionGroups(events)

  // Assign columns within each group
  for (const group of groups) {
    const groupPositions = assignColumns(group)

    // Add to overall positions map
    groupPositions.forEach((position, eventId) => {
      allPositions.set(eventId, position)
    })
  }

  // For events not in any collision group (shouldn't happen, but be safe)
  events.forEach(event => {
    if (!allPositions.has(event.id)) {
      allPositions.set(event.id, {
        event,
        column: 0,
        maxColumns: 1,
        width: 100,
        left: 0,
        zIndex: 20
      })
    }
  })

  return allPositions
}

/**
 * Get events for a specific time slot (hour)
 * Used by calendar views to filter events by time
 */
export function getEventsForTimeSlot(
  events: UnifiedEvent[],
  date: Date,
  hour: number
): UnifiedEvent[] {
  return events.filter(event => {
    const eventStart = new Date(event.startDateTime)
    const eventEnd = event.endDateTime
      ? new Date(event.endDateTime)
      : new Date(eventStart.getTime() + (event.duration || 60) * 60000)

    const slotStart = new Date(date)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(hour + 1, 0, 0, 0)

    return eventStart < slotEnd && eventEnd > slotStart
  })
}

/**
 * Calculate event height in pixels based on duration and pixels per hour
 */
export function calculateEventHeight(
  event: UnifiedEvent,
  pixelsPerHour: number
): number {
  const duration = event.duration || 60
  return (duration / 60) * pixelsPerHour
}

/**
 * Calculate event top position in pixels based on start time and pixels per hour
 */
export function calculateEventTop(
  event: UnifiedEvent,
  pixelsPerHour: number,
  startHour: number = 0
): number {
  const eventStart = new Date(event.startDateTime)
  const hours = eventStart.getHours() - startHour
  const minutes = eventStart.getMinutes()
  return (hours * pixelsPerHour) + (minutes / 60 * pixelsPerHour)
}
