// React Hook for Unified Events Management

import { useState, useEffect, useCallback } from 'react'
import { UnifiedEventsManager } from '@/lib/unified-events'
import type { UnifiedEvent, EventType, Priority, GoalTimeframe } from '@/components/EventCreationModal'

interface UseUnifiedEventsOptions {
  autoLoad?: boolean
  syncWithLegacy?: boolean
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
  const { autoLoad = true, syncWithLegacy = false } = options
  
  const [events, setEvents] = useState<UnifiedEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load events from storage
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
      
      const loadedEvents = UnifiedEventsManager.getAllEvents()
      setEvents(loadedEvents)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events'
      setError(errorMessage)
      console.error('Error loading events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [syncWithLegacy])
  
  // Auto-load events on mount
  useEffect(() => {
    if (autoLoad) {
      loadEvents()
    }
  }, [autoLoad, loadEvents])
  
  // Create new event
  const createEvent = useCallback(async (eventData: Omit<UnifiedEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnifiedEvent> => {
    setError(null)
    
    try {
      // Validate event data
      const validation = UnifiedEventsManager.validateEvent(eventData)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }
      
      const newEvent = UnifiedEventsManager.createEvent(eventData)
      setEvents(prev => [...prev, newEvent])
      
      return newEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])
  
  // Update existing event
  const updateEvent = useCallback(async (id: string, updates: Partial<UnifiedEvent>): Promise<UnifiedEvent | null> => {
    setError(null)
    
    try {
      // Validate updates if they affect critical fields
      if (updates.title !== undefined || updates.startDateTime !== undefined || updates.endDateTime !== undefined) {
        const currentEvent = events.find(e => e.id === id)
        if (!currentEvent) {
          throw new Error('Event not found')
        }
        
        const updatedEventData = { ...currentEvent, ...updates }
        const validation = UnifiedEventsManager.validateEvent(updatedEventData)
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '))
        }
      }
      
      const updatedEvent = UnifiedEventsManager.updateEvent(id, updates)
      if (updatedEvent) {
        setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event))
      }
      
      return updatedEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [events])
  
  // Delete event
  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    
    try {
      const success = UnifiedEventsManager.deleteEvent(id)
      if (success) {
        setEvents(prev => prev.filter(event => event.id !== id))
      }
      
      return success
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
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDateStr = event.startDateTime.split('T')[0]
      return eventDateStr === dateStr
    })
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