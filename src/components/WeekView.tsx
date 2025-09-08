"use client"

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { DailyTask } from '@/types/daily-planner'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'

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

interface WeekViewProps {
  onTaskClick?: (task: DailyTask | ScheduledService) => void
  onTimeSlotClick?: (date: Date, hour: number) => void
  enableEventCreation?: boolean
}

const WeekView: React.FC<WeekViewProps> = ({ onTaskClick, onTimeSlotClick, enableEventCreation = true }) => {
  const { state } = useViewManager()
  const { selectedDate, workingHours, displaySettings } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  
  // Use unified events hook
  const {
    events: unifiedEvents,
    createEvent,
    updateEvent,
    getEventsForDate
  } = useUnifiedEvents({ syncWithLegacy: true })

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
  }, [])
  
  // Event creation handlers
  const handleTimeSlotClick = (date: Date, hour: number) => {
    if (enableEventCreation) {
      setModalInitialDate(date)
      setModalInitialTime(`${hour.toString().padStart(2, '0')}:00`)
      setEditingEvent(null)
      setShowEventModal(true)
    }
    if (onTimeSlotClick) {
      onTimeSlotClick(date, hour)
    }
  }
  
  const handleEventCreate = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      setShowEventModal(false)
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }
  
  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  // Generate week days starting from Sunday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Generate time slots based on working hours
  const startHour = parseInt(workingHours.start.split(':')[0])
  const endHour = parseInt(workingHours.end.split(':')[0])
  const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  // Get events for a specific day and hour
  const getEventsForSlot = (date: Date, hour: number) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const servicesForSlot = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate)
      const serviceHour = serviceDate.getHours()
      return isSameDay(serviceDate, date) && serviceHour === hour
    })

    const tasksForSlot = tasks.filter(task => {
      const taskDate = new Date(task.startTime || task.date)
      const taskHour = taskDate.getHours()
      return isSameDay(taskDate, date) && taskHour === hour
    })

    return [...servicesForSlot, ...tasksForSlot]
  }

  const formatTimeSlot = (hour: number) => {
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const period = hour >= 12 ? 'PM' : 'AM'
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
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600'
      case 'in_progress':
      case 'in-progress':
        return 'bg-gold'
      case 'cancelled':
        return 'bg-red-600'
      default:
        return 'bg-medium-grey'
    }
  }

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <Card>
        <CardContent className="p-0">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-0 border-b">
            {/* Time column header */}
            <div className="p-2 md:p-4 bg-light-grey border-r">
              <span className="text-xs md:text-sm font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                Time
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
                  className={`p-2 md:p-4 border-r text-center ${
                    isCurrentDay ? 'bg-gold-light' : 'bg-light-grey'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                      {dayName}
                    </div>
                    <div className={`text-sm md:text-lg font-bold ${
                      isCurrentDay 
                        ? 'bg-gold text-dark-grey rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center mx-auto' 
                        : 'text-dark-grey'
                    }`}>
                      {dayOfMonth}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time Grid */}
          {timeSlots.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-0 border-b min-h-[60px] md:min-h-[80px]">
              {/* Time Label */}
              <div className="p-2 md:p-3 bg-light-grey border-r flex items-start">
                <div className="text-center w-full">
                  <div className="text-xs md:text-sm font-bold text-medium-grey font-space-grotesk">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="text-xs text-medium-grey font-space-grotesk hidden md:block">
                    {formatTimeSlot(hour).split(' ')[1]}
                  </div>
                </div>
              </div>

              {/* Day Columns */}
              {weekDays.map(day => {
                const events = getEventsForSlot(day, hour)
                const isCurrentDay = isToday(day)
                
                return (
                  <div 
                    key={`${day.toISOString()}-${hour}`}
                    className={`p-1 md:p-2 border-r min-h-[60px] md:min-h-[80px] cursor-pointer transition-colors group ${
                      isCurrentDay ? 'bg-gold-light hover:bg-gold' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    <div className="space-y-1">
                      {events.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 md:p-2 rounded border cursor-pointer hover:shadow-sm transition-all ${
                            getPriorityColor(event.priority)
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onTaskClick?.(event)
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium truncate text-xs">
                              {(event.title || event.service).length > 12 
                                ? (event.title || event.service).substring(0, 12) + '...'
                                : (event.title || event.service)
                              }
                            </div>
                            <div 
                              className={`w-2 h-2 rounded-full ${getStatusColor(event.status)}`}
                              title={event.status}
                            />
                          </div>
                          <div className="text-xs opacity-75 truncate hidden md:block">
                            {event.clientName || 'No client'}
                          </div>
                          {event.duration && (
                            <div className="text-xs opacity-60 flex items-center mt-1 hidden md:flex">
                              <Clock className="h-3 w-3 mr-1" />
                              {event.duration}min
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {events.length > 2 && (
                        <div className="text-xs text-medium-grey text-center py-1">
                          +{events.length - 2} more
                        </div>
                      )}
                      
                      {events.length === 0 && onTimeSlotClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-full opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Week Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Week Summary
            </h3>
            <div className="flex items-center space-x-4">
              {weekDays.map(day => {
                const dayEvents = scheduledServices.filter(service => {
                  const serviceDate = new Date(service.scheduledDate)
                  return isSameDay(serviceDate, day)
                })
                
                return (
                  <div key={day.toISOString()} className="text-center">
                    <div className="text-xs uppercase tracking-wider text-medium-grey font-space-grotesk">
                      {format(day, 'EEE')}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`mt-1 ${dayEvents.length > 0 ? 'bg-gold text-dark-grey' : 'bg-light-grey text-medium-grey'}`}
                    >
                      {dayEvents.length}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Event Creation Modal */}
      {enableEventCreation && (
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
          onSave={handleEventCreate}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          editingEvent={editingEvent || undefined}
        />
      )}
    </div>
  )
}

export default WeekView