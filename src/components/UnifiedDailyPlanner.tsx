"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import {
  Plus, Clock, MapPin, User, Target, Calendar, Search,
  ChevronDown, ChevronUp, GripVertical, X,
  Timer, CheckCircle2, PlusCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import MultiEventCreationModal from '@/components/MultiEventCreationModal'
import { createLocalDate } from '@/lib/timezone-utils'
import { DragDropProvider } from '@/components/DragDropContext'
import DropZone from '@/components/DropZone'
import CalendarEvent from '@/components/calendar/CalendarEvent'
import PlaceholderEvent from '@/components/calendar/PlaceholderEvent'
import { eventCategorizer } from '@/lib/event-categorizer'
import { calculateDragDropTimes } from '@/utils/calendar'
import { useEventCreationDrag, DragState } from '@/hooks/useEventCreationDrag'

// Constants
const DAY_VIEW_PIXELS_PER_HOUR = 50

// Types
interface MissionObjective {
  id: string
  text: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  completed: boolean
  timeEstimate?: number // minutes
  dueDate?: string
  dueTime?: string
  category?: string
  createdAt: string
}

interface PlaceholderEventData {
  date: string // 'yyyy-MM-dd' format
  hour: number // 0-23
  minutes?: number // 0-59, for precise positioning
  duration: number // in minutes
  title?: string // optional, from form input
  endDate?: string // optional, for multi-day events
  endHour?: number // optional, for multi-day events
}

interface UnifiedDailyPlannerProps {
  date?: Date
  onEventView?: (event: UnifiedEvent) => void
  refreshTrigger?: number
  onRefreshTrigger?: () => void
  onTaskStatusChange?: (taskId: string, status: string) => void
  onConflictClick?: (event: UnifiedEvent, conflicts: any) => void
  activeConflicts?: Record<string, any>
  excludeFromConflictDetection?: Set<string>
  onTimeSlotClick?: (date: Date, hour?: number) => void
  onTimeSlotDoubleClick?: (date: Date, hour: number, minutes?: number) => void
  placeholderEvent?: PlaceholderEventData | null
  onPlaceholderChange?: (placeholder: PlaceholderEventData | null) => void
}

type ViewMode = 'timeline' | 'agenda' | 'combined'
type FilterType = 'all' | 'pending' | 'completed' | 'high-priority'

const PRIORITY_COLORS = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const UnifiedDailyPlanner: React.FC<UnifiedDailyPlannerProps> = ({
  date = createLocalDate(),
  onEventView,
  refreshTrigger,
  onRefreshTrigger,
  onTaskStatusChange,
  onConflictClick,
  activeConflicts,
  excludeFromConflictDetection,
  onTimeSlotClick,
  onTimeSlotDoubleClick,
  placeholderEvent = null,
  onPlaceholderChange
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('combined')
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showMultiEventModal, setShowMultiEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00')
  const [objectives, setObjectives] = useState<MissionObjective[]>([])
  const [quickEntryText, setQuickEntryText] = useState('')
  const [showObjectives, setShowObjectives] = useState(true)
  const [draggedObjective, setDraggedObjective] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const timeSlotRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const eventsGridRef = useRef<HTMLDivElement>(null)
  const pixelsPerHour = 70

  // For day view, create a "week" starting on the selected date (single day treated as a week)
  const dayStart = date

  // Event creation drag hook
  // For day view, we use dayColumnCount: 1 (single day column)
  const {
    dragState: creationDragState,
    isDragging: isCreationDragging,
    handleMouseDown: handleCreationMouseDown,
    resetDrag: resetCreationDrag
  } = useEventCreationDrag(eventsGridRef, dayStart, {
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
          endHour: state.currentHour
        })
      }
    },
    onDragEnd: (state: DragState) => {
      // Final update to placeholder with drag result
      if (onPlaceholderChange) {
        onPlaceholderChange({
          date: state.startDate,
          hour: state.startHour,
          minutes: state.startMinutes,
          duration: state.duration,
          title: placeholderEvent?.title,
          endDate: state.currentDate,
          endHour: state.currentHour
        })
      }
    }
  }, DAY_VIEW_PIXELS_PER_HOUR, 1) // dayColumnCount: 1 for day view

  // Unified events hook
  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    isLoading: eventsLoading
  } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  // Get today's events - include events in deps to ensure re-render on any event change
  const todaysEvents = useMemo(() => {
    return getEventsForDate(date)
  }, [events, getEventsForDate, date])

  // Load objectives from localStorage
  useEffect(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const stored = localStorage.getItem(`mission-objectives-${dateKey}`)
    if (stored) {
      try {
        setObjectives(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading objectives:', e)
        setObjectives([])
      }
    } else {
      setObjectives([])
    }
  }, [date, refreshTrigger])

  // Save objectives to localStorage
  const saveObjectives = useCallback((newObjectives: MissionObjective[]) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    localStorage.setItem(`mission-objectives-${dateKey}`, JSON.stringify(newObjectives))
    setObjectives(newObjectives)
  }, [date])

  // Auto-scroll to current hour
  useEffect(() => {
    const now = new Date()
    const isToday = isSameDay(date, now)
    if (isToday && timeSlotRefs.current[now.getHours()]) {
      setTimeout(() => {
        timeSlotRefs.current[now.getHours()]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }, 100)
    }
  }, [date])

  // Smart text parsing for quick entry
  const parseQuickEntry = (text: string): Partial<MissionObjective> => {
    const result: Partial<MissionObjective> = { text }

    // Priority detection
    if (/urgent|asap|critical/i.test(text)) {
      result.priority = 'urgent'
      result.text = text.replace(/\s*(urgent|asap|critical):?\s*/gi, '')
    } else if (/high|important/i.test(text)) {
      result.priority = 'high'
      result.text = text.replace(/\s*(high|important):?\s*/gi, '')
    } else if (/low/i.test(text)) {
      result.priority = 'low'
      result.text = text.replace(/\s*low:?\s*/gi, '')
    } else {
      result.priority = 'medium'
    }

    // Time estimate detection
    const timeMatch = text.match(/(\d+)\s*(min|minute|hour|hr|h|m)/i)
    if (timeMatch) {
      const value = parseInt(timeMatch[1])
      const unit = timeMatch[2].toLowerCase()
      result.timeEstimate = unit.startsWith('h') ? value * 60 : value
      result.text = result.text?.replace(timeMatch[0], '').trim()
    }

    // Category detection
    const categoryMatch = text.match(/#(\w+)|\[(\w+)\]/)
    if (categoryMatch) {
      result.category = categoryMatch[1] || categoryMatch[2]
      result.text = result.text?.replace(categoryMatch[0], '').trim()
    }

    return result
  }

  // Add objective from quick entry
  const handleQuickAdd = () => {
    if (!quickEntryText.trim()) return

    const parsed = parseQuickEntry(quickEntryText)
    const newObjective: MissionObjective = {
      id: `obj-${Date.now()}`,
      text: parsed.text || quickEntryText,
      priority: parsed.priority || 'medium',
      completed: false,
      timeEstimate: parsed.timeEstimate,
      category: parsed.category,
      createdAt: new Date().toISOString()
    }

    saveObjectives([newObjective, ...objectives])
    setQuickEntryText('')
  }

  // Toggle objective completion
  const toggleObjective = (id: string) => {
    const updated = objectives.map(obj =>
      obj.id === id ? { ...obj, completed: !obj.completed } : obj
    )
    saveObjectives(updated)
  }

  // Delete objective
  const deleteObjective = (id: string) => {
    saveObjectives(objectives.filter(obj => obj.id !== id))
  }

  // Handle event creation or update
  const handleSaveEvent = async (eventData: UnifiedEvent) => {
    try {
      // Check if this is an edit (event exists in our list) or a new event
      const existingEvent = events.find(e => e.id === eventData.id)

      if (existingEvent) {
        // Update existing event
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
      } else {
        // Create new event
        await createEvent(eventData)
      }

      onRefreshTrigger?.()
    } catch (error) {
      console.error('❌ [UnifiedDailyPlanner] Error saving event:', error)
    }
  }

  // Handle multi-event creation
  const handleMultiEventSave = async (events: UnifiedEvent[]) => {
    try {
      for (const event of events) {
        await createEvent(event)
      }
      onRefreshTrigger?.()
    } catch (error) {
      console.error('Error creating events:', error)
    }
  }

  // Handle time slot click
  const handleTimeSlotClick = (hour: number) => {
    if (onTimeSlotClick) {
      // Parent is managing event creation (e.g., via sidebar)
      onTimeSlotClick(date, hour)
    } else {
      // Fallback to local modal handling
      setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:00`)
      setEditingEvent(null)
      setShowEventModal(true)
    }
  }

  // Handle time slot double-click (for sidebar event creation)
  const handleTimeSlotDoubleClick = (hour: number, minutes?: number) => {
    if (onTimeSlotDoubleClick) {
      onTimeSlotDoubleClick(date, hour, minutes)
    } else {
      // Fallback to local modal handling (same as single click for now)
      const mins = minutes ?? 0
      setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
      setEditingEvent(null)
      setShowEventModal(true)
    }
  }

  // Handle event resize
  const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string) => {
    const updates = {
      startDateTime: newStartTime,
      endDateTime: newEndTime,
      duration: Math.round((new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60))
    }

    try {
      await updateEvent(event.id, updates)
      onRefreshTrigger?.()
    } catch (error) {
      console.error('❌ [UnifiedDailyPlanner] Error resizing event:', error)
    }
  }

  // Handle event drop (drag and drop)
  const handleEventDrop = async (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => {
    try {
      // Use the new drag calculation utility for accurate time mapping
      const { newStartDateTime, newEndDateTime, duration } = calculateDragDropTimes(
        event,
        fromSlot,
        toSlot
      )

      const updates = {
        startDateTime: newStartDateTime,
        endDateTime: newEndDateTime,
        duration
      }

      await updateEvent(event.id, updates)
      onRefreshTrigger?.()
    } catch (error) {
      console.error('❌ Error moving event:', error)
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = todaysEvents

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term) ||
        e.clientName?.toLowerCase().includes(term)
      )
    }

    if (filter === 'high-priority') {
      filtered = filtered.filter(e => e.priority === 'high' || e.priority === 'urgent')
    } else if (filter === 'completed') {
      filtered = filtered.filter(e => e.status === 'completed')
    } else if (filter === 'pending') {
      filtered = filtered.filter(e => e.status !== 'completed')
    }

    return filtered
  }, [todaysEvents, searchTerm, filter])

  // Calculate statistics
  const stats = useMemo(() => {
    const completedObjectives = objectives.filter(o => o.completed).length
    const totalObjectives = objectives.length
    const totalEvents = todaysEvents.length
    const totalMinutes = objectives.reduce((sum, o) => sum + (o.timeEstimate || 0), 0)

    return {
      completedObjectives,
      totalObjectives,
      totalEvents,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      completionRate: totalObjectives ? Math.round((completedObjectives / totalObjectives) * 100) : 0
    }
  }, [objectives, todaysEvents])

  // Render timeline view
  // Fixed height per hour slot in pixels (uses module constant)
  const PIXELS_PER_HOUR = DAY_VIEW_PIXELS_PER_HOUR

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
      left: 0,
      right: 0,
      zIndex: 10
    }
  }

  const renderTimeline = () => (
    <div className="relative">
      {/* Time slots grid - fixed height slots */}
      <div className="relative">
        {Array.from({ length: 24 }, (_, i) => {
          const hour = i
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
          const period = hour < 12 ? 'AM' : 'PM'
          const now = new Date()
          const isCurrentHour = isSameDay(date, now) && now.getHours() === hour

          // Get events starting in this hour (for DropZone occupancy check)
          const hourEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.startDateTime)
            return eventDate.getHours() === hour
          })

          return (
            <div
              key={hour}
              ref={(el) => { timeSlotRefs.current[hour] = el }}
              className={`grid grid-cols-12 gap-2 border-b border-border ${isCurrentHour ? 'bg-accent/10 border-l-2 border-l-accent' : ''}`}
              style={{ height: `${PIXELS_PER_HOUR}px` }}
            >
              {/* Time Column */}
              <div className="col-span-2 lg:col-span-1">
                <div
                  className={`text-right cursor-pointer p-1 rounded text-xs ${isCurrentHour ? 'text-accent font-bold' : 'text-muted-foreground'}`}
                  onClick={() => handleTimeSlotClick(hour)}
                >
                  <div>{hour.toString().padStart(2, '0')}:00</div>
                  <div className="text-[10px]">{displayHour} {period}</div>
                </div>
              </div>

              {/* DropZone Column - fixed height, no events rendered inside */}
              <div className="col-span-10 lg:col-span-11 relative" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                <DropZone
                  date={format(date, 'yyyy-MM-dd')}
                  hour={hour}
                  dayIndex={0}
                  isOccupied={hourEvents.length > 0}
                  events={hourEvents}
                  onTimeSlotClick={() => handleTimeSlotClick(hour)}
                  onTimeSlotDoubleClick={(clickDate, clickHour, minutes) => handleTimeSlotDoubleClick(clickHour, minutes)}
                  onMouseDownOnSlot={handleCreationMouseDown}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Events layer - absolutely positioned over the grid */}
      <div
        ref={eventsGridRef}
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
      >
        <div className="grid grid-cols-12 gap-2 h-full">
          {/* Spacer for time column */}
          <div className="col-span-2 lg:col-span-1" />

          {/* Events container */}
          <div className="col-span-10 lg:col-span-11 relative">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                style={getEventStyle(event)}
                className="pointer-events-auto"
              >
                <CalendarEvent
                  event={event}
                  viewMode="day"
                  currentDate={format(date, 'yyyy-MM-dd')}
                  currentHour={new Date(event.startDateTime).getHours()}
                  pixelsPerHour={PIXELS_PER_HOUR}
                  onClick={() => onEventView?.(event)}
                  onResizeEnd={handleEventResize}
                  showResizeHandles={true}
                  isCompact={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Placeholder event overlay - shows ghost event during creation */}
      {placeholderEvent && (
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{ height: `${24 * PIXELS_PER_HOUR}px` }}
        >
          <div className="grid grid-cols-12 gap-2 h-full">
            {/* Spacer for time column */}
            <div className="col-span-2 lg:col-span-1" />

            {/* Placeholder container */}
            <div className="col-span-10 lg:col-span-11 relative">
              <PlaceholderEvent
                date={placeholderEvent.date}
                hour={placeholderEvent.hour}
                minutes={placeholderEvent.minutes}
                duration={placeholderEvent.duration}
                title={placeholderEvent.title}
                pixelsPerHour={PIXELS_PER_HOUR}
                endDate={placeholderEvent.endDate}
                endHour={placeholderEvent.endHour}
                isMultiDay={placeholderEvent.endDate !== undefined && placeholderEvent.endDate !== placeholderEvent.date}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render agenda view
  const renderAgenda = () => (
    <div className="space-y-2">
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-[var(--neomorphic-text)] opacity-50" />
          <p className="text-[var(--neomorphic-text)] opacity-70 font-primary">No events scheduled for this day</p>
          <button
            className="neo-button-active mt-4 px-4 py-2 rounded-lg font-primary text-sm uppercase tracking-wide flex items-center gap-2 mx-auto"
            onClick={() => setShowEventModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
      ) : (
        filteredEvents
          .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
          .map(event => {
            const category = eventCategorizer.instance.categorizeEvent(event)
            return (
              <Card
                key={event.id}
                className="cursor-pointer hover:bg-accent/5 transition-colors"
                onClick={() => onEventView?.(event)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Time */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-bold">
                        {format(new Date(event.startDateTime), 'h:mm')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.startDateTime), 'a')}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{event.title}</span>
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[event.priority as keyof typeof PRIORITY_COLORS]}`}>
                          {event.priority}
                        </Badge>
                        {category && (
                          <Badge variant="outline" className="text-[10px]">
                            {category.category}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                        {event.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.duration}min
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.clientName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.clientName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
      )}
    </div>
  )

  // Render objectives panel
  const renderObjectives = () => (
    <div className="space-y-3">
      {/* Quick Entry */}
      <div className="flex gap-2">
        <input
          placeholder="Quick add: 'urgent: fix bug 30min #dev'"
          value={quickEntryText}
          onChange={(e) => setQuickEntryText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="neo-input flex-1 px-3 py-2 rounded-lg font-primary text-sm text-[var(--neomorphic-text)]"
        />
        <button
          onClick={handleQuickAdd}
          className="neo-button-active px-3 py-2 rounded-lg"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Pending Objectives */}
      <div className="space-y-2">
        {objectives
          .filter(o => !o.completed)
          .sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          })
          .map(objective => (
            <div
              key={objective.id}
              className="flex items-center gap-2 p-2 neo-card rounded-lg group"
            >
              <button
                onClick={() => toggleObjective(objective.id)}
                className="p-1 hover:bg-accent/10 rounded"
              >
                <div className={`w-4 h-4 rounded border-2 ${PRIORITY_COLORS[objective.priority]}`} />
              </button>
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
              <span className="flex-1 text-sm">{objective.text}</span>
              {objective.timeEstimate && (
                <Badge variant="outline" className="text-[10px]">
                  <Timer className="h-3 w-3 mr-1" />
                  {objective.timeEstimate}m
                </Badge>
              )}
              {objective.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {objective.category}
                </Badge>
              )}
              <button
                onClick={() => deleteObjective(objective.id)}
                className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
      </div>

      {/* Completed Objectives */}
      {objectives.filter(o => o.completed).length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed ({objectives.filter(o => o.completed).length})
          </div>
          {objectives
            .filter(o => o.completed)
            .map(objective => (
              <div
                key={objective.id}
                className="flex items-center gap-2 p-2 opacity-50"
              >
                <button
                  onClick={() => toggleObjective(objective.id)}
                  className="p-1"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </button>
                <span className="flex-1 text-sm line-through">{objective.text}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
      <div ref={containerRef} className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{format(date, 'EEEE, MMMM d')}</h2>
              <p className="text-sm text-muted-foreground">
                {stats.totalEvents} events · {stats.completedObjectives}/{stats.totalObjectives} objectives
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Multi-event button */}
              <button
                onClick={() => setShowMultiEventModal(true)}
                className="neo-button px-3 py-2 rounded-lg flex items-center gap-1 font-primary text-sm uppercase tracking-wide text-[var(--neomorphic-text)]"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Batch Add</span>
              </button>

              {/* Single event button */}
              <button
                onClick={() => {
                  setEditingEvent(null)
                  setShowEventModal(true)
                }}
                className="neo-button-active px-3 py-2 rounded-lg flex items-center gap-1 font-primary text-sm uppercase tracking-wide font-semibold"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="neo-inset flex rounded-lg p-1">
              <button
                className={`px-3 py-1 text-xs rounded-md font-primary uppercase tracking-wide transition-all ${viewMode === 'timeline' ? 'neo-button-active' : 'text-[var(--neomorphic-text)] hover:bg-[var(--neomorphic-bg)]'}`}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md font-primary uppercase tracking-wide transition-all ${viewMode === 'agenda' ? 'neo-button-active' : 'text-[var(--neomorphic-text)] hover:bg-[var(--neomorphic-bg)]'}`}
                onClick={() => setViewMode('agenda')}
              >
                Agenda
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md font-primary uppercase tracking-wide transition-all ${viewMode === 'combined' ? 'neo-button-active' : 'text-[var(--neomorphic-text)] hover:bg-[var(--neomorphic-bg)]'}`}
                onClick={() => setViewMode('combined')}
              >
                Combined
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[150px] max-w-[250px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--neomorphic-text)] opacity-50" />
              <input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="neo-input pl-8 h-8 text-sm w-full rounded-lg font-primary text-[var(--neomorphic-text)]"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="neo-input h-8 px-2 text-sm rounded-lg font-primary text-[var(--neomorphic-text)]"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="high-priority">High Priority</option>
            </select>

            {/* Toggle Objectives */}
            <button
              onClick={() => setShowObjectives(!showObjectives)}
              className={`neo-button px-3 py-1 rounded-lg flex items-center gap-1 font-primary text-xs uppercase tracking-wide ${showObjectives ? 'neo-button-active' : 'text-[var(--neomorphic-text)]'}`}
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Objectives</span>
              {showObjectives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs font-primary uppercase tracking-wide text-[var(--neomorphic-text)] opacity-70 mb-1">
              <span>Daily Progress</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="neo-inset h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--neomorphic-accent)] transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'timeline' && renderTimeline()}
            {viewMode === 'agenda' && renderAgenda()}
            {viewMode === 'combined' && (
              <div className="space-y-6">
                {/* Compact Timeline for Combined View */}
                {renderTimeline()}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Objectives (Non-Combined or Mobile) */}
        {showObjectives && viewMode !== 'combined' && (
          <div className="border-t p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4" />
              <span className="font-medium">Mission Objectives</span>
              <Badge variant="outline" className="ml-auto">
                {stats.completedObjectives}/{stats.totalObjectives}
              </Badge>
            </div>
            {renderObjectives()}
          </div>
        )}

        {/* Mobile Objectives (Combined Mode) */}
        {showObjectives && viewMode === 'combined' && (
          <div className="lg:hidden border-t p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4" />
              <span className="font-medium">Mission Objectives</span>
              <Badge variant="outline" className="ml-auto">
                {stats.completedObjectives}/{stats.totalObjectives}
              </Badge>
            </div>
            {renderObjectives()}
          </div>
        )}

        {/* Single Event Modal */}
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
          onSave={handleSaveEvent}
          initialDate={date}
          initialTime={selectedTimeSlot}
          editingEvent={editingEvent || undefined}
        />

        {/* Multi-Event Modal */}
        <MultiEventCreationModal
          isOpen={showMultiEventModal}
          onClose={() => setShowMultiEventModal(false)}
          onSave={handleMultiEventSave}
          initialDate={date}
        />
      </div>
    </DragDropProvider>
  )
}

export default UnifiedDailyPlanner
