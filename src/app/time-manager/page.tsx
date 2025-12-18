"use client"

import React, { useState, Suspense, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import CRMLayout from '@/components/CRMLayout'
import CalendarLayout from '@/components/CalendarLayout'
import UnifiedDailyPlanner from '@/components/UnifiedDailyPlanner'
import ScheduleCalendar from '@/components/ScheduleCalendar'
import TimeManagerNavigation from '@/components/TimeManagerNavigation'
import WeekView from '@/components/WeekView'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import EventDetailsModal from '@/components/EventDetailsModal'
import ConflictResolutionModal from '@/components/ConflictResolutionModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { ViewManagerProvider, useViewManager } from '@/contexts/ViewManagerContext'
import { CalendarEvent } from '@/types/scheduling'
import { conflictDetector, ConflictResult, ResolutionStrategy } from '@/lib/conflict-detector'

const TimeManagerContent = () => {
  const searchParams = useSearchParams()
  const { state, setCurrentView, setSelectedDate } = useViewManager()
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [initialClientId, setInitialClientId] = useState<string | undefined>(undefined)
  const [initialClientName, setInitialClientName] = useState<string | undefined>(undefined)

  // Event creation mode state (for sidebar integration)
  const [isEventCreationMode, setIsEventCreationMode] = useState(false)
  const [eventCreationTime, setEventCreationTime] = useState<string | null>(null)
  const [eventCreationDate, setEventCreationDate] = useState<Date | null>(null)

  // Event details mode state (for sidebar integration)
  const [sidebarSelectedEvent, setSidebarSelectedEvent] = useState<UnifiedEvent | null>(null)

  // Placeholder event state (visual ghost event during creation)
  const [placeholderEvent, setPlaceholderEvent] = useState<{
    date: string
    hour: number
    minutes?: number // For precise positioning
    duration: number
    title?: string
    endDate?: string
    endHour?: number
    endMinutes?: number // For precise end time positioning
  } | null>(null)

  // Conflict resolution state
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<UnifiedEvent | null>(null)
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null)
  const [recentlyCreatedEvents, setRecentlyCreatedEvents] = useState<Set<string>>(new Set())

  // Global conflict tracking for sidebar icon
  const [globalConflictCount, setGlobalConflictCount] = useState(0)
  const [allConflicts, setAllConflicts] = useState<ConflictResult | null>(null)

  // Use unified events hook for global event management
  const { events: allEvents, createEvent, updateEvent, deleteEvent } = useUnifiedEvents({
    refreshTrigger
  })

  // Handle URL parameters for scheduling from client page
  useEffect(() => {
    const clientIdParam = searchParams.get('client')
    const scheduleParam = searchParams.get('schedule')

    if (clientIdParam && scheduleParam === 'true') {
      // Load client info from localStorage
      try {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]')
        const client = clients.find((c: any) => c.id === clientIdParam)

        if (client) {
          setInitialClientId(client.id)
          setInitialClientName(client.name)
          setShowEventModal(true)
        }
      } catch (error) {
        console.error('Error loading client for scheduling:', error)
      }
    }
  }, [searchParams])

  // Calculate global conflicts whenever events change
  // Only counts temporal overlaps (real conflicts), not business rules
  useEffect(() => {
    const calculateGlobalConflicts = () => {
      const existingEvents = getAllExistingEvents()
      if (existingEvents.length < 2) {
        setGlobalConflictCount(0)
        setAllConflicts(null)
        return
      }

      // Use batch detection to find all conflicts between existing events
      const batchResults = conflictDetector.detectBatchConflicts(existingEvents)

      // Count unique temporal overlaps only (filter out business rules)
      const conflictSet = new Set<string>()
      const allConflictDetails: ConflictResult['conflicts'] = []

      batchResults.forEach((result, eventId) => {
        result.conflicts
          .filter(c => c.type === 'temporal_overlap') // Only real overlaps
          .forEach(conflict => {
            // Create a unique key for this conflict pair to avoid counting twice
            const ids = [eventId, conflict.conflictingEvent.id].sort()
            const conflictKey = `${ids[0]}_${ids[1]}`
            if (!conflictSet.has(conflictKey)) {
              conflictSet.add(conflictKey)
              allConflictDetails.push(conflict)
            }
          })
      })

      setGlobalConflictCount(conflictSet.size)
      setAllConflicts(conflictSet.size > 0 ? {
        hasConflicts: true,
        conflicts: allConflictDetails,
        suggestions: [],
        canProceed: true
      } : null)
    }

    calculateGlobalConflicts()
  }, [allEvents, refreshTrigger])

  // Clear placeholder on outside clicks (clicks outside the calendar canvas)
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Only clear if there's a placeholder and the click is outside the calendar area
      if (placeholderEvent) {
        const target = event.target as HTMLElement

        // Check if click is on calendar elements or sidebar form
        const isCalendarClick = target.closest('.neo-card') ||
                                target.closest('[data-calendar-view]') ||
                                target.closest('[data-date]') ||
                                target.closest('[data-week-row]')

        const isSidebarClick = target.closest('[data-sidebar]') ||
                               target.closest('[data-event-form]')

        // Clear placeholder if clicking outside both calendar and sidebar
        if (!isCalendarClick && !isSidebarClick) {
          setPlaceholderEvent(null)
        }
      }
    }

    document.addEventListener('click', handleDocumentClick)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [placeholderEvent])

  // Handler for opening conflict modal from sidebar icon
  const handleShowConflicts = useCallback(() => {
    if (allConflicts && allConflicts.conflicts.length > 0) {
      // Use the first conflicting event as the "proposed" event for display
      const firstConflict = allConflicts.conflicts[0]
      setPendingEvent(firstConflict.proposedEvent)
      setConflicts(allConflicts)
      setShowConflictModal(true)
    }
  }, [allConflicts])

  // Helper function to get all existing events for conflict detection
  const getAllExistingEvents = (): UnifiedEvent[] => {
    const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
    const localEvents = JSON.parse(localStorage.getItem('calendar-events') || '[]')

    // Convert scheduled services to UnifiedEvent format with proper data validation
    const serviceEvents: UnifiedEvent[] = scheduledServices
      .filter((service: any) => service && service.id && (service.startTime || service.scheduledDate))
      .map((service: any) => {
        // Handle different time field names and formats
        let startDateTime: string
        let endDateTime: string

        if (service.startTime) {
          startDateTime = service.startTime instanceof Date ? service.startTime.toISOString() : service.startTime
        } else if (service.scheduledDate) {
          startDateTime = service.scheduledDate instanceof Date ? service.scheduledDate.toISOString() : service.scheduledDate
        } else {
          console.warn('Service missing start time:', service)
          return null
        }

        if (service.endTime) {
          endDateTime = service.endTime instanceof Date ? service.endTime.toISOString() : service.endTime
        } else {
          // Calculate end time based on duration
          const startTime = new Date(startDateTime)
          const duration = service.duration || 60
          const endTime = new Date(startTime.getTime() + (duration * 60 * 1000))
          endDateTime = endTime.toISOString()
        }

        return {
          id: service.id,
          type: 'task' as const,
          title: service.title || `${service.service || 'Service'} - ${service.clientName || service.client || 'Client'}`,
          description: service.description || service.notes || '',
          startDateTime,
          endDateTime,
          duration: service.duration || 60,
          clientName: service.client || service.clientName,
          location: service.location,
          priority: service.priority || 'medium',
          status: service.status || 'pending'
        }
      })
      .filter(Boolean) as UnifiedEvent[]

    // Validate local events and ensure they have required fields
    const validLocalEvents: UnifiedEvent[] = localEvents
      .filter((event: any) => event && event.id && event.startDateTime)

    // Combine all events and deduplicate by ID
    const allEvents = [...serviceEvents, ...validLocalEvents]
    const uniqueEvents = allEvents.filter((event, index, array) =>
      array.findIndex(e => e.id === event.id) === index
    )

    return uniqueEvents
  }

  // Global event handlers for all calendar views
  const handleEventCreate = async (eventData: UnifiedEvent) => {
    try {
      const isEditing = editingEvent !== null

      if (isEditing) {
        // Update existing event
        await updateEvent(eventData.id, eventData)
        setShowEventModal(false)
        setEditingEvent(null)
        setRefreshTrigger(prev => prev + 1) // Force UI refresh after update
        return
      }

      // Create event directly - conflicts are tracked but don't block creation
      await createEvent(eventData)
      setShowEventModal(false)
      setPlaceholderEvent(null) // Clear placeholder after event is created

      // Trigger refresh of all calendar views and recalculate global conflicts
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('❌ Error creating/updating event:', error)
    }
  }

  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleEventView = (event: UnifiedEvent) => {
    // Clear any existing placeholder when viewing an event
    setPlaceholderEvent(null)

    // Show event details in sidebar for week and month views
    if (state.currentView === 'week' || state.currentView === 'month') {
      setSidebarSelectedEvent(event)
      // Clear event creation mode if active
      setIsEventCreationMode(false)
      setEventCreationTime(null)
    } else {
      // Use modal for day view
      setSelectedEvent(event)
      setShowDetailsModal(true)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
      setShowDetailsModal(false)
      setRefreshTrigger(prev => prev + 1) // Force UI refresh after deletion
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleEditFromDetails = (event: UnifiedEvent) => {
    setShowDetailsModal(false)
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleTaskEdit = (task: any) => {
    if ('startTime' in task && 'endTime' in task) {
      const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
      const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)
      
      const event: UnifiedEvent = {
        id: task.id,
        type: 'task' as const,
        title: task.title,
        description: task.description,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
        priority: task.priority,
        clientId: task.clientId,
        location: task.location,
        notes: task.notes,
        status: task.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setEditingEvent(event)
      setShowEventModal(true)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteEvent(taskId)
      setRefreshTrigger(prev => prev + 1) // Force UI refresh after deletion
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    try {
      // Since we need to update the full event, we need to get the current event first
      // For now, let's update the localStorage directly for scheduled services
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')

      const updatedServices = scheduledServices.map((service: any) => {
        if (service.id === taskId) {
          return { ...service, status }
        }
        return service
      })

      localStorage.setItem('scheduled-services', JSON.stringify(updatedServices))

      // Trigger a refresh of components that depend on scheduled services
      setRefreshTrigger(prev => prev + 1)

    } catch (error) {
      console.error('Error updating event status:', error)
    }
  }

  const handleTimeSlotClick = (date: Date, hour?: number) => {
    const timeString = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00'

    // Clear any existing placeholder on single click
    // This prevents "cut and paste" behavior after drag
    // User must double-click to create a new placeholder
    if (placeholderEvent) {
      setPlaceholderEvent(null)
    }

    // Set sidebar to event creation mode
    setEventCreationTime(timeString)
    setEventCreationDate(date)
    setIsEventCreationMode(true)

    // Also set modal state as fallback
    setModalInitialDate(date)
    setModalInitialTime(timeString)
    setEditingEvent(null)
  }

  const handleTimeSlotDoubleClick = (date: Date, hour: number, minutes: number = 0) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    const dateString = format(date, 'yyyy-MM-dd')

    // Close event details if open
    setSidebarSelectedEvent(null)

    // Check if there's already a multi-day placeholder from a drag operation
    // Only preserve it if this double-click is on the SAME start date (i.e., completing a drag)
    // If clicking on a different date, the user wants a NEW placeholder
    const hasExistingMultiDayPlaceholder = placeholderEvent?.endDate &&
      placeholderEvent.endDate !== placeholderEvent.date
    const isCompletingDragFromSameDate = hasExistingMultiDayPlaceholder &&
      placeholderEvent.date === dateString

    if (!isCompletingDragFromSameDate) {
      // Set placeholder event (ghost box in calendar)
      // Start with compact 15-minute placeholder, user can drag to expand
      setPlaceholderEvent({
        date: dateString,
        hour: hour,
        minutes: minutes,
        duration: 15, // Compact initial display
        title: undefined
      })
    }

    // Set sidebar to event creation mode
    setEventCreationTime(timeString)
    setEventCreationDate(date)
    setIsEventCreationMode(true)
  }

  const handleExitEventCreation = () => {
    setIsEventCreationMode(false)
    setEventCreationTime(null)
    setEventCreationDate(null)
    setPlaceholderEvent(null) // Clear placeholder when exiting creation mode
  }

  const handleExitEventDetails = () => {
    setSidebarSelectedEvent(null)
  }

  // Use ref to track last values and prevent unnecessary updates
  const lastFormChangeRef = useRef<{ date?: string; startTime?: string; duration?: number }>({})

  const handleFormChange = useCallback((data: { title?: string; date?: string; startTime?: string; duration?: number }) => {
    // Update placeholder event when sidebar form changes
    // Only update if values actually changed to prevent infinite loops
    const last = lastFormChangeRef.current
    if (
      data.date === last.date &&
      data.startTime === last.startTime &&
      data.duration === last.duration
    ) {
      return // No actual change, skip update
    }

    lastFormChangeRef.current = { date: data.date, startTime: data.startTime, duration: data.duration }

    setPlaceholderEvent(prev => {
      if (!prev || !data.date || data.startTime === undefined || data.duration === undefined) {
        return prev
      }
      const hour = parseInt(data.startTime.split(':')[0])
      return {
        ...prev,
        date: data.date,
        hour: hour,
        duration: data.duration,
        title: data.title
      }
    })
  }, [])

  const handlePlaceholderChange = useCallback((placeholder: {
    date: string
    hour: number
    duration: number
    title?: string
    endDate?: string
    endHour?: number
    endMinutes?: number
  } | null) => {
    setPlaceholderEvent(placeholder)
    // Note: We intentionally don't update sidebar form state here to avoid circular updates.
    // The form is the source of truth; placeholder is just visual feedback.
  }, [])

  const handleSidebarEventEdit = (event: UnifiedEvent) => {
    // Close sidebar event details
    setSidebarSelectedEvent(null)
    // Open edit modal
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleSidebarEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
      setSidebarSelectedEvent(null)
      setRefreshTrigger(prev => prev + 1) // Force UI refresh after deletion
    } catch (error) {
      console.error('Error deleting event from sidebar:', error)
    }
  }

  // Conflict resolution handlers
  const handleAcceptConflict = async (conflictId: string) => {
    // Just remove this specific conflict from the modal, but don't create the event yet
    // The user should resolve all conflicts before the event is created
    if (conflicts && pendingEvent) {
      const updatedConflicts = {
        ...conflicts,
        conflicts: conflicts.conflicts.filter(c => c.id !== conflictId)
      }
      setConflicts(updatedConflicts)
    }
  }

  const handleDeleteEvent = async (conflictId: string, eventId: string) => {
    try {
      // Try deleting from unified events first
      const result = await deleteEvent(eventId)

      // Also try deleting from legacy localStorage systems
      let deletedFromLegacy = false

      // Try deleting from scheduled-services
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      const filteredScheduledServices = scheduledServices.filter((service: any) => service.id !== eventId)
      if (filteredScheduledServices.length < scheduledServices.length) {
        localStorage.setItem('scheduled-services', JSON.stringify(filteredScheduledServices))
        deletedFromLegacy = true
      }

      // Try deleting from calendar-events
      const calendarEvents = JSON.parse(localStorage.getItem('calendar-events') || '[]')
      const filteredCalendarEvents = calendarEvents.filter((event: any) => event.id !== eventId)
      if (filteredCalendarEvents.length < calendarEvents.length) {
        localStorage.setItem('calendar-events', JSON.stringify(filteredCalendarEvents))
        deletedFromLegacy = true
      }

      // Recalculate conflicts for the modal after deletion
      if (pendingEvent) {
        const updatedExistingEvents = getAllExistingEvents()

        const freshConflictResult = conflictDetector.detectConflicts(pendingEvent, updatedExistingEvents)

        // Keep track of previously accepted conflicts by comparing with current conflicts state
        const currentConflictIds = conflicts?.conflicts.map(c => c.id) || []
        const originalConflictIds = conflictDetector.detectConflicts(pendingEvent, getAllExistingEvents()).conflicts.map(c => c.id)
        const acceptedConflictIds = originalConflictIds.filter(id => !currentConflictIds.includes(id))

        // Filter out conflicts that were previously accepted (mainly business rules)
        const filteredConflicts = freshConflictResult.conflicts.filter(conflict => {
          return !acceptedConflictIds.includes(conflict.id)
        })

        const updatedConflictResult = {
          ...freshConflictResult,
          conflicts: filteredConflicts,
          hasConflicts: filteredConflicts.length > 0
        }

        setConflicts(updatedConflictResult)
      }

      // Force refresh to update conflict indicators and calendar
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleRescheduleEvent = async (conflictId: string, eventId: string) => {
    // TODO: Implement rescheduling logic - for now just create the pending event
    if (pendingEvent) {
      await createEvent(pendingEvent)

      // Force refresh to update conflict indicators and calendar views
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleConflictAcceptSave = async () => {
    // Check if there are any remaining conflicts
    if (conflicts && conflicts.conflicts.length === 0 && pendingEvent) {
      // No remaining conflicts - create the event
      try {
        const createdEvent = await createEvent(pendingEvent)

        // Track this event as recently created to prevent immediate conflict re-detection
        if (createdEvent && createdEvent.id) {
          setRecentlyCreatedEvents(prev => new Set([...prev, createdEvent.id]))

          // Remove from exclusion list after 5 seconds
          setTimeout(() => {
            setRecentlyCreatedEvents(prev => {
              const newSet = new Set(prev)
              newSet.delete(createdEvent.id)
              return newSet
            })
          }, 5000)
        }

        // Trigger refresh of all calendar views
        setRefreshTrigger(prev => prev + 1)

        // Close the modal after successful creation
        setShowConflictModal(false)
        setPendingEvent(null)
        setConflicts(null)
      } catch (error) {
        console.error('Failed to create pending event:', error)
      }
    }
    // If conflicts remain, don't close modal - user needs to resolve them
  }

  const handleConflictCancel = async () => {
    // Just close the modal without creating events
    setShowConflictModal(false)
    setPendingEvent(null)
    setConflicts(null)
  }

  const handleExistingEventConflictClick = (event: UnifiedEvent, conflicts: ConflictResult) => {
    setPendingEvent(event)
    setConflicts(conflicts)
    setShowConflictModal(true)
  }

  const handleDayClick = (date: Date) => {
    // Navigate to daily view for the selected date
    setSelectedDate(date)
    setCurrentView('day')
  }

  const renderCurrentView = () => {
    const viewContent = (() => {
      switch (state.currentView) {
        case 'day':
          return (
            <UnifiedDailyPlanner
              date={state.selectedDate}
              onEventView={handleEventView}
              refreshTrigger={refreshTrigger}
              onRefreshTrigger={() => setRefreshTrigger(prev => prev + 1)}
              onTaskStatusChange={handleTaskStatusChange}
              onConflictClick={handleExistingEventConflictClick}
              activeConflicts={pendingEvent && conflicts ? { [pendingEvent.id]: conflicts } : undefined}
              excludeFromConflictDetection={recentlyCreatedEvents}
              onTimeSlotClick={handleTimeSlotClick}
              onTimeSlotDoubleClick={handleTimeSlotDoubleClick}
              placeholderEvent={placeholderEvent}
              onPlaceholderChange={handlePlaceholderChange}
            />
          )
        case 'week':
          return (
            <WeekView
              onTaskClick={(task) => {
                // Handle both UnifiedEvent format (startDateTime) and legacy task format (startTime)
                if ('startDateTime' in task) {
                  // Already a UnifiedEvent, use directly
                  handleEventView(task as UnifiedEvent)
                } else if ('startTime' in task && 'endTime' in task) {
                  // Legacy task format, convert to UnifiedEvent
                  const startDate = task.startTime instanceof Date ? task.startTime : new Date(task.startTime)
                  const endDate = task.endTime instanceof Date ? task.endTime : new Date(task.endTime)

                  const event: UnifiedEvent = {
                    id: task.id,
                    type: 'task' as const,
                    title: task.title,
                    description: task.description,
                    startDateTime: startDate.toISOString(),
                    endDateTime: endDate.toISOString(),
                    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
                    priority: task.priority,
                    clientId: task.clientId,
                    location: task.location,
                    notes: task.notes,
                    status: task.status,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                  handleEventView(event)
                }
              }}
              onTimeSlotClick={handleTimeSlotClick}
              onTimeSlotDoubleClick={handleTimeSlotDoubleClick}
              enableEventCreation={true}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskStatusChange={handleTaskStatusChange}
              onDayNavigation={handleDayClick}
              refreshTrigger={refreshTrigger}
              onRefreshNeeded={() => setRefreshTrigger(prev => prev + 1)}
              useExternalEventDetailsHandler={true}
              placeholderEvent={placeholderEvent}
              onPlaceholderChange={handlePlaceholderChange}
            />
          )
        case 'month':
          return (
            <ScheduleCalendar
              selectedDate={state.selectedDate}
              enableEditing={true}
              onDayClick={(date: Date) => setSelectedDate(date)} // Just select date, don't navigate
              onDayDoubleClick={(date: Date, hour?: number) => handleTimeSlotDoubleClick(date, hour ?? 9, 0)}
              onEventEdit={handleEventEdit}
              onEventView={handleEventView}
              onEventDelete={handleTaskDelete}
              onEventStatusChange={handleTaskStatusChange}
              refreshTrigger={refreshTrigger}
              placeholderEvent={placeholderEvent}
              onPlaceholderChange={handlePlaceholderChange}
            />
          )
        default:
          return (
            <UnifiedDailyPlanner
              date={state.selectedDate}
              onEventView={handleEventView}
              refreshTrigger={refreshTrigger}
              onRefreshTrigger={() => setRefreshTrigger(prev => prev + 1)}
              onTaskStatusChange={handleTaskStatusChange}
              onConflictClick={handleExistingEventConflictClick}
              activeConflicts={pendingEvent && conflicts ? { [pendingEvent.id]: conflicts } : undefined}
              excludeFromConflictDetection={recentlyCreatedEvents}
              onTimeSlotClick={handleTimeSlotClick}
              placeholderEvent={placeholderEvent}
              onPlaceholderChange={handlePlaceholderChange}
            />
          )
      }
    })()

    // Wrap all views with CalendarLayout for consistent sidebar
    return (
      <CalendarLayout
        selectedDate={state.selectedDate}
        currentView={state.currentView}
        events={allEvents}
        onDateSelect={setSelectedDate}
        onViewChange={setCurrentView}
        onEventCreate={handleEventCreate}
        onRefreshTrigger={() => setRefreshTrigger(prev => prev + 1)}
        isEventCreationMode={isEventCreationMode}
        initialEventTime={eventCreationTime || undefined}
        initialEventDate={eventCreationDate || undefined}
        initialEventDuration={placeholderEvent?.duration}
        initialEventEndDate={placeholderEvent?.endDate}
        initialEventEndHour={placeholderEvent?.endHour}
        initialEventEndMinutes={placeholderEvent?.endMinutes}
        onExitEventCreation={handleExitEventCreation}
        selectedEvent={sidebarSelectedEvent}
        onEventEdit={handleSidebarEventEdit}
        onEventDelete={handleSidebarEventDelete}
        onExitEventDetails={handleExitEventDetails}
        onFormChange={handleFormChange}
        conflictCount={globalConflictCount}
        onShowConflicts={handleShowConflicts}
      >
        {viewContent}
      </CalendarLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="neo-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground uppercase tracking-wide font-primary mb-2">
                TIME MANAGER
              </h1>
              <p className="text-muted-foreground font-primary">
                ORGANIZE YOUR SCHEDULE AND MANAGE YOUR TIME EFFECTIVELY
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="neo-card">
          <TimeManagerNavigation showTitle={false} />
        </div>

        {/* Main Content */}
        <div className="neo-card">
          {renderCurrentView()}
        </div>

        {/* Global Event Creation Modal */}
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
            setInitialClientId(undefined)
            setInitialClientName(undefined)
          }}
          onSave={handleEventCreate}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          editingEvent={editingEvent || undefined}
          initialClientId={initialClientId}
          initialClientName={initialClientName}
        />

        {/* Event Details Modal */}
        <EventDetailsModal
          event={selectedEvent}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedEvent(null)
          }}
          onEdit={handleEditFromDetails}
          onDelete={handleEventDelete}
        />

        {/* Conflict Resolution Modal */}
        {pendingEvent && conflicts && (
          <ConflictResolutionModal
            isOpen={showConflictModal}
            proposedEvent={pendingEvent}
            conflicts={conflicts}
            onAcceptConflict={handleAcceptConflict}
            onDeleteEvent={handleDeleteEvent}
            onRescheduleEvent={handleRescheduleEvent}
            onAcceptSave={handleConflictAcceptSave}
            onCancel={handleConflictCancel}
            onClose={handleConflictCancel}
          />
        )}
      </div>
    </CRMLayout>
  )
}

const TimeManagerPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="p-6">
          <div className="neo-card flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading Time Manager...</p>
            </div>
          </div>
        </div>
      </CRMLayout>
    }>
      <ViewManagerProvider>
        <TimeManagerContent />
      </ViewManagerProvider>
    </Suspense>
  )
}

export default TimeManagerPage
