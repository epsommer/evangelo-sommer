"use client"

import React, { useState, useEffect, useRef } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { Clock, Plus, MoreVertical, Edit, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { DailyTask } from '@/types/daily-planner'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import DropdownMenu from '@/components/ui/DropdownMenu'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { ClientNotificationService } from '@/lib/client-notification-service'
import { DragDropProvider } from '@/components/DragDropContext'
import DragAndDropEvent from '@/components/DragAndDropEvent'
import CalendarEvent from '@/components/calendar/CalendarEvent'
import DropZone from '@/components/DropZone'
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal'
import DragVisualFeedback from '@/components/DragVisualFeedback'
import EventDetailsModal from '@/components/EventDetailsModal'
import PlaceholderEvent from '@/components/calendar/PlaceholderEvent'
import { calculateDragDropTimes } from '@/utils/calendar'
import { useEventCreationDrag, DragState } from '@/hooks/useEventCreationDrag'

interface ScheduledService {
  id: string
  title: string
  service: string
  clientName: string
  scheduledDate: string
  notes?: string
  priority: string
  status: string
  duration: number
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: { date: string; hour: number }
  toSlot: { date: string; hour: number }
  reason?: string
}

interface PlaceholderEventData {
  date: string // 'yyyy-MM-dd' format
  hour: number // 0-23
  minutes?: number // 0-59, for precise positioning
  duration: number // in minutes
  title?: string // optional, from form input
  endDate?: string // optional, for multi-day events
  endHour?: number // optional, for multi-day events
  endMinutes?: number // optional, for 15-min precision on multi-day events
}

interface WeekViewProps {
  onTaskClick?: (task: DailyTask | ScheduledService) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
  onTimeSlotDoubleClick?: (date: Date, hour: number) => void
  enableEventCreation?: boolean
  onTaskEdit?: (task: DailyTask | ScheduledService) => void
  onTaskDelete?: (taskId: string) => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onDayNavigation?: (date: Date) => void
  refreshTrigger?: number
  useExternalEventDetailsHandler?: boolean
  placeholderEvent?: PlaceholderEventData | null
  onPlaceholderChange?: (placeholder: PlaceholderEventData | null) => void
}

const WeekView: React.FC<WeekViewProps> = ({
  onTaskClick,
  onTimeSlotClick,
  onTimeSlotDoubleClick,
  enableEventCreation = true,
  onTaskEdit,
  onTaskDelete,
  onTaskStatusChange,
  onDayNavigation,
  refreshTrigger,
  useExternalEventDetailsHandler = false,
  placeholderEvent = null,
  onPlaceholderChange
}) => {
  const { state } = useViewManager()
  const { selectedDate, workingHours, displaySettings } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleData, setRescheduleData] = useState<RescheduleData | null>(null)
  const [eventDetailsModal, setEventDetailsModal] = useState<{
    isOpen: boolean
    event: UnifiedEvent | null
  }>({ isOpen: false, event: null })
  const timeSlotRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const eventsGridRef = useRef<HTMLDivElement>(null)

  // Use unified events hook
  const {
    events: unifiedEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate
  } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  // Generate week days starting from Sunday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Event creation drag hook
  const {
    dragState: creationDragState,
    isDragging: isCreationDragging,
    handleMouseDown: handleCreationMouseDown,
    resetDrag: resetCreationDrag
  } = useEventCreationDrag(eventsGridRef, weekStart, {
    onDragMove: (state: DragState) => {
      // Update placeholder event in real-time during drag
      if (onPlaceholderChange) {
        onPlaceholderChange({
          date: state.startDate,
          hour: state.startHour,
          minutes: state.startMinutes,
          duration: state.duration,
          title: placeholderEvent?.title,
          endDate: state.currentDate,
          endHour: state.currentHour,
          endMinutes: state.currentMinutes
        })
      }
    },
    onDragEnd: (state: DragState) => {
      console.log('🖱️ [WeekView] Drag ended, final state:', state)
      // Final update to placeholder with drag result
      if (onPlaceholderChange) {
        onPlaceholderChange({
          date: state.startDate,
          hour: state.startHour,
          minutes: state.startMinutes,
          duration: state.duration,
          title: placeholderEvent?.title,
          endDate: state.currentDate,
          endHour: state.currentHour,
          endMinutes: state.currentMinutes
        })
      }
    }
  })

  // Debug: log when events change
  useEffect(() => {
    console.log('🔄 [WeekView] unifiedEvents changed, count:', unifiedEvents.length)
    console.log('🔄 [WeekView] Events:', unifiedEvents.map(e => ({ id: e.id, title: e.title, start: e.startDateTime, end: e.endDateTime, duration: e.duration })))
  }, [unifiedEvents])

  // Load data from localStorage
  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      setScheduledServices(services)

      // Load mock tasks (you might want to replace this with actual data loading)
      const mockTasks = JSON.parse(localStorage.getItem('daily-tasks') || '[]')
      setTasks(mockTasks)
    } catch (error) {
      console.error('Error loading week view data:', error)
    }
  }, [refreshTrigger])

  // Auto-scroll to current time on mount and when selectedDate changes
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      
      // Check if any day in the current week is today
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      const isTodayInWeek = weekDays.some(day => isToday(day))
      
      if (isTodayInWeek && timeSlotRefs.current[currentHour]) {
        setTimeout(() => {
          timeSlotRefs.current[currentHour]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 100) // Small delay to ensure rendering is complete
      }
    }

    scrollToCurrentTime()
  }, [selectedDate])
  
  // Event creation handlers
  const handleTimeSlotClick = (date: Date, hour: number) => {
    console.group('🕐 WeekView: Time Slot Clicked')
    console.log('Time slot clicked:', {
      date: date.toISOString(),
      hour: hour,
      enableEventCreation: enableEventCreation
    })

    if (onTimeSlotClick) {
      // Parent is managing event creation (e.g., via sidebar)
      console.log('Calling onTimeSlotClick callback')
      onTimeSlotClick(date, hour)
    } else if (enableEventCreation) {
      // Fallback to local modal handling
      console.log('Opening event creation modal...')
      setModalInitialDate(date)
      setModalInitialTime(`${hour.toString().padStart(2, '0')}:00`)
      setEditingEvent(null)
      setShowEventModal(true)
    } else {
      console.log('Event creation is disabled')
    }

    console.groupEnd()
  }

  const handleTimeSlotDoubleClick = (date: Date, hour: number) => {
    console.group('🕐 WeekView: Time Slot Double-Clicked')
    console.log('Time slot double-clicked:', {
      date: date.toISOString(),
      hour: hour,
      enableEventCreation: enableEventCreation
    })

    if (onTimeSlotDoubleClick) {
      // Parent is managing double-click event creation (via sidebar)
      console.log('Calling onTimeSlotDoubleClick callback')
      onTimeSlotDoubleClick(date, hour)
    } else {
      console.log('No double-click handler provided')
    }

    console.groupEnd()
  }
  
  const handleSaveEvent = async (eventData: UnifiedEvent) => {
    try {
      // Check if this is an edit (event exists in our list) or a new event
      const existingEvent = unifiedEvents.find(e => e.id === eventData.id)

      if (existingEvent) {
        // Update existing event
        console.log('📝 [WeekView] Updating existing event:', eventData.title)
        await updateEvent(eventData.id, {
          title: eventData.title,
          description: eventData.description,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          duration: eventData.duration,
          priority: eventData.priority,
          clientId: eventData.clientId,
          clientName: eventData.clientName,
          location: eventData.location,
          notes: eventData.notes,
          isAllDay: eventData.isAllDay,
          isMultiDay: eventData.isMultiDay,
          isRecurring: eventData.isRecurring,
          recurrence: eventData.recurrence,
          notifications: eventData.notifications
        })
        console.log('✅ [WeekView] Event updated:', eventData.title)
      } else {
        // Create new event
        console.log('➕ [WeekView] Creating new event:', eventData.title)
        await createEvent(eventData)
        console.log('✅ [WeekView] Event created:', eventData.title)
      }

      setShowEventModal(false)
      setEditingEvent(null)
    } catch (error) {
      console.error('❌ [WeekView] Error saving event:', error)
    }
  }
  
  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  // Handle showing event details modal or calling external handler
  const handleShowEventDetails = (event: UnifiedEvent) => {
    console.group('🔍 WeekView: Show Event Details')
    console.log('Event clicked:', {
      id: event.id,
      title: event.title,
      type: event.type,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      clientName: event.clientName,
      location: event.location
    })

    if (useExternalEventDetailsHandler && onTaskClick) {
      // Use external handler (e.g., show in sidebar)
      console.log('Using external event details handler (sidebar)')
      onTaskClick(event as any)
    } else {
      // Use internal modal
      console.log('Opening event details modal...')
      setEventDetailsModal({ isOpen: true, event })

      // Also call onTaskClick if provided for backward compatibility
      if (onTaskClick) {
        console.log('Calling original onTaskClick callback for backward compatibility')
        onTaskClick(event as any)
      }
    }

    console.groupEnd()
  }

  // Handle editing from event details modal
  const handleEditFromDetails = (event: UnifiedEvent) => {
    console.group('✏️ WeekView: Edit Event from Details')
    console.log('Editing event:', {
      id: event.id,
      title: event.title,
      type: event.type
    })
    console.log('Closing details modal and opening edit modal...')
    
    setEventDetailsModal({ isOpen: false, event: null })
    setEditingEvent(event)
    setShowEventModal(true)
    
    console.log('Edit modal should now be open with event data')
    console.groupEnd()
  }

  // Handle deleting from event details modal
  const handleDeleteFromDetails = async (eventId: string) => {
    console.group('🗑️ WeekView: Delete Event from Details')
    console.log('Deleting event ID:', eventId)
    console.log('Closing details modal...')
    
    setEventDetailsModal({ isOpen: false, event: null })
    
    try {
      console.log('Calling deleteEvent...')
      await deleteEvent(eventId)
      console.log('✅ Event deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting event:', error)
    }
    
    console.groupEnd()
  }

  // Drag and drop handlers
  const handleEventDrop = async (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => {
    // Check if event has participants - only show confirmation if it does
    const hasParticipants = event.participants && event.participants.length > 0

    if (hasParticipants) {
      // Show confirmation modal for events with participants
      const rescheduleInfo: RescheduleData = {
        event,
        fromSlot,
        toSlot
      }
      setRescheduleData(rescheduleInfo)
      setShowRescheduleModal(true)
    } else {
      // Directly reschedule events without participants
      const rescheduleInfo: RescheduleData = {
        event,
        fromSlot,
        toSlot
      }
      await handleRescheduleConfirm(rescheduleInfo, false)
    }
  }

  const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string, isMultiDay?: boolean) => {
    console.log('🎯 [WeekView] handleEventResize CALLED')
    console.log('🎯 [WeekView] Event:', event.title, event.id)
    console.log('🎯 [WeekView] New times:', { newStartTime, newEndTime, isMultiDay })

    const updates: Record<string, any> = {
      startDateTime: newStartTime,
      endDateTime: newEndTime,
      duration: Math.round((new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60))
    }

    // Include isMultiDay if provided
    if (isMultiDay !== undefined) {
      updates.isMultiDay = isMultiDay
    }

    console.log('🎯 [WeekView] Calling updateEvent with:', updates)

    try {
      const result = await updateEvent(event.id, updates)
      console.log('🎯 [WeekView] updateEvent result:', result)
      console.log('✅ [WeekView] Event resized successfully:', event.title)
    } catch (error) {
      console.error('❌ [WeekView] Error resizing event:', error)
    }
  }

  const handleRescheduleConfirm = async (data: RescheduleData, notifyParticipants: boolean) => {
    try {
      console.group('🎯 [WeekView] handleRescheduleConfirm')
      console.log('Reschedule data:', {
        eventTitle: data.event.title,
        eventId: data.event.id,
        fromSlot: data.fromSlot,
        toSlot: data.toSlot,
        originalStartDateTime: data.event.startDateTime,
        originalDuration: data.event.duration
      })

      // Use the new drag calculation utility for accurate time mapping
      const { newStartDateTime, newEndDateTime, duration } = calculateDragDropTimes(
        data.event,
        data.fromSlot,
        data.toSlot
      )

      const newStart = newStartDateTime
      const newEnd = newEndDateTime
      
      const updates = {
        startDateTime: newStart,
        endDateTime: newEnd,
        notes: data.reason ? 
          `${data.event.notes || ''}

Rescheduled: ${data.reason}`.trim() : 
          data.event.notes
      }
      
      console.log('Applying updates to event:', updates)
      await updateEvent(data.event.id, updates)

      console.log('✅ Event rescheduled successfully:', {
        eventTitle: data.event.title,
        newStartDateTime: newStart,
        newEndDateTime: newEnd
      })
      console.groupEnd()
      
      // Send notifications to participants if requested
      if (notifyParticipants) {
        try {
          const participants = ClientNotificationService.extractParticipants(data.event)
          
          if (participants.length > 0) {
            // Create the new event object with updated times
            const newEvent = {
              ...data.event,
              startDateTime: newStart,
              endDateTime: newEnd,
              updatedAt: new Date().toISOString()
            }
            
            // Send reschedule notifications via API
            const result = await ClientNotificationService.sendRescheduleNotification({
              originalEvent: data.event,
              newEvent,
              participants,
              reason: data.reason
            })
            
            if (result.success && result.results) {
              const { successful, failed } = result.results
              if (successful > 0) {
                console.log(`📧 Reschedule notifications sent to ${successful} participant(s)`)
              }
              if (failed > 0) {
                console.warn(`⚠️ Failed to send reschedule notifications to ${failed} participant(s)`)
                if (result.results.errors.length > 0) {
                  console.warn('Notification errors:', result.results.errors)
                }
              }
            } else {
              console.error('❌ Failed to send reschedule notifications:', result.error)
            }
          } else {
            console.log('📧 No participants found to notify about reschedule')
          }
        } catch (error) {
          console.error('❌ Error sending reschedule notifications:', error)
        }
      }
      
    } catch (error) {
      console.error('❌ Error rescheduling event:', error)
      throw error
    }
  }

  // Fixed pixels per hour for the week view grid
  const PIXELS_PER_HOUR = 80

  // Generate time slots for all 24 hours
  const timeSlots = Array.from({ length: 24 }, (_, i) => i)

  // Get all events for a specific day (for the events overlay)
  // Only returns SINGLE-DAY events that start on this day
  const getEventsForDay = (date: Date) => {
    const servicesForDay = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      return isSameDay(serviceDate, date)
    })

    const tasksForDay = tasks.filter(task => {
      if (!task.startTime) return false
      const taskDate = new Date(task.startTime)
      return isSameDay(taskDate, date)
    })

    // Only get SINGLE-DAY unified events that start on this day
    const unifiedEventsForDay = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      const startsOnThisDay = isSameDay(eventDate, date)

      // Check if it's a multi-day event
      const isMultiDayEvent = event.isMultiDay || (event.endDateTime && !isSameDay(new Date(event.startDateTime), new Date(event.endDateTime)))

      // Only include single-day events here
      return startsOnThisDay && !isMultiDayEvent
    })

    return [...servicesForDay, ...tasksForDay, ...unifiedEventsForDay]
  }

  // Get multi-day events that should be displayed in this week
  const getMultiDayEventsForWeek = () => {
    return unifiedEvents.filter(event => {
      // Check if it's a multi-day event
      const isMultiDayEvent = event.isMultiDay || (event.endDateTime && !isSameDay(new Date(event.startDateTime), new Date(event.endDateTime)))
      if (!isMultiDayEvent) return false

      // Check if any part of this event falls within the current week
      const eventStart = new Date(event.startDateTime)
      const eventEnd = event.endDateTime ? new Date(event.endDateTime) : eventStart
      const weekEnd = addDays(weekStart, 6)

      // Event overlaps with week if: eventStart <= weekEnd AND eventEnd >= weekStart
      return eventStart <= weekEnd && eventEnd >= weekStart
    })
  }

  // Calculate column span for a multi-day event
  const getMultiDayEventStyle = (event: UnifiedEvent): React.CSSProperties => {
    const eventStart = new Date(event.startDateTime)
    const eventEnd = event.endDateTime ? new Date(event.endDateTime) : eventStart

    // Calculate which day columns this event spans
    let startDayIndex = 0
    let endDayIndex = 6

    // Find start day index within the week (0-6)
    for (let i = 0; i < 7; i++) {
      if (isSameDay(weekDays[i], eventStart)) {
        startDayIndex = i
        break
      } else if (weekDays[i] > eventStart) {
        // Event started before this week
        startDayIndex = 0
        break
      }
    }

    // Find end day index within the week (0-6)
    for (let i = 6; i >= 0; i--) {
      if (isSameDay(weekDays[i], eventEnd)) {
        endDayIndex = i
        break
      } else if (weekDays[i] < eventEnd) {
        // Event ends after this week
        endDayIndex = 6
        break
      }
    }

    // Clamp start and end to week bounds
    if (eventStart < weekDays[0]) startDayIndex = 0
    if (eventEnd > weekDays[6]) endDayIndex = 6

    // Calculate column positions (add 2 because column 1 is the time column, grid is 1-indexed)
    const gridColumnStart = startDayIndex + 2
    const gridColumnEnd = endDayIndex + 3 // +3 because we want to span TO this column (not before it)

    // Calculate vertical position based on start time
    const startHour = eventStart.getHours()
    const startMinutes = eventStart.getMinutes()
    const duration = event.duration || 60
    const top = (startHour * PIXELS_PER_HOUR) + ((startMinutes / 60) * PIXELS_PER_HOUR)
    const height = (duration / 60) * PIXELS_PER_HOUR

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 25)}px`,
      gridColumnStart,
      gridColumnEnd,
      left: '2px',
      right: '2px',
      zIndex: 20 // Higher z-index for multi-day events
    }
  }

  // Calculate event position and height based on start time and duration
  const getEventStyle = (event: UnifiedEvent): React.CSSProperties => {
    const startDate = new Date(event.startDateTime)
    const startHour = startDate.getHours()
    const startMinutes = startDate.getMinutes()
    const duration = event.duration || 60

    // Calculate top position: hours * pixelsPerHour + minutes offset
    const top = (startHour * PIXELS_PER_HOUR) + ((startMinutes / 60) * PIXELS_PER_HOUR)
    // Calculate height based on duration
    const height = (duration / 60) * PIXELS_PER_HOUR

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 25)}px`, // Minimum 25px for visibility
      left: '2px',
      right: '2px',
      zIndex: 10
    }
  }

  // Get events for a specific day and hour (for DropZone occupancy)
  const getEventsForSlot = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const servicesForSlot = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      const serviceHour = serviceDate.getHours()
      return isSameDay(serviceDate, date) && serviceHour === hour
    })

    const tasksForSlot = tasks.filter(task => {
      if (!task.startTime) return false
      const taskDate = new Date(task.startTime)
      const taskHour = taskDate.getHours()
      return isSameDay(taskDate, date) && taskHour === hour
    })

    // Include unified events
    const unifiedEventsForSlot = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      const eventHour = eventDate.getHours()
      return isSameDay(eventDate, date) && eventHour === hour
    })

    return [...servicesForSlot, ...tasksForSlot, ...unifiedEventsForSlot]
  }

  const formatTimeSlot = (hour: number) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${period}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-accent/30 text-foreground border-accent'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600'
      case 'in_progress':
      case 'in-progress':
        return 'bg-accent'
      case 'cancelled':
        return 'bg-red-600'
      default:
        return 'bg-muted'
    }
  }

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
    <div ref={containerRef} className="space-y-6">
      {/* Week Header */}
      <div className="neo-card">
        <div className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-0 border-b border-border">
            {/* Time column header */}
            <div className="p-2 md:p-4 bg-card border-r border-border">
              <span className="text-xs md:text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                TIME
              </span>
            </div>

            {/* Day headers */}
            {weekDays.map(day => {
              const isCurrentDay = isToday(day)
              const dayOfMonth = format(day, 'd')
              const dayName = format(day, 'EEE')

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 md:p-4 border-r border-border text-center ${
                    isCurrentDay ? 'bg-accent text-accent-foreground' : 'bg-card'
                  }`}
                >
                  <div className="space-y-1">
                    <div className={`text-xs font-bold uppercase tracking-wide font-primary ${
                      isCurrentDay ? 'text-accent-foreground' : 'text-foreground'
                    }`}>
                      {dayName}
                    </div>
                    <div className={`text-sm md:text-lg font-bold font-primary ${
                      isCurrentDay
                        ? 'bg-accent-foreground text-accent rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mx-auto'
                        : 'text-foreground'
                    }`}>
                      {dayOfMonth}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Grid Container - relative positioning for events overlay */}
          <div className="relative">
            {/* Time slots grid - fixed height rows */}
            {timeSlots.map(hour => {
              const now = new Date()
              const isCurrentHour = now.getHours() === hour

              return (
                <div
                  key={hour}
                  ref={(el) => { timeSlotRefs.current[hour] = el; }}
                  className={`grid grid-cols-8 gap-0 border-b border-border ${isCurrentHour ? 'bg-accent/10 border-l-4 border-accent' : ''}`}
                  style={{ height: `${PIXELS_PER_HOUR}px` }}
                >
                  {/* Time Label */}
                  <div className={`p-2 md:p-3 border-r border-border flex items-start transition-colors ${isCurrentHour ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-card/80'}`}>
                    <div className="text-center w-full">
                      <div className={`text-xs md:text-sm font-bold font-primary ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                        {hour.toString().padStart(2, '0')}:00
                        {isCurrentHour && <span className="ml-1 text-xs">●</span>}
                      </div>
                      <div className={`text-xs font-primary hidden md:block ${isCurrentHour ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                        {formatTimeSlot(hour).split(' ')[1]}
                      </div>
                    </div>
                  </div>

                  {/* Day Columns - DropZones only (no events rendered inside) */}
                  {weekDays.map((day, dayIndex) => {
                    const events = getEventsForSlot(day, hour)
                    const isCurrentDay = isToday(day)

                    return (
                      <DropZone
                        key={`${day.toISOString()}-${hour}`}
                        date={format(day, 'yyyy-MM-dd')}
                        hour={hour}
                        dayIndex={dayIndex}
                        isOccupied={events.length > 0}
                        events={events.filter(event => unifiedEvents.find(e => e.id === event.id)) as UnifiedEvent[]}
                        onTimeSlotClick={handleTimeSlotClick}
                        onTimeSlotDoubleClick={handleTimeSlotDoubleClick}
                        onMouseDownOnSlot={handleCreationMouseDown}
                        className={`border-r border-border transition-colors ${
                          isCurrentDay ? 'bg-accent/20 border-l-2 border-accent' : 'bg-background hover:bg-card'
                        }`}
                        compact={true}
                      />
                    )
                  })}
                </div>
              )
            })}

            {/* Events Overlay Layer - absolutely positioned over the grid */}
            <div
              ref={eventsGridRef}
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
            >
              <div className="grid grid-cols-8 gap-0 h-full">
                {/* Spacer for time column */}
                <div className="border-r border-transparent" />

                {/* Single-day events for each day column */}
                {weekDays.map(day => {
                  const dayEvents = getEventsForDay(day)
                  const dayUnifiedEvents = dayEvents.filter(event => unifiedEvents.find(e => e.id === event.id)) as UnifiedEvent[]

                  return (
                    <div
                      key={`events-${day.toISOString()}`}
                      className="relative border-r border-transparent"
                    >
                      {dayUnifiedEvents.map(event => (
                        <div
                          key={event.id}
                          style={getEventStyle(event)}
                          className="pointer-events-auto"
                        >
                          <CalendarEvent
                            event={event}
                            viewMode="week"
                            currentDate={format(day, 'yyyy-MM-dd')}
                            currentHour={new Date(event.startDateTime).getHours()}
                            pixelsPerHour={PIXELS_PER_HOUR}
                            onClick={(e) => handleShowEventDetails(e)}
                            onResizeEnd={handleEventResize}
                            showResizeHandles={true}
                            isCompact={false}
                            gridContainerRef={eventsGridRef}
                            weekStartDate={weekStart}
                            className="text-xs rounded border hover:shadow-sm transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Multi-day events overlay - spans across multiple columns */}
              <div
                className="absolute top-0 left-0 right-0 grid grid-cols-8 gap-0"
                style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
              >
                {getMultiDayEventsForWeek().map(event => (
                  <div
                    key={`multiday-${event.id}`}
                    style={getMultiDayEventStyle(event)}
                    className="pointer-events-auto"
                  >
                    <CalendarEvent
                      event={event}
                      viewMode="week"
                      currentDate={format(new Date(event.startDateTime), 'yyyy-MM-dd')}
                      currentHour={new Date(event.startDateTime).getHours()}
                      pixelsPerHour={PIXELS_PER_HOUR}
                      onClick={(e) => handleShowEventDetails(e)}
                      onResizeEnd={handleEventResize}
                      showResizeHandles={true}
                      isCompact={false}
                      gridContainerRef={eventsGridRef}
                      weekStartDate={weekStart}
                      className="text-xs rounded border hover:shadow-sm transition-all h-full"
                    />
                  </div>
                ))}
              </div>

              {/* Placeholder event overlay - shows ghost event during creation */}
              {placeholderEvent && (() => {
                const isMultiDay = placeholderEvent.endDate !== undefined && placeholderEvent.endDate !== placeholderEvent.date

                console.log('🎯 [WeekView] Placeholder render:', {
                  date: placeholderEvent.date,
                  endDate: placeholderEvent.endDate,
                  isMultiDay,
                  duration: placeholderEvent.duration
                })

                if (isMultiDay) {
                  // Multi-day placeholder: span across columns like multi-day events
                  const startDate = new Date(placeholderEvent.date + 'T00:00:00')
                  const endDate = new Date(placeholderEvent.endDate! + 'T00:00:00')

                  // Find start and end day indices in the week
                  let startDayIndex = -1
                  let endDayIndex = -1

                  for (let i = 0; i < 7; i++) {
                    if (isSameDay(weekDays[i], startDate)) {
                      startDayIndex = i
                    }
                    if (isSameDay(weekDays[i], endDate)) {
                      endDayIndex = i
                    }
                  }

                  console.log('🎯 [WeekView] Multi-day placeholder indices:', {
                    startDayIndex,
                    endDayIndex,
                    weekDays: weekDays.map(d => format(d, 'yyyy-MM-dd')),
                    startDateStr: placeholderEvent.date,
                    endDateStr: placeholderEvent.endDate
                  })

                  // Clamp to week bounds if dates are outside
                  if (startDayIndex === -1) startDayIndex = startDate < weekDays[0] ? 0 : 6
                  if (endDayIndex === -1) endDayIndex = endDate > weekDays[6] ? 6 : 0

                  // Ensure start <= end
                  if (startDayIndex > endDayIndex) {
                    [startDayIndex, endDayIndex] = [endDayIndex, startDayIndex]
                  }

                  // Calculate pixel positions based on column indices
                  // Grid has 8 columns: 1 time column (12.5%) + 7 day columns (12.5% each)
                  const timeColumnPercent = 12.5 // 1/8 of 100%
                  const dayColumnPercent = 12.5 // Each day column is 1/8 of 100%

                  // Left position: skip time column + start day columns
                  const leftPercent = timeColumnPercent + (startDayIndex * dayColumnPercent)
                  // Width: number of day columns to span
                  const numColumns = endDayIndex - startDayIndex + 1
                  const widthPercent = numColumns * dayColumnPercent

                  // Calculate vertical position based on start time (with 15-min precision)
                  const startMins = (placeholderEvent.minutes || 0)
                  const top = (placeholderEvent.hour * PIXELS_PER_HOUR) + ((startMins / 60) * PIXELS_PER_HOUR)

                  // For multi-day events, calculate height based on endHour + endMinutes (mouse Y position)
                  // This ensures the placeholder tracks the cursor position with 15-min precision
                  const endHourPos = placeholderEvent.endHour !== undefined ? placeholderEvent.endHour : 24
                  const endMinsPos = placeholderEvent.endMinutes !== undefined ? placeholderEvent.endMinutes : 0
                  const endBottom = (endHourPos * PIXELS_PER_HOUR) + ((endMinsPos / 60) * PIXELS_PER_HOUR)

                  // Height calculation:
                  // If cursor is below start position, height = cursor position - start position
                  // If cursor is above start (on a later day), extend to end of day (simpler UX)
                  let height: number
                  if (endBottom >= top) {
                    // Cursor is below or at start: height is the vertical distance
                    height = endBottom - top
                  } else {
                    // Cursor is above start (dragged to earlier time on later day): extend to midnight
                    height = (24 * PIXELS_PER_HOUR) - top
                  }

                  // Ensure minimum height for visibility
                  height = Math.max(height, 20)

                  console.log('🎯 [WeekView] Multi-day placeholder positioning:', {
                    leftPercent,
                    widthPercent,
                    top,
                    height,
                    endTime: `${endHourPos}:${endMinsPos.toString().padStart(2, '0')}`,
                    startDayIndex,
                    endDayIndex
                  })

                  return (
                    <div
                      className="absolute top-0 left-0 right-0 pointer-events-none"
                      style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: `${top}px`,
                          height: `${Math.max(height, 20)}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          zIndex: 25
                        }}
                      >
                        <PlaceholderEvent
                          date={placeholderEvent.date}
                          hour={placeholderEvent.hour}
                          minutes={placeholderEvent.minutes}
                          duration={placeholderEvent.duration}
                          title={placeholderEvent.title}
                          pixelsPerHour={PIXELS_PER_HOUR}
                          endDate={placeholderEvent.endDate}
                          endHour={placeholderEvent.endHour}
                          isMultiDay={true}
                        />
                      </div>
                    </div>
                  )
                } else {
                  // Single-day placeholder: render in specific day column
                  return (
                    <div
                      className="absolute top-0 left-0 right-0 grid grid-cols-8 gap-0"
                      style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
                    >
                      {/* Spacer for time column */}
                      <div className="border-r border-transparent" />

                      {/* Render placeholder in the correct day column */}
                      {weekDays.map(day => {
                        const dayDate = format(day, 'yyyy-MM-dd')
                        const isPlaceholderDay = dayDate === placeholderEvent.date

                        return (
                          <div
                            key={`placeholder-${dayDate}`}
                            className="relative border-r border-transparent"
                          >
                            {isPlaceholderDay && (
                              <PlaceholderEvent
                                date={placeholderEvent.date}
                                hour={placeholderEvent.hour}
                                minutes={placeholderEvent.minutes}
                                duration={placeholderEvent.duration}
                                title={placeholderEvent.title}
                                pixelsPerHour={PIXELS_PER_HOUR}
                                endDate={placeholderEvent.endDate}
                                endHour={placeholderEvent.endHour}
                                isMultiDay={false}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Visual Feedback */}
      <DragVisualFeedback containerRef={containerRef as React.RefObject<HTMLElement>} />
      
      {/* Event Creation Modal */}
      {enableEventCreation && (
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
          onSave={handleSaveEvent}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          editingEvent={editingEvent || undefined}
        />
      )}
      
      {/* Reschedule Confirmation Modal */}
      <RescheduleConfirmationModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false)
          setRescheduleData(null)
        }}
        onConfirm={handleRescheduleConfirm}
        rescheduleData={rescheduleData}
      />
      
      {/* Event Details Modal - Only show if not using external handler */}
      {!useExternalEventDetailsHandler && (
        <EventDetailsModal
          event={eventDetailsModal.event}
          isOpen={eventDetailsModal.isOpen}
          onClose={() => setEventDetailsModal({ isOpen: false, event: null })}
          onEdit={handleEditFromDetails}
          onDelete={handleDeleteFromDetails}
        />
      )}
    </div>
    </DragDropProvider>
  )
}

export default WeekView