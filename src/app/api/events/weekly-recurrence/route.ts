// Weekly Recurrence Creation API
// Creates linked weekly recurring event instances from vertical resize
import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { UnifiedEventsManager } from '@/lib/unified-events'
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

    // Get the source event from localStorage
    const sourceEvent = UnifiedEventsManager.getEventById(sourceEventId)
    if (!sourceEvent) {
      return NextResponse.json(
        { success: false, error: 'Source event not found' },
        { status: 404 }
      )
    }

    // Generate or use provided recurrence group ID
    const recurrenceGroupId = providedGroupId || uuidv4()

    // Update source event with recurrence group ID
    UnifiedEventsManager.updateEvent(sourceEventId, {
      recurrenceGroupId,
      isRecurring: true
    })

    const createdEvents: UnifiedEvent[] = []
    const prisma = getPrismaClient()

    // Create each weekly instance
    for (const instance of weeklyInstances) {
      // Skip if this is the same as the source event (already exists)
      if (instance.startDateTime === sourceEvent.startDateTime &&
          instance.endDateTime === sourceEvent.endDateTime) {
        // Update source event instead
        if (prisma) {
          try {
            await prisma.event.update({
              where: { id: sourceEventId },
              data: { recurrenceGroupId }
            })
          } catch (dbError) {
            console.warn('⚠️ Failed to update source event in database:', dbError)
          }
        }
        createdEvents.push(sourceEvent)
        continue
      }

      // Calculate duration
      const duration = Math.round(
        (new Date(instance.endDateTime).getTime() - new Date(instance.startDateTime).getTime()) / (1000 * 60)
      )

      // Create new event in localStorage
      const newEvent = UnifiedEventsManager.createEvent({
        ...sourceEvent,
        id: uuidv4(), // Generate new ID
        startDateTime: instance.startDateTime,
        endDateTime: instance.endDateTime,
        duration,
        recurrenceGroupId,
        isRecurring: true,
        parentEventId: sourceEventId, // Link to source event
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      createdEvents.push(newEvent)

      // Persist to database if available
      if (prisma) {
        try {
          await prisma.event.create({
            data: {
              id: newEvent.id,
              type: mapToValidEventType(newEvent.type),
              title: newEvent.title,
              description: newEvent.description,
              startDateTime: newEvent.startDateTime,
              endDateTime: newEvent.endDateTime,
              duration: newEvent.duration,
              priority: mapToValidPriority(newEvent.priority),
              clientId: newEvent.clientId,
              clientName: newEvent.clientName,
              location: newEvent.location,
              notes: newEvent.notes,
              isAllDay: newEvent.isAllDay || false,
              isMultiDay: newEvent.isMultiDay || false,
              isRecurring: true,
              parentEventId: sourceEventId,
              recurrenceGroupId,
              notifications: newEvent.notifications ? JSON.stringify(newEvent.notifications) : null,
              recurrence: newEvent.recurrence ? JSON.stringify(newEvent.recurrence) : null,
              status: newEvent.status,
              service: newEvent.service,
              scheduledDate: newEvent.scheduledDate,
            }
          })
          console.log('✅ [WeeklyRecurrence] Database event created:', newEvent.id)
        } catch (dbError) {
          console.error('⚠️ [WeeklyRecurrence] Database persistence failed:', dbError)
        }
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

/**
 * DELETE /api/events/weekly-recurrence?recurrenceGroupId=xxx
 * Deletes all events in a recurrence group
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recurrenceGroupId = searchParams.get('recurrenceGroupId')

    if (!recurrenceGroupId) {
      return NextResponse.json(
        { success: false, error: 'recurrenceGroupId is required' },
        { status: 400 }
      )
    }

    console.log('🗑️ [WeeklyRecurrence] Deleting all events in group:', recurrenceGroupId)

    // Get all events in the recurrence group from localStorage
    const allEvents = UnifiedEventsManager.getAllEvents()
    const eventsToDelete = allEvents.filter(e => e.recurrenceGroupId === recurrenceGroupId)

    if (eventsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No events found with this recurrence group ID' },
        { status: 404 }
      )
    }

    let deletedCount = 0

    // Delete each event from localStorage
    for (const event of eventsToDelete) {
      const deleted = UnifiedEventsManager.deleteEvent(event.id)
      if (deleted) deletedCount++
    }

    // Delete from database if available
    const prisma = getPrismaClient()
    let dbDeletedCount = 0
    if (prisma) {
      try {
        // Delete EventSync records first
        await prisma.eventSync.deleteMany({
          where: {
            eventId: { in: eventsToDelete.map(e => e.id) }
          }
        })

        // Delete events
        const result = await prisma.event.deleteMany({
          where: { recurrenceGroupId }
        })
        dbDeletedCount = result.count
        console.log(`✅ [WeeklyRecurrence] Deleted ${dbDeletedCount} events from database`)
      } catch (dbError) {
        console.error('⚠️ [WeeklyRecurrence] Database deletion failed:', dbError)
      }
    }

    console.log(`✅ [WeeklyRecurrence] Deleted ${deletedCount} events from localStorage`)

    return NextResponse.json({
      success: true,
      deletedCount,
      dbDeletedCount,
      message: `Deleted ${deletedCount} recurring events`
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
