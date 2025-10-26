"use client"

import React, { useState, useEffect } from 'react'
import { 
  format, 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isSameDay,
  getWeek
} from 'date-fns'
import { Calendar, TrendingUp, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'

interface ScheduledService {
  id: string
  title: string
  service: string
  clientName: string
  scheduledDate: string
  priority: string
  status: string
  duration: number
}

interface MonthStats {
  totalEvents: number
  completedEvents: number
  pendingEvents: number
  totalHours: number
}

interface YearViewProps {
  onMonthClick?: (date: Date) => void
  onDayClick?: (date: Date) => void
  onEventCreate?: (date: Date) => void
  refreshTrigger?: number
}

const YearView: React.FC<YearViewProps> = ({ onMonthClick, onDayClick, onEventCreate, refreshTrigger }) => {
  const { state, setSelectedDate, setCurrentView } = useViewManager()
  const { selectedDate } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  
  // Use unified events hook
  const { events: unifiedEvents } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger })

  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      setScheduledServices(services)
    } catch (error) {
      console.error('Error loading year view data:', error)
    }
  }, [])

  const currentYear = selectedDate.getFullYear()
  const yearStart = startOfYear(selectedDate)
  const yearEnd = endOfYear(selectedDate)
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  // Get events for a specific month (including unified events)
  const getEventsForMonth = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    
    const servicesForMonth = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      return serviceDate >= monthStart && serviceDate <= monthEnd
    })

    const unifiedEventsForMonth = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return eventDate >= monthStart && eventDate <= monthEnd
    })

    return [...servicesForMonth, ...unifiedEventsForMonth]
  }

  // Get events for a specific day (including unified events)
  const getEventsForDay = (date: Date) => {
    const servicesForDay = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      return isSameDay(serviceDate, date)
    })

    const unifiedEventsForDay = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return isSameDay(eventDate, date)
    })

    return [...servicesForDay, ...unifiedEventsForDay]
  }

  // Calculate month statistics
  const getMonthStats = (monthDate: Date): MonthStats => {
    const events = getEventsForMonth(monthDate)
    const completed = events.filter(e => e.status?.toLowerCase() === 'completed')
    const pending = events.filter(e => e.status?.toLowerCase() !== 'completed')
    const totalHours = events.reduce((sum, e) => sum + (e.duration || 60), 0) / 60

    return {
      totalEvents: events.length,
      completedEvents: completed.length,
      pendingEvents: pending.length,
      totalHours: Math.round(totalHours * 10) / 10
    }
  }

  // Calculate year statistics (including unified events)
  const getYearStats = () => {
    const serviceEvents = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      return serviceDate.getFullYear() === currentYear
    })

    const yearUnifiedEvents = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime)
      return eventDate.getFullYear() === currentYear
    })

    const allEvents = [...serviceEvents, ...yearUnifiedEvents]
    const completed = allEvents.filter(e => e.status?.toLowerCase() === 'completed')
    const totalHours = allEvents.reduce((sum, e) => sum + (e.duration || 60), 0) / 60
    const uniqueClients = new Set(allEvents.map(e => e.clientName)).size

    return {
      totalEvents: allEvents.length,
      completedEvents: completed.length,
      completionRate: allEvents.length > 0 ? Math.round((completed.length / allEvents.length) * 100) : 0,
      totalHours: Math.round(totalHours * 10) / 10,
      uniqueClients
    }
  }

  const yearStats = getYearStats()

  const handleMonthClick = (monthDate: Date) => {
    setSelectedDate(monthDate)
    setCurrentView('month')
    onMonthClick?.(monthDate)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setCurrentView('day')
    onDayClick?.(date)
  }

  const getEventDensityColor = (eventCount: number) => {
    if (eventCount === 0) return 'bg-tactical-grey-100'
    if (eventCount <= 2) return 'bg-tactical-gold-muted'
    if (eventCount <= 5) return 'bg-tactical-gold-light'
    if (eventCount <= 10) return 'bg-tactical-gold'
    return 'bg-tactical-brown'
  }

  return (
    <div className="space-y-6">
      {/* Year Statistics */}
      <Card>
        <CardHeader className="bg-hud-background-secondary border-b border-hud-border-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-gold" />
              <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                {currentYear} Overview
              </h2>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gold font-primary">
                  {yearStats.totalEvents}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Total Events
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-hud-text-primary font-primary">
                  {yearStats.completionRate}%
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gold font-primary">
                  {yearStats.totalHours}h
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Total Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-hud-text-primary font-primary">
                  {yearStats.uniqueClients}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-primary">
                  Clients
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Monthly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map(month => {
          const monthStats = getMonthStats(month)
          const monthDays = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month)
          })

          return (
            <Card 
              key={month.toISOString()}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleMonthClick(month)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                    {format(month, 'MMMM')}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={monthStats.totalEvents > 0 ? 'bg-tactical-gold text-hud-text-primary' : 'bg-hud-background-secondary text-medium-grey'}
                  >
                    {monthStats.totalEvents}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Mini Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {/* Day headers */}
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="text-xs text-center text-medium-grey font-bold py-1">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {Array.from({ length: 42 }, (_, i) => {
                    const cellDate = new Date(startOfMonth(month))
                    cellDate.setDate(1 - startOfMonth(month).getDay() + i)
                    
                    const isCurrentMonth = isSameMonth(cellDate, month)
                    const isCurrentDay = isToday(cellDate)
                    const dayEvents = isCurrentMonth ? getEventsForDay(cellDate) : []
                    
                    if (!isCurrentMonth && i >= 35 && cellDate.getDate() > 7) {
                      return null // Don't show extra week if not needed
                    }

                    return (
                      <div
                        key={cellDate.toISOString()}
                        className={`
                          aspect-square text-xs rounded cursor-pointer transition-colors flex items-center justify-center relative
                          ${!isCurrentMonth 
                            ? 'text-gray-300' 
                            : isCurrentDay 
                            ? 'bg-tactical-gold text-hud-text-primary font-bold' 
                            : dayEvents.length > 0
                            ? getEventDensityColor(dayEvents.length) + ' text-white'
                            : 'hover:bg-tactical-grey-200'
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isCurrentMonth) {
                            handleDayClick(cellDate)
                          }
                        }}
                        title={isCurrentMonth && dayEvents.length > 0 ? `${dayEvents.length} events` : ''}
                      >
                        {cellDate.getDate()}
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-tactical-gold rounded-full"></div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Month Statistics */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-medium-grey">Events:</span>
                    <span className="font-medium text-hud-text-primary">{monthStats.totalEvents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-medium-grey">Hours:</span>
                    <span className="font-medium text-hud-text-primary">{monthStats.totalHours}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-medium-grey">Completion:</span>
                    <span className="font-medium text-hud-text-primary">
                      {monthStats.totalEvents > 0 
                        ? Math.round((monthStats.completedEvents / monthStats.totalEvents) * 100)
                        : 0
                      }%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader className="bg-hud-background-secondary border-b border-hud-border">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-gold" />
            <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
              Activity Heatmap
            </h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-53 gap-1">
            {Array.from({ length: 365 }, (_, i) => {
              const date = new Date(yearStart)
              date.setDate(date.getDate() + i)
              const dayEvents = getEventsForDay(date)
              
              return (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm cursor-pointer transition-colors hover:scale-110 ${
                    getEventDensityColor(dayEvents.length)
                  }`}
                  title={`${format(date, 'MMM d')}: ${dayEvents.length} events - Click to view/create`}
                  onClick={() => handleDayClick(date)}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (onEventCreate) {
                      onEventCreate(date)
                    }
                  }}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-medium-grey">
            <span>Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-sm bg-tactical-grey-100"></div>
              <div className="w-3 h-3 rounded-sm bg-tactical-gold-muted"></div>
              <div className="w-3 h-3 rounded-sm bg-tactical-gold-light"></div>
              <div className="w-3 h-3 rounded-sm bg-tactical-gold"></div>
              <div className="w-3 h-3 rounded-sm bg-tactical-brown"></div>
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default YearView