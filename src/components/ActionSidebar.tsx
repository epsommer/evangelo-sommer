"use client"

import React, { useState, useEffect, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  startOfWeek,
  endOfWeek,
  isPast,
  isFuture,
  parseISO,
  subWeeks,
  getDay
} from 'date-fns'
import {
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Plus,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  X,
  GripVertical,
  Timer,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent } from '@/components/EventCreationModal'
import YearDayIndicator from '@/components/calendar/YearDayIndicator'

interface ActionSidebarProps {
  selectedDate: Date
  currentView: 'day' | 'week' | 'month' | 'year'
  onDateSelect: (date: Date) => void
  onViewChange?: (view: 'day' | 'week') => void
  onEventCreate?: (eventData: UnifiedEvent) => void
  events: UnifiedEvent[]
  isEventCreationMode?: boolean
  initialEventTime?: string
  onExitEventCreation?: () => void
}

interface MissionObjective {
  id: string
  text: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  completed: boolean
  timeEstimate?: number
  dueDate?: string
  dueTime?: string
  category?: string
  createdAt: string
}

const PRIORITY_COLORS = {
  low: 'border-green-500',
  medium: 'border-blue-500',
  high: 'border-orange-500',
  urgent: 'border-red-500'
}

type SidebarTab = 'overview' | 'analytics'

const ActionSidebar: React.FC<ActionSidebarProps> = ({
  selectedDate,
  currentView,
  onDateSelect,
  onViewChange,
  onEventCreate,
  events,
  isEventCreationMode = false,
  initialEventTime,
  onExitEventCreation
}) => {
  const today = new Date()
  const [displayedMonth, setDisplayedMonth] = useState<Date>(selectedDate)
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['calendar']))
  const [objectives, setObjectives] = useState<MissionObjective[]>([])
  const [quickEntryText, setQuickEntryText] = useState('')
  const [activeTab, setActiveTab] = useState<SidebarTab>('overview')

  // Load objectives for the selected date from localStorage
  useEffect(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const storageKey = `mission-objectives-${dateKey}`
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setObjectives(JSON.parse(stored))
      } else {
        setObjectives([])
      }
    } catch (error) {
      console.error('Error loading objectives:', error)
      setObjectives([])
    }
  }, [selectedDate])

  // Save objectives to localStorage whenever they change
  useEffect(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    const storageKey = `mission-objectives-${dateKey}`
    try {
      localStorage.setItem(storageKey, JSON.stringify(objectives))
    } catch (error) {
      console.error('Error saving objectives:', error)
    }
  }, [objectives, selectedDate])

  // Sync displayed month with selected date
  useEffect(() => {
    if (!isSameMonth(displayedMonth, selectedDate)) {
      setDisplayedMonth(selectedDate)
    }
  }, [selectedDate])

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => {
      const next = new Set(prev)
      if (next.has(panel)) {
        next.delete(panel)
      } else {
        next.add(panel)
      }
      return next
    })
  }

  const handlePreviousMonth = () => {
    setDisplayedMonth(prev => addMonths(prev, -1))
  }

  const handleNextMonth = () => {
    setDisplayedMonth(prev => addMonths(prev, 1))
  }

  const handleReturnToToday = () => {
    setDisplayedMonth(today)
    onDateSelect(today)
  }

  const handleDayClick = (date: Date) => {
    onDateSelect(date)
    if (currentView === 'month' || currentView === 'year') {
      onViewChange?.('day')
    }
  }

  const getEventsForDay = (date: Date): UnifiedEvent[] => {
    return events.filter(event => {
      const eventDate = parseISO(event.startDateTime)
      return isSameDay(eventDate, date)
    })
  }

  const getUpcomingEvents = (): UnifiedEvent[] => {
    const now = new Date()
    return events
      .filter(event => {
        const eventDate = parseISO(event.startDateTime)
        return isFuture(eventDate) || isToday(eventDate)
      })
      .sort((a, b) => {
        const dateA = parseISO(a.startDateTime)
        const dateB = parseISO(b.startDateTime)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 5)
  }

  const handleQuickAdd = () => {
    if (!quickEntryText.trim()) return

    const text = quickEntryText.trim()
    const priorityMatch = text.match(/^(urgent|high|medium|low):/i)
    const timeMatch = text.match(/(\d+)(min|m|h|hr)/i)
    const categoryMatch = text.match(/#(\w+)/)

    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as typeof priority
    }

    let timeEstimate: number | undefined
    if (timeMatch) {
      const value = parseInt(timeMatch[1])
      const unit = timeMatch[2].toLowerCase()
      timeEstimate = unit.startsWith('h') ? value * 60 : value
    }

    const category = categoryMatch?.[1]

    let cleanText = text
    if (priorityMatch) cleanText = cleanText.replace(priorityMatch[0], '').trim()
    if (timeMatch) cleanText = cleanText.replace(timeMatch[0], '').trim()
    if (categoryMatch) cleanText = cleanText.replace(categoryMatch[0], '').trim()

    const newObjective: MissionObjective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: cleanText,
      priority,
      completed: false,
      timeEstimate,
      category,
      createdAt: new Date().toISOString()
    }

    setObjectives(prev => [...prev, newObjective])
    setQuickEntryText('')
  }

  const toggleObjective = (id: string) => {
    setObjectives(prev =>
      prev.map(obj =>
        obj.id === id ? { ...obj, completed: !obj.completed } : obj
      )
    )
  }

  const deleteObjective = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id))
  }

  // Calculate statistics for analytics tab
  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const todayEvents = events.filter(e => isSameDay(parseISO(e.startDateTime), now))
    const weekEvents = events.filter(e => {
      const d = parseISO(e.startDateTime)
      return d >= weekStart && d <= weekEnd
    })
    const monthEvents = events.filter(e => {
      const d = parseISO(e.startDateTime)
      return d >= monthStart && d <= monthEnd
    })

    const sumDuration = (evts: UnifiedEvent[]) => {
      return evts.reduce((sum, e) => sum + (e.duration || 60), 0) / 60
    }

    return {
      today: { count: todayEvents.length, hours: Math.round(sumDuration(todayEvents) * 10) / 10 },
      week: { count: weekEvents.length, hours: Math.round(sumDuration(weekEvents) * 10) / 10 },
      month: { count: monthEvents.length, hours: Math.round(sumDuration(monthEvents) * 10) / 10 }
    }
  }, [events])

  // Get week days for weekly summary
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) })
  }, [selectedDate])

  // Get heatmap data (last 12 weeks)
  const heatmapDays = useMemo(() => {
    const heatmapStart = subWeeks(new Date(), 12)
    return eachDayOfInterval({ start: heatmapStart, end: new Date() })
  }, [])

  // Render mini calendar
  const renderMiniCalendar = () => {
    const monthStart = startOfMonth(displayedMonth)
    const monthEnd = endOfMonth(displayedMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const isCurrentMonth = isSameMonth(displayedMonth, today)

    return (
      <div className="space-y-3">
        {/* Month header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="neo-button p-2 rounded-lg hover:neo-button-active transition-all"
            aria-label="Previous month"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              {format(displayedMonth, 'MMMM yyyy')}
            </h3>
            {!isCurrentMonth && (
              <button
                onClick={handleReturnToToday}
                className="neo-button p-1.5 rounded-lg hover:neo-button-active transition-all"
                aria-label="Return to today"
                title="Return to today"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="neo-button p-2 rounded-lg hover:neo-button-active transition-all"
            aria-label="Next month"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div
                key={index}
                className="text-xs text-center text-muted-foreground font-bold py-1 font-primary uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonthDay = isSameMonth(day, displayedMonth)
              const isTodayDay = isToday(day)
              const isSelected = isSameDay(day, selectedDate)
              const dayEvents = isCurrentMonthDay ? getEventsForDay(day) : []
              const hasEvents = dayEvents.length > 0

              return (
                <button
                  key={index}
                  onClick={() => isCurrentMonthDay && handleDayClick(day)}
                  disabled={!isCurrentMonthDay}
                  className={`
                    aspect-square text-xs rounded-lg transition-all font-primary relative
                    ${!isCurrentMonthDay
                      ? 'text-muted-foreground opacity-30 cursor-not-allowed'
                      : isTodayDay
                      ? 'bg-accent text-accent-foreground font-bold ring-2 ring-accent'
                      : isSelected
                      ? 'neo-button-active font-bold'
                      : 'neo-button hover:neo-button-active'
                    }
                  `}
                >
                  <span className="relative z-10">{format(day, 'd')}</span>
                  {isCurrentMonthDay && hasEvents && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full bg-accent"
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render mission objectives panel
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

  // Render upcoming events panel
  const renderUpcomingEvents = () => {
    const upcomingEvents = getUpcomingEvents()

    if (upcomingEvents.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-4 font-primary">
          No upcoming events
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {upcomingEvents.map(event => {
          const eventDate = parseISO(event.startDateTime)
          const eventTime = format(eventDate, 'h:mm a')
          const eventDay = format(eventDate, 'EEE, MMM d')

          return (
            <div
              key={event.id}
              className="neo-card p-3 rounded-lg space-y-1 hover:neo-button-active transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--neomorphic-text)] truncate font-primary">
                    {event.title}
                  </div>
                  {event.clientName && (
                    <div className="text-xs text-muted-foreground truncate font-primary">
                      {event.clientName}
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${
                    event.priority === 'urgent' ? 'border-red-500 text-red-500' :
                    event.priority === 'high' ? 'border-orange-500 text-orange-500' :
                    event.priority === 'medium' ? 'border-blue-500 text-blue-500' :
                    'border-green-500 text-green-500'
                  }`}
                >
                  {event.priority}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-primary">
                <Clock className="h-3 w-3" />
                <span>{eventDay} at {eventTime}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render weekly summary panel for analytics tab
  const renderWeeklySummary = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 })
    const weekEvents = events.filter(e => {
      const d = parseISO(e.startDateTime)
      return d >= weekStart && d <= weekEnd
    })

    const totalHours = weekEvents.reduce((sum, e) => sum + (e.duration || 60), 0) / 60
    const completedEvents = weekEvents.filter(e => e.status?.toLowerCase() === 'completed')
    const completionRate = weekEvents.length > 0 ? Math.round((completedEvents.length / weekEvents.length) * 100) : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            Week of {format(weekStart, 'MMM d')}
          </h4>
        </div>

        {/* Day badges */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayEvents = events.filter(event => {
              const eventDate = parseISO(event.startDateTime)
              return isSameDay(eventDate, day)
            })

            return (
              <div key={day.toISOString()} className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-primary mb-1">
                  {format(day, 'EEE')}
                </div>
                <Badge
                  variant="outline"
                  className={`w-full justify-center ${
                    dayEvents.length > 0
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {dayEvents.length}
                </Badge>
              </div>
            )
          })}
        </div>

        {/* Week stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-primary uppercase tracking-wide">Total Events:</span>
            <span className="font-bold text-[var(--neomorphic-text)]">{weekEvents.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-primary uppercase tracking-wide">Total Hours:</span>
            <span className="font-bold text-[var(--neomorphic-text)]">{Math.round(totalHours * 10) / 10}h</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-primary uppercase tracking-wide">Completion:</span>
              <span className="font-bold text-[var(--neomorphic-text)]">{completionRate}%</span>
            </div>
            <div className="w-full h-2 neo-inset rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render activity heatmap panel for analytics tab
  const renderActivityHeatmap = () => {
    // Group days by week
    const weeks: Date[][] = []
    let currentWeek: Date[] = []

    heatmapDays.forEach((day, index) => {
      currentWeek.push(day)
      if (getDay(day) === 6 || index === heatmapDays.length - 1) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            Last 12 Weeks
          </h4>
        </div>

        {/* Heatmap grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1">
              {week.map((day, dayIndex) => {
                const dayEvents = events.filter(event => {
                  const eventDate = parseISO(event.startDateTime)
                  return isSameDay(eventDate, day)
                })

                return (
                  <YearDayIndicator
                    key={`${weekIndex}-${dayIndex}`}
                    eventCount={dayEvents.length}
                    onClick={() => handleDayClick(day)}
                    isToday={isToday(day)}
                    className="w-3 h-3 cursor-pointer"
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-primary uppercase tracking-wide">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted"></div>
            <div className="w-3 h-3 rounded-sm bg-accent/30"></div>
            <div className="w-3 h-3 rounded-sm bg-accent/50"></div>
            <div className="w-3 h-3 rounded-sm bg-accent"></div>
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    )
  }

  // Render quick stats panel for analytics tab
  const renderQuickStats = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Quick Stats
        </h4>

        {/* Today */}
        <div className="neo-card p-3 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-primary mb-2">
            Today
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-accent font-primary">
                {stats.today.count}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Events
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--neomorphic-text)] font-primary">
                {stats.today.hours}h
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Hours
              </div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="neo-card p-3 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-primary mb-2">
            This Week
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-accent font-primary">
                {stats.week.count}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Events
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--neomorphic-text)] font-primary">
                {stats.week.hours}h
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Hours
              </div>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="neo-card p-3 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-primary mb-2">
            This Month
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-accent font-primary">
                {stats.month.count}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Events
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--neomorphic-text)] font-primary">
                {stats.month.hours}h
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-primary">
                Hours
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main render - show event creation mode or default panels
  if (isEventCreationMode) {
    return (
      <div className="neo-card h-full overflow-y-auto">
        <div className="p-4 border-b border-[var(--neomorphic-dark-shadow)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Create Event
            </h2>
            <button
              onClick={onExitEventCreation}
              className="neo-button p-2 rounded-lg"
              aria-label="Back to sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="text-sm text-muted-foreground font-primary text-center py-8">
            Event creation form will be rendered here inline.
            <br />
            (Integration in next prompt)
          </div>
        </div>
      </div>
    )
  }

  // Default view with tabs
  return (
    <div className="neo-card h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Tab Navigation */}
        <div className="neo-inset flex rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-all font-primary uppercase tracking-wide ${
              activeTab === 'overview'
                ? 'neo-button-active font-bold'
                : 'hover:bg-accent/10'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-all font-primary uppercase tracking-wide ${
              activeTab === 'analytics'
                ? 'neo-button-active font-bold'
                : 'hover:bg-accent/10'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </button>
        </div>
        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Mini Calendar Panel */}
            <div className="space-y-3">
              <button
                onClick={() => togglePanel('calendar')}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Calendar
                  </h3>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedPanels.has('calendar') ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedPanels.has('calendar') && (
                <div className="neo-inset rounded-xl p-4">
                  {renderMiniCalendar()}
                </div>
              )}
            </div>

            {/* Mission Objectives Panel */}
            <div className="space-y-3">
              <button
                onClick={() => togglePanel('objectives')}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Mission Objectives
                  </h3>
                  {objectives.filter(o => !o.completed).length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {objectives.filter(o => !o.completed).length}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedPanels.has('objectives') ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedPanels.has('objectives') && (
                <div className="neo-inset rounded-xl p-4">
                  {renderObjectives()}
                </div>
              )}
            </div>

            {/* Upcoming Events Panel */}
            <div className="space-y-3">
              <button
                onClick={() => togglePanel('upcoming')}
                className="flex items-center justify-between w-full text-left group"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Upcoming Events
                  </h3>
                  {getUpcomingEvents().length > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {getUpcomingEvents().length}
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedPanels.has('upcoming') ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedPanels.has('upcoming') && (
                <div className="neo-inset rounded-xl p-4">
                  {renderUpcomingEvents()}
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <>
            {/* Weekly Summary Panel */}
            <div className="space-y-3">
              <div className="neo-inset rounded-xl p-4">
                {renderWeeklySummary()}
              </div>
            </div>

            {/* Activity Heatmap Panel */}
            <div className="space-y-3">
              <div className="neo-inset rounded-xl p-4">
                {renderActivityHeatmap()}
              </div>
            </div>

            {/* Quick Stats Panel */}
            <div className="space-y-3">
              <div className="neo-inset rounded-xl p-4">
                {renderQuickStats()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ActionSidebar
