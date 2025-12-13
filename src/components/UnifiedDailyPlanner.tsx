"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns'
import {
  Plus, Clock, MapPin, User, Target, Calendar, Filter, Search,
  ChevronDown, ChevronUp, GripVertical, Check, X, MoreVertical,
  Zap, ListTodo, Timer, AlertCircle, CheckCircle2, Sparkles,
  PlusCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { useViewManager } from '@/contexts/ViewManagerContext'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import MultiEventCreationModal from '@/components/MultiEventCreationModal'
import DropdownMenu from '@/components/ui/DropdownMenu'
import { createLocalDate } from '@/lib/timezone-utils'
import { DragDropProvider } from '@/components/DragDropContext'
import DragAndDropEvent from '@/components/DragAndDropEvent'
import DropZone from '@/components/DropZone'
import ContinuousEventBlock from '@/components/ContinuousEventBlock'
import { eventCategorizer, EventCategory } from '@/lib/event-categorizer'

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
  onTimeSlotClick
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
  const pixelsPerHour = 70

  // Unified events hook
  const {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    isLoading: eventsLoading
  } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  // Get today's events
  const todaysEvents = useMemo(() => {
    return getEventsForDate(date)
  }, [getEventsForDate, date])

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

  // Handle event creation
  const handleCreateEvent = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      console.log('Event created:', eventData.title)
      onRefreshTrigger?.()
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  // Handle multi-event creation
  const handleMultiEventSave = async (events: UnifiedEvent[]) => {
    try {
      for (const event of events) {
        await createEvent(event)
      }
      console.log(`Created ${events.length} events`)
      onRefreshTrigger?.()
    } catch (error) {
      console.error('Error creating events:', error)
    }
  }

  // Handle time slot click
  const handleTimeSlotClick = (hour: number) => {
    setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:00`)
    setEditingEvent(null)
    setShowEventModal(true)
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
  const renderTimeline = () => (
    <div className="space-y-1">
      {Array.from({ length: 24 }, (_, i) => {
        const hour = i
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        const period = hour < 12 ? 'AM' : 'PM'
        const now = new Date()
        const isCurrentHour = isSameDay(date, now) && now.getHours() === hour

        // Get events for this hour
        const hourEvents = filteredEvents.filter(event => {
          const eventDate = new Date(event.startDateTime)
          return eventDate.getHours() === hour
        })

        return (
          <div
            key={hour}
            ref={(el) => { timeSlotRefs.current[hour] = el }}
            className={`grid grid-cols-12 gap-2 py-1 ${isCurrentHour ? 'bg-accent/10 border-l-2 border-accent' : ''}`}
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

            {/* Events Column */}
            <div className="col-span-10 lg:col-span-11 min-h-[50px]">
              <DropZone
                date={format(date, 'yyyy-MM-dd')}
                hour={hour}
                isOccupied={hourEvents.length > 0}
                events={hourEvents}
                onTimeSlotClick={() => handleTimeSlotClick(hour)}
              >
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className="neo-card p-2 mb-1 cursor-pointer hover:bg-accent/5 transition-colors"
                    onClick={() => onEventView?.(event)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-8 rounded ${PRIORITY_COLORS[event.priority as keyof typeof PRIORITY_COLORS] || 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{event.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{format(new Date(event.startDateTime), 'h:mm a')}</span>
                          {event.duration && <span>({event.duration}min)</span>}
                          {event.clientName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {event.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </DropZone>
            </div>
          </div>
        )
      })}
    </div>
  )

  // Render agenda view
  const renderAgenda = () => (
    <div className="space-y-2">
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No events scheduled for this day</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowEventModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
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
        <Input
          placeholder="Quick add: 'urgent: fix bug 30min #dev'"
          value={quickEntryText}
          onChange={(e) => setQuickEntryText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleQuickAdd}>
          <Plus className="h-4 w-4" />
        </Button>
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
    <DragDropProvider onEventDrop={() => {}} onEventResize={() => {}}>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiEventModal(true)}
                className="gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Batch Add</span>
              </Button>

              {/* Single event button */}
              <Button
                size="sm"
                onClick={() => {
                  setEditingEvent(null)
                  setShowEventModal(true)
                }}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Event</span>
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border p-0.5">
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === 'timeline' ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === 'agenda' ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => setViewMode('agenda')}
              >
                Agenda
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === 'combined' ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => setViewMode('combined')}
              >
                Combined
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[150px] max-w-[250px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="high-priority">High Priority</option>
            </select>

            {/* Toggle Objectives */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowObjectives(!showObjectives)}
              className="gap-1"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Objectives</span>
              {showObjectives ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Daily Progress</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className={`flex-1 overflow-y-auto p-4 ${showObjectives && viewMode === 'combined' ? 'lg:w-2/3' : 'w-full'}`}>
            {viewMode === 'timeline' && renderTimeline()}
            {viewMode === 'agenda' && renderAgenda()}
            {viewMode === 'combined' && (
              <div className="space-y-6">
                {/* Compact Timeline for Combined View */}
                {renderTimeline()}
              </div>
            )}
          </div>

          {/* Objectives Sidebar (Combined Mode) */}
          {showObjectives && viewMode === 'combined' && (
            <div className="hidden lg:block w-1/3 border-l p-4 overflow-y-auto">
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
          onSave={handleCreateEvent}
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
