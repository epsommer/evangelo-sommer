// React Hook for Unified Events Management

import { useState, useEffect, useCallback } from 'react'
import { isSameDay } from 'date-fns'
import { UnifiedEventsManager } from '@/lib/unified-events'
import type { UnifiedEvent, EventType, Priority, GoalTimeframe } from '@/components/EventCreationModal'

interface UseUnifiedEventsOptions {
  autoLoad?: boolean
  syncWithLegacy?: boolean
  refreshTrigger?: number
}

interface UseUnifiedEventsReturn {
  // Data
  events: UnifiedEvent[]
  isLoading: boolean
  error: string | null
  
  // Statistics
  statistics: ReturnType<typeof UnifiedEventsManager.getEventStatistics>
  
  // Actions
  createEvent: (eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UnifiedEvent>
  updateEvent: (id: string, updates: Partial<UnifiedEvent>) => Promise<UnifiedEvent | null>
  deleteEvent: (id: string) => Promise<boolean>
  refreshEvents: () => Promise<void>
  
  // Filtered getters
  getEventsByType: (type: EventType) => UnifiedEvent[]
  getEventsByPriority: (priority: Priority) => UnifiedEvent[]
  getEventsByClient: (clientId: string) => UnifiedEvent[]
  getEventsForDate: (date: Date) => UnifiedEvent[]
  getUpcomingEvents: (limit?: number) => UnifiedEvent[]
  getOverdueEvents: () => UnifiedEvent[]
  getActiveGoals: () => UnifiedEvent[]
  searchEvents: (query: string) => UnifiedEvent[]
}

export const useUnifiedEvents = (options: UseUnifiedEventsOptions = {}): UseUnifiedEventsReturn => {
  const { autoLoad = true, syncWithLegacy = false, refreshTrigger } = options
  
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load events from both localStorage and database with sync check
  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Import from legacy storage if requested and no unified events exist
      if (syncWithLegacy) {
        const existingEvents = UnifiedEventsManager.getAllEvents()
        if (existingEvents.length === 0) {
          UnifiedEventsManager.importFromLegacyStorage()
        }
      }

      // Try to load from API first (includes both localStorage and database)
      try {

        // Add timeout to fetch call
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
        }, 10000)

        const response = await fetch('/api/events?source=both', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()

          if (result.success) {
            setEvents(result.events)

            // Check if sync is needed in background
            checkSyncStatus()
            return
          }
        }
      } catch (apiError) {
        // API failed, fall back to localStorage
      }

      // Fallback to localStorage only
      const loadedEvents = UnifiedEventsManager.getAllEvents()
      setEvents(loadedEvents)
      setError('Warning: Displaying local events only - database may be unavailable')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events'
      setError(errorMessage)
      console.error('Error loading events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [syncWithLegacy])

  // Check sync status and auto-sync if needed
  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/events/sync')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const { status } = result

          // Auto-sync if there are localStorage-only events
          if (status.localOnlyEvents > 0 && status.localOnlyEvents <= 10) {
            try {
              await fetch('/api/events/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'migrate-to-database' })
              })
            } catch (syncError) {
              // Sync failed silently
            }
          }
        }
      }
    } catch (error) {
      // Sync status check failed silently
    }
  }, [])
  
  // Auto-load events on mount
  useEffect(() => {
    if (autoLoad) {
      loadEvents()
    }
  }, [autoLoad, loadEvents])

  // Refresh events when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadEvents()
    }
  }, [refreshTrigger, loadEvents])
  
  // Create new event with database-first approach and optional participant notifications
  const createEvent = useCallback(async (eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'> & { participants?: string[] }): Promise<UnifiedEvent> => {
    setError(null)

    try {
      // Validate event data
      const validation = UnifiedEventsManager.validateEvent(eventData)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      // SPECIAL CASE: Weekly recurring events need different handling
      // Check if this is a weekly recurring event (from vertical resize in month view)
      const isWeeklyRecurring = eventData.isRecurring &&
                                eventData.recurrence?.frequency === 'weekly' &&
                                eventData.recurrence?.endDate

      if (isWeeklyRecurring && eventData.recurrence?.endDate) {
        // Calculate weekly instances based on start date and recurrence end date
        const startDate = new Date(eventData.startDateTime)
        const endDate = eventData.endDateTime ? new Date(eventData.endDateTime) : startDate
        const recurrenceEndDate = new Date(eventData.recurrence.endDate + 'T23:59:59')

        // Extract time components from original event
        const startTimeStr = eventData.startDateTime.split('T')[1] || '00:00:00'
        const endTimeStr = eventData.endDateTime?.split('T')[1] || startTimeStr

        // Calculate the day span in days (e.g., Tue-Fri = 3 days difference)
        const daySpan = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

        // Generate weekly instances
        const weeklyInstances = []
        let currentWeekStart = new Date(startDate)

        while (currentWeekStart <= recurrenceEndDate) {
          const instanceStart = new Date(currentWeekStart)
          const instanceEnd = new Date(currentWeekStart)
          instanceEnd.setDate(instanceEnd.getDate() + daySpan)

          // Format dates with original times
          const instanceStartStr = instanceStart.toISOString().split('T')[0] + 'T' + startTimeStr
          const instanceEndStr = instanceEnd.toISOString().split('T')[0] + 'T' + endTimeStr

          // Only include if the instance start is within the recurrence range
          if (instanceStart <= recurrenceEndDate) {
            weeklyInstances.push({
              startDateTime: instanceStartStr,
              endDateTime: instanceEndStr,
              weekRow: weeklyInstances.length
            })
          }

          // Move to next week (add 7 days)
          currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        }

        console.log('🔄 [useUnifiedEvents] Detected weekly recurrence:', {
          startDate: eventData.startDateTime,
          endDate: eventData.endDateTime,
          recurrenceEndDate: eventData.recurrence.endDate,
          daySpan,
          instanceCount: weeklyInstances.length
        })

        // First, create the source event using regular API
        const sourceResponse = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        })

        if (!sourceResponse.ok) {
          const errorData = await sourceResponse.json().catch(() => ({ error: 'Failed to create source event' }))
          throw new Error(errorData.error || 'Failed to create source event')
        }

        const sourceResult = await sourceResponse.json()
        if (!sourceResult.success) {
          throw new Error(sourceResult.error || 'Failed to create source event')
        }

        const sourceEvent = sourceResult.event

        // Then, call weekly-recurrence API to create additional instances
        const recurrenceResponse = await fetch('/api/events/weekly-recurrence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceEventId: sourceEvent.id,
            weeklyInstances: weeklyInstances
          })
        })

        if (!recurrenceResponse.ok) {
          const errorData = await recurrenceResponse.json().catch(() => ({ error: 'Failed to create recurring instances' }))
          throw new Error(errorData.error || 'Failed to create recurring instances')
        }

        const recurrenceResult = await recurrenceResponse.json()
        if (!recurrenceResult.success) {
          throw new Error(recurrenceResult.error || 'Failed to create recurring instances')
        }

        // Update events: Add source event explicitly + additional instances from API
        // The API may or may not include the source event depending on date format matching,
        // so we explicitly add it and filter duplicates
        const additionalEvents = (recurrenceResult.events || []).filter(
          (e: UnifiedEvent) => e.id !== sourceEvent.id
        )

        // Update source event with recurrenceGroupId from the API response
        const updatedSourceEvent = {
          ...sourceEvent,
          recurrenceGroupId: recurrenceResult.recurrenceGroupId,
          isRecurring: true
        }

        setEvents(prev => [...prev, updatedSourceEvent, ...additionalEvents])

        const totalCreated = 1 + additionalEvents.length
        console.log(`✅ [useUnifiedEvents] Created ${totalCreated} weekly recurring events`)

        return sourceEvent // Return the source event as the primary result
      }

      // Regular event creation (non-weekly-recurring)
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }))
        throw new Error(errorData.error || 'Failed to create event')
      }

      const result = await response.json()

      if (!result.success) {
        // Handle warning case (event created but some features failed)
        if (result.warning) {
          setError(`Warning: ${result.warning}`)
        } else {
          throw new Error(result.error || 'Failed to create event')
        }
      }

      const newEvent = result.event
      setEvents(prev => [...prev, newEvent])

      return newEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event'
      setError(errorMessage)

      // Fallback to localStorage if API fails
      try {
        const newEvent = UnifiedEventsManager.createEvent(eventData)
        setEvents(prev => [...prev, newEvent])
        setError('Warning: Event created locally only - database unavailable')
        return newEvent
      } catch (fallbackErr) {
        throw new Error(errorMessage)
      }
    }
  }, [])
  
  // Update existing event with database-first approach and optimistic updates
  const updateEvent = useCallback(async (id: string, updates: Partial<UnifiedEvent>): Promise<UnifiedEvent | null> => {
    setError(null)

    // Store original event for rollback
    const originalEvent = events.find(e => e.id === id)
    if (!originalEvent) {
      throw new Error('Event not found')
    }

    // Create optimistic update
    const optimisticEvent: UnifiedEvent = {
      ...originalEvent,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    try {
      // Validate updates if they affect critical fields
      if (updates.title !== undefined || updates.startDateTime !== undefined || updates.endDateTime !== undefined) {
        const validation = UnifiedEventsManager.validateEvent(optimisticEvent)
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }
      }

      // Apply optimistic update immediately to prevent UI bounce-back
      setEvents(prev => prev.map(event => event.id === id ? optimisticEvent : event))

      // Try API first
      try {
        const response = await fetch(`/api/events?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })

        if (response.ok) {
          const result = await response.json()

          if (result.success) {
            const updatedEvent = result.event

            // Update with server response (may have additional fields)
            setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event))

            return updatedEvent
          } else {
            // Rollback optimistic update
            setEvents(prev => prev.map(event => event.id === id ? originalEvent : event))
            throw new Error(result.error || 'Failed to update event')
          }
        } else {
          // Rollback optimistic update
          setEvents(prev => prev.map(event => event.id === id ? originalEvent : event))
          throw new Error(`API error: ${response.status}`)
        }
      } catch (apiError) {

        // Try localStorage fallback
        const localUpdatedEvent = UnifiedEventsManager.updateEvent(id, updates)
        if (localUpdatedEvent) {
          // Keep the optimistic update (already applied)
          setError('Warning: Event updated locally only - database may be unavailable')
          return localUpdatedEvent
        } else {
          // Rollback if localStorage also failed
          setEvents(prev => prev.map(event => event.id === id ? originalEvent : event))
          throw apiError
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event'
      // Ensure rollback happened
      setEvents(prev => prev.map(event => event.id === id ? originalEvent : event))
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [events])

  // Delete event with database-first approach
  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setError(null)

    try {
      // Try API first
      let apiSuccess = false
      try {
        const response = await fetch(`/api/events?id=${id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            apiSuccess = true
          }
        }
      } catch (apiError) {
        // API deletion failed, will try localStorage
      }

      // Always attempt localStorage deletion for consistency
      const localSuccess = UnifiedEventsManager.deleteEvent(id)

      // Update local state if either API or localStorage deletion succeeded
      if (apiSuccess || localSuccess) {
        setEvents(prev => prev.filter(event => event.id !== id))
      }

      if (!apiSuccess && localSuccess) {
        setError('Warning: Event deleted locally only - database may be unavailable')
      }

      return apiSuccess || localSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete event'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  // Refresh events from storage
  const refreshEvents = useCallback(async () => {
    await loadEvents()
  }, [loadEvents])
  
  // Filtered getters - using local state for better performance
  const getEventsByType = useCallback((type: EventType): UnifiedEvent[] => {
    return events.filter(event => event.type === type)
  }, [events])
  
  const getEventsByPriority = useCallback((priority: Priority): UnifiedEvent[] => {
    return events.filter(event => event.priority === priority)
  }, [events])
  
  const getEventsByClient = useCallback((clientId: string): UnifiedEvent[] => {
    return events.filter(event => event.clientId === clientId)
  }, [events])
  
  const getEventsForDate = useCallback((date: Date): UnifiedEvent[] => {
    // Use isSameDay from date-fns for reliable timezone-aware date comparison
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return isSameDay(eventDate, date)
    })

    return filteredEvents
  }, [events])
  
  const getUpcomingEvents = useCallback((limit?: number): UnifiedEvent[] => {
    const now = new Date()
    const upcomingEvents = events
      .filter(event => new Date(event.startDateTime) > now)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    
    return limit ? upcomingEvents.slice(0, limit) : upcomingEvents
  }, [events])
  
  const getOverdueEvents = useCallback((): UnifiedEvent[] => {
    const now = new Date()
    return events.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return eventDate < now && (event.type === 'task' || event.type === 'milestone')
    })
  }, [events])
  
  const getActiveGoals = useCallback((): UnifiedEvent[] => {
    const goals = events.filter(event => event.type === 'goal')
    const now = new Date()
    
    return goals.filter(goal => {
      if (!goal.goalTimeframe) return false
      
      const goalDate = new Date(goal.startDateTime)
      
      switch (goal.goalTimeframe) {
        case 'daily':
          return goalDate.toDateString() === now.toDateString()
        case 'weekly':
          // Check if within same week
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          return goalDate >= weekStart && goalDate <= weekEnd
        case 'monthly':
          return goalDate.getMonth() === now.getMonth() && goalDate.getFullYear() === now.getFullYear()
        case 'quarterly':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          const goalQuarter = Math.floor(goalDate.getMonth() / 3)
          return goalQuarter === currentQuarter && goalDate.getFullYear() === now.getFullYear()
        case 'yearly':
          return goalDate.getFullYear() === now.getFullYear()
        default:
          return true // Custom timeframes are always considered active
      }
    })
  }, [events])
  
  const searchEvents = useCallback((query: string): UnifiedEvent[] => {
    const searchTerm = query.toLowerCase().trim()
    if (!searchTerm) return events
    
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      (event.description && event.description.toLowerCase().includes(searchTerm)) ||
      (event.location && event.location.toLowerCase().includes(searchTerm)) ||
      (event.clientName && event.clientName.toLowerCase().includes(searchTerm)) ||
      (event.notes && event.notes.toLowerCase().includes(searchTerm))
    )
  }, [events])
  
  // Calculate statistics
  const statistics = useCallback(() => {
    const now = new Date()
    
    return {
      total: events.length,
      byType: {
        events: events.filter(e => e.type === 'event').length,
        tasks: events.filter(e => e.type === 'task').length,
        goals: events.filter(e => e.type === 'goal').length,
        milestones: events.filter(e => e.type === 'milestone').length
      },
      byPriority: {
        low: events.filter(e => e.priority === 'low').length,
        medium: events.filter(e => e.priority === 'medium').length,
        high: events.filter(e => e.priority === 'high').length,
        urgent: events.filter(e => e.priority === 'urgent').length
      },
      upcoming: events.filter(e => new Date(e.startDateTime) > now).length,
      overdue: events.filter(e => {
        const eventDate = new Date(e.startDateTime)
        return eventDate < now && (e.type === 'task' || e.type === 'milestone')
      }).length,
      today: events.filter(e => {
        const eventDate = new Date(e.startDateTime)
        return eventDate.toDateString() === now.toDateString()
      }).length
    }
  }, [events])
  
  return {
    events,
    isLoading,
    error,
    statistics: statistics(),
    createEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getEventsByType,
    getEventsByPriority,
    getEventsByClient,
    getEventsForDate,
    getUpcomingEvents,
    getOverdueEvents,
    getActiveGoals,
    searchEvents
  }
}

export default useUnifiedEvents