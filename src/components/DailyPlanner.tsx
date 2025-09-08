"use client"

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus, Clock, MapPin, User, Edit, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DailyTask, PRIORITY_CONFIGS, STATUS_CONFIGS } from '@/types/daily-planner'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { 
  mockTasks, 
  calculatePlannerStats, 
  getTasksForDate, 
  updateTaskStatus,
  formatTime,
  formatDuration,
  getPriorityColorClass,
  getStatusColorClass,
  sortTasksByTime
} from '@/lib/daily-planner'

interface DailyPlannerProps {
  date?: Date
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ date = new Date() }) => {
  const [tasks, setTasks] = useState<DailyTask[]>(mockTasks)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null)
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:00')
  
  // Use the unified events hook
  const { 
    events, 
    createEvent, 
    updateEvent, 
    getEventsForDate, 
    isLoading: eventsLoading 
  } = useUnifiedEvents({ syncWithLegacy: true })

  // Load scheduled services from localStorage and convert to tasks
  useEffect(() => {
    try {
      const scheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const scheduleTasks = scheduledServices.map((schedule: any) => ({
        id: schedule.id,
        title: schedule.title || `${schedule.service} - ${schedule.clientName}`,
        description: schedule.notes || `Scheduled ${schedule.service.toLowerCase()} service`,
        date: schedule.scheduledDate.split('T')[0],
        startTime: schedule.scheduledDate.split('T')[1]?.substring(0, 5) || '09:00',
        duration: schedule.duration || 60,
        priority: schedule.priority?.toLowerCase() || 'medium',
        status: schedule.status?.toLowerCase() || 'pending',
        category: 'service',
        location: `${schedule.clientName}'s Property`,
        client: schedule.clientName
      }));
      
      // Combine with existing mock tasks
      setTasks([...mockTasks, ...scheduleTasks]);
      console.log('📅 Loaded scheduled services into planner:', scheduleTasks);
    } catch (error) {
      console.error('Error loading scheduled services:', error);
      setTasks(mockTasks);
    }
  }, []);

  // Get today's tasks from both legacy tasks and unified events
  const todaysTasks = getTasksForDate(tasks, date)
  const todaysEvents = getEventsForDate(date)
  const combinedTasks = [...todaysTasks]
  
  // Convert unified events to display format for consistency
  todaysEvents.forEach(event => {
    const eventAsTask = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      date: format(new Date(event.startDateTime), 'yyyy-MM-dd'),
      startTime: format(new Date(event.startDateTime), 'HH:mm'),
      duration: event.duration,
      priority: event.priority,
      status: 'pending' as const,
      category: event.type,
      location: event.location || '',
      client: event.clientName || ''
    }
    combinedTasks.push(eventAsTask)
  })
  
  const sortedTasks = sortTasksByTime(combinedTasks)
  const stats = calculatePlannerStats(combinedTasks)

  const handleStatusChange = (taskId: string, status: DailyTask['status']) => {
    setTasks(prevTasks => updateTaskStatus(prevTasks, taskId, status))
  }
  
  // Handle creating new unified events with time slot context
  const handleCreateEvent = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      console.log('✅ Event created:', eventData.title)
    } catch (error) {
      console.error('❌ Error creating event:', error)
    }
  }
  
  // Handle time slot clicks
  const handleTimeSlotClick = (hour: number) => {
    const timeString = `${hour.toString().padStart(2, '0')}:00`
    setEditingEvent(null)
    setShowEventModal(true)
    // The modal will use the date prop and we can enhance it to accept initial time
  }
  
  // Handle editing events
  const handleEditEvent = (task: any) => {
    // Find if this is a unified event
    const unifiedEvent = events.find(e => e.id === task.id)
    if (unifiedEvent) {
      setEditingEvent(unifiedEvent)
      setShowEventModal(true)
    } else {
      // Handle legacy task editing (placeholder for now)
      console.log('Editing legacy task:', task)
    }
  }

  return (
    <>
    <div className="space-y-6">
      {/* Planner Header */}
      <div className="bg-off-white p-6 border-b-2 border-gold">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
              DAILY PLANNER
            </h2>
            <p className="text-medium-grey font-medium font-space-grotesk uppercase tracking-wider text-sm">
              {format(date, 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gold font-space-grotesk">
                {stats.completedTasks}
              </div>
              <div className="text-xs uppercase tracking-wider text-medium-grey font-space-grotesk">
                COMPLETED
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
                {stats.totalTasks}
              </div>
              <div className="text-xs uppercase tracking-wider text-medium-grey font-space-grotesk">
                TOTAL TASKS
              </div>
            </div>
            
            <Button 
              className="bg-gold text-dark-grey px-6 py-3 font-bold uppercase tracking-wide hover:bg-gold-light"
              onClick={() => {
                setSelectedTimeSlot('09:00') // Reset to default time
                setEditingEvent(null)
                setShowEventModal(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD EVENT
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm font-medium text-medium-grey mb-2 font-space-grotesk">
            <span className="uppercase tracking-wide">DAILY PROGRESS</span>
            <span>{Math.round(stats.completionRate)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Task Timeline */}
      <div className="grid grid-cols-12 gap-6 px-6">
        {/* Time Column */}
        <div className="col-span-2 space-y-6">
          {Array.from({ length: 13 }, (_, i) => {
            const hour = i + 7 // Start at 7 AM
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
            const period = hour >= 12 ? 'PM' : 'AM'
            
            return (
              <div 
                key={hour} 
                className="text-right cursor-pointer hover:bg-gold-light transition-colors p-2 rounded group"
                onClick={() => {
                  const timeString = `${hour.toString().padStart(2, '0')}:00`
                  setSelectedTimeSlot(timeString)
                  setEditingEvent(null)
                  setShowEventModal(true)
                }}
                title="Click to create event at this time"
              >
                <div className="text-sm font-bold text-medium-grey font-space-grotesk group-hover:text-dark-grey">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="text-xs text-medium-grey font-space-grotesk group-hover:text-dark-grey">
                  {displayHour} {period}
                </div>
                {/* Add event indicator on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gold font-bold mt-1">
                  + Add Event
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Tasks Column */}
        <div className="col-span-10 space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-medium-grey font-space-grotesk">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium uppercase tracking-wide">NO TASKS SCHEDULED</p>
                <p className="text-sm mt-2">Add your first task to get started</p>
              </div>
            </div>
          ) : (
            sortedTasks.map(task => (
              <TaskBlock 
                key={task.id} 
                task={task} 
                onEdit={handleEditEvent}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
    
    {/* Event Creation Modal */}
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
    </>
  )
}

interface TaskBlockProps {
  task: DailyTask
  onEdit: (task: DailyTask) => void
  onStatusChange: (taskId: string, status: DailyTask['status']) => void
}

const TaskBlock: React.FC<TaskBlockProps> = ({ task, onEdit, onStatusChange }) => {
  const priorityConfig = PRIORITY_CONFIGS[task.priority]
  const statusConfig = STATUS_CONFIGS[task.status]

  return (
    <Card className={`border-l-4 ${getStatusColorClass(task.status)} hover:bg-off-white transition-colors cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-bold text-dark-grey font-space-grotesk">{task.title}</h4>
              <Badge className={`px-2 py-1 text-xs font-bold text-white uppercase ${getPriorityColorClass(task.priority)}`}>
                {priorityConfig.label}
              </Badge>
              {task.serviceType && (
                <Badge variant="outline" className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                  {task.serviceType.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-medium-grey font-space-grotesk mb-2">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(task.startTime)} - {formatTime(task.endTime)}
              </span>
              {task.location && (
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {task.location}
                </span>
              )}
              {task.clientId && (
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Client
                </span>
              )}
            </div>
            
            {task.description && (
              <p className="text-sm text-medium-grey font-space-grotesk">{task.description}</p>
            )}
            
            {task.notes && (
              <p className="text-xs text-medium-grey font-space-grotesk mt-2 italic">
                Note: {task.notes}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              className="px-3 py-1 text-xs font-bold uppercase border-gold text-gold hover:bg-gold hover:text-dark-grey"
              onClick={() => onEdit(task)}
            >
              <Edit className="h-3 w-3 mr-1" />
              EDIT
            </Button>
            
            {task.status === 'completed' ? (
              <Button
                size="sm"
                className="px-3 py-1 text-xs font-bold uppercase bg-green-600 text-white hover:bg-green-700"
                onClick={() => onStatusChange(task.id, 'pending')}
              >
                <Check className="h-3 w-3 mr-1" />
                COMPLETED
              </Button>
            ) : (
              <Button
                size="sm"
                className="px-3 py-1 text-xs font-bold uppercase bg-gold text-dark-grey hover:bg-gold-light"
                onClick={() => onStatusChange(task.id, 'completed')}
              >
                <Check className="h-3 w-3 mr-1" />
                MARK DONE
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DailyPlanner
