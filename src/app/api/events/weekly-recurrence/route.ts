// Weekly Recurrence Creation API
// Creates linked weekly recurring event instances from vertical resize
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import type { UnifiedEvent } from '@/components/EventCreationModal'
import type { EventType, Priority } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

// Helper to map event type to Prisma EventType enum
function mapToValidEventType(type: string | undefined): EventType {
  if (!type) return 'EVENT' as EventType
  const normalizedType = type.toUpperCase()
  const validTypes = ['EVENT', 'TASK', 'GOAL', 'MILESTONE']
  if (validTypes.includes(normalizedType)) {
    return normalizedType as EventType
  }
  const typeMapping: Record<string, EventType> = {
    'APPOINTMENT': 'EVENT' as EventType,
    'MEETING': 'EVENT' as EventType,
    'REMINDER': 'TASK' as EventType,
    'TODO': 'TASK' as EventType,
  }
  return typeMapping[normalizedType] || ('EVENT' as EventType)
}

// Helper to map priority to Prisma Priority enum
function mapToValidPriority(priority: string | undefined): Priority {
  if (!priority) return 'MEDIUM' as Priority
  const normalizedPriority = priority.toUpperCase()
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  if (validPriorities.includes(normalizedPriority)) {
    return normalizedPriority as Priority
  }
  return 'MEDIUM' as Priority
}

interface WeeklyInstanceRequest {
  sourceEventId: string
  weeklyInstances: {
    startDateTime: string
    endDateTime: string
    weekRow: number
  }[]
  recurrenceGroupId?: string // Optional - will be generated if not provided
}

/**
 * POST /api/events/weekly-recurrence
 * Creates linked weekly recurring event instances
 */
export async function POST(request: NextRequest) {
  try {
    const data: WeeklyInstanceRequest = await request.json()
    const { sourceEventId, weeklyInstances, recurrenceGroupId: providedGroupId } = data

    console.log('📅 [WeeklyRecurrence] Creating weekly instances for event:', sourceEventId)
    console.log('📅 [WeeklyRecurrence] Instance count:', weeklyInstances.length)

    // Get the source event from database (localStorage doesn't exist on server)
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    const dbEvent = await prisma.event.findUnique({
      where: { id: sourceEventId }
    })

    if (!dbEvent) {
      return NextResponse.json(
        { success: false, error: 'Source event not found in database' },
        { status: 404 }
      )
    }

    // Convert database event to UnifiedEvent format
    const sourceEvent: UnifiedEvent = {
      id: dbEvent.id,
      type: dbEvent.type.toLowerCase() as UnifiedEvent['type'],
      title: dbEvent.title,
      description: dbEvent.description || undefined,
      startDateTime: dbEvent.startDateTime,
      endDateTime: dbEvent.endDateTime || undefined,
      duration: dbEvent.duration,
      priority: dbEvent.priority.toLowerCase() as UnifiedEvent['priority'],
      clientId: dbEvent.clientId || undefined,
      clientName: dbEvent.clientName || undefined,
      location: dbEvent.location || undefined,
      notes: dbEvent.notes || undefined,
      isAllDay: dbEvent.isAllDay,
      isMultiDay: dbEvent.isMultiDay,
      isRecurring: dbEvent.isRecurring,
      recurrenceGroupId: dbEvent.recurrenceGroupId || undefined,
      status: dbEvent.status || 'scheduled',
      service: dbEvent.service || dbEvent.title,
      scheduledDate: dbEvent.scheduledDate || dbEvent.startDateTime,
      createdAt: dbEvent.createdAt.toISOString(),
      updatedAt: dbEvent.updatedAt.toISOString()
    }

    // Generate or use provided recurrence group ID
    const recurrenceGroupId = providedGroupId || uuidv4()

    // Check if the source event spans multiple days
    const eventStart = new Date(sourceEvent.startDateTime)
    const eventEnd = sourceEvent.endDateTime ? new Date(sourceEvent.endDateTime) : eventStart
    const isMultiDay = eventStart.toDateString() !== eventEnd.toDateString()

    // Update source event with recurrence group ID and isMultiDay flag in database
    await prisma.event.update({
      where: { id: sourceEventId },
      data: {
        recurrenceGroupId,
        isRecurring: true,
        isMultiDay: isMultiDay
      }
    })
    console.log('✅ [WeeklyRecurrence] Updated source event with recurrence group ID and isMultiDay:', isMultiDay)

    const createdEvents: UnifiedEvent[] = []

    // Create each weekly instance
    for (const instance of weeklyInstances) {
      // Skip if this is the same as the source event (already exists)
      if (instance.startDateTime === sourceEvent.startDateTime &&
          instance.endDateTime === sourceEvent.endDateTime) {
        // Include the source event with updated flags
        createdEvents.push({
          ...sourceEvent,
          isMultiDay: isMultiDay,
          recurrenceGroupId,
          isRecurring: true
        })
        continue
      }

      // Calculate duration
      const duration = Math.round(
        (new Date(instance.endDateTime).getTime() - new Date(instance.startDateTime).getTime()) / (1000 * 60)
      )

      // Check if this instance spans multiple days
      const instanceStart = new Date(instance.startDateTime)
      const instanceEnd = new Date(instance.endDateTime)
      const instanceIsMultiDay = instanceStart.toDateString() !== instanceEnd.toDateString()

      // Generate new event ID
      const newEventId = uuidv4()

      // Create new event directly in database
      try {
        await prisma.event.create({
          data: {
            id: newEventId,
            type: mapToValidEventType(sourceEvent.type),
            title: sourceEvent.title,
            description: sourceEvent.description,
            startDateTime: instance.startDateTime,
            endDateTime: instance.endDateTime,
            duration,
            priority: mapToValidPriority(sourceEvent.priority),
            clientId: sourceEvent.clientId,
            clientName: sourceEvent.clientName,
            location: sourceEvent.location,
            notes: sourceEvent.notes,
            isAllDay: sourceEvent.isAllDay || false,
            isMultiDay: instanceIsMultiDay,
            isRecurring: true,
            parentEventId: sourceEventId,
            recurrenceGroupId,
            status: sourceEvent.status,
            service: sourceEvent.service,
            scheduledDate: instance.startDateTime,
          }
        })
        console.log('✅ [WeeklyRecurrence] Database event created:', newEventId)

        // Add to created events list
        createdEvents.push({
          ...sourceEvent,
          id: newEventId,
          startDateTime: instance.startDateTime,
          endDateTime: instance.endDateTime,
          duration,
          isMultiDay: instanceIsMultiDay,
          recurrenceGroupId,
          isRecurring: true,
          parentEventId: sourceEventId
        })
      } catch (dbError) {
        console.error('⚠️ [WeeklyRecurrence] Database persistence failed:', dbError)
      }
    }

    console.log(`✅ [WeeklyRecurrence] Created ${createdEvents.length} weekly instances`)

    return NextResponse.json({
      success: true,
      recurrenceGroupId,
      events: createdEvents,
      count: createdEvents.length,
      message: `Created ${createdEvents.length} weekly recurring instances`
    })

  } catch (error) {
    console.error('❌ [WeeklyRecurrence] Error creating weekly instances:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create weekly recurrence'
      },
      { status: 500 }
    )
  }
}

type RecurringDeleteOption = 'this_only' | 'all_previous' | 'this_and_following' | 'all'

interface DeleteRequestBody {
  eventId: string
  option: RecurringDeleteOption
  recurrenceGroupId: string
}

/**
 * DELETE /api/events/weekly-recurrence
 * Deletes events in a recurrence group based on the selected option
 *
 * Query params (legacy - deletes all):
 *   ?recurrenceGroupId=xxx
 *
 * Body params (new - supports all options):
 *   { eventId, option, recurrenceGroupId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryRecurrenceGroupId = searchParams.get('recurrenceGroupId')

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      )
    }

    // Check if this is a body-based request (new) or query-based (legacy)
    let eventId: string | null = null
    let option: RecurringDeleteOption = 'all'
    let recurrenceGroupId: string | null = queryRecurrenceGroupId

    // Try to parse body for new-style requests
    try {
      const body: DeleteRequestBody = await request.json()
      if (body.eventId && body.option && body.recurrenceGroupId) {
        eventId = body.eventId
        option = body.option
        recurrenceGroupId = body.recurrenceGroupId
      }
    } catch {
      // No body or invalid JSON - use query params (legacy mode)
    }

    if (!recurrenceGroupId) {
      return NextResponse.json(
        { success: false, error: 'recurrenceGroupId is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ [WeeklyRecurrence] Delete request:', { eventId, option, recurrenceGroupId })

    // Find all events in the recurrence group, sorted by start date
    const allEvents = await prisma.event.findMany({
      where: { recurrenceGroupId },
      orderBy: { startDateTime: 'asc' },
      select: { id: true, startDateTime: true }
    })

    if (allEvents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No events found with this recurrence group ID' },
        { status: 404 }
      )
    }

    // Determine which event IDs to delete based on option
    let eventIdsToDelete: string[] = []

    if (option === 'all' || !eventId) {
      // Delete all events in the group
      eventIdsToDelete = allEvents.map(e => e.id)
    } else {
      // Find the current event's position
      const currentEventIndex = allEvents.findIndex(e => e.id === eventId)

      if (currentEventIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Event not found in recurrence group' },
          { status: 404 }
        )
      }

      switch (option) {
        case 'this_only':
          eventIdsToDelete = [eventId]
          break
        case 'all_previous':
          // Delete all events before the current one (exclusive)
          eventIdsToDelete = allEvents.slice(0, currentEventIndex).map(e => e.id)
          break
        case 'this_and_following':
          // Delete this event and all following
          eventIdsToDelete = allEvents.slice(currentEventIndex).map(e => e.id)
          break
      }
    }

    if (eventIdsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        deletedIds: [],
        message: 'No events to delete'
      })
    }

    console.log(`🗑️ [WeeklyRecurrence] Deleting ${eventIdsToDelete.length} events`)

    // Delete EventSync records first
    await prisma.eventSync.deleteMany({
      where: {
        eventId: { in: eventIdsToDelete }
      }
    })

    // Delete the selected events
    const result = await prisma.event.deleteMany({
      where: { id: { in: eventIdsToDelete } }
    })

    console.log(`✅ [WeeklyRecurrence] Deleted ${result.count} events from database`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      deletedIds: eventIdsToDelete,
      message: `Deleted ${result.count} recurring event${result.count !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('❌ [WeeklyRecurrence] Error deleting recurrence group:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recurrence group'
      },
      { status: 500 }
    )
  }
}
