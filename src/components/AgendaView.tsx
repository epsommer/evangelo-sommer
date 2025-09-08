"use client"

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, startOfDay, endOfDay } from 'date-fns'
import { Clock, MapPin, User, Calendar, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useViewManager } from '@/contexts/ViewManagerContext'
import { DailyTask } from '@/types/daily-planner'

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
  location?: string
}

interface AgendaItem {
  id: string
  title: string
  type: 'service' | 'task'
  date: Date
  startTime: string
  duration: number
  priority: string
  status: string
  clientName?: string
  location?: string
  notes?: string
  service?: string
}

interface AgendaViewProps {
  onItemClick?: (item: AgendaItem) => void
  viewRange?: 'day' | 'week' | 'month'
}

const AgendaView: React.FC<AgendaViewProps> = ({ onItemClick, viewRange = 'week' }) => {
  const { state } = useViewManager()
  const { selectedDate } = state
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([])
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'high-priority'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]')
      setScheduledServices(services)

      const dailyTasks = JSON.parse(localStorage.getItem('daily-tasks') || '[]')
      setTasks(dailyTasks)
    } catch (error) {
      console.error('Error loading agenda data:', error)
    }
  }, [])

  // Convert services and tasks to unified agenda items
  const getAgendaItems = (): AgendaItem[] => {
    let items: AgendaItem[] = []

    // Get date range based on view
    let startDate: Date, endDate: Date
    
    switch (viewRange) {
      case 'day':
        startDate = startOfDay(selectedDate)
        endDate = endOfDay(selectedDate)
        break
      case 'week':
        startDate = startOfWeek(selectedDate, { weekStartsOn: 0 })
        endDate = endOfWeek(selectedDate, { weekStartsOn: 0 })
        break
      case 'month':
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        break
    }

    // Add scheduled services
    scheduledServices
      .filter(service => {
        const serviceDate = new Date(service.scheduledDate)
        return serviceDate >= startDate && serviceDate <= endDate
      })
      .forEach(service => {
        items.push({
          id: service.id,
          title: service.title || service.service,
          type: 'service',
          date: new Date(service.scheduledDate),
          startTime: format(new Date(service.scheduledDate), 'HH:mm'),
          duration: service.duration || 60,
          priority: service.priority,
          status: service.status,
          clientName: service.clientName,
          location: `${service.clientName}'s Property`,
          notes: service.notes,
          service: service.service
        })
      })

    // Add tasks
    tasks
      .filter(task => {
        const taskDate = new Date(task.startTime || task.date)
        return taskDate >= startDate && taskDate <= endDate
      })
      .forEach(task => {
        items.push({
          id: task.id,
          title: task.title,
          type: 'task',
          date: new Date(task.startTime || task.date),
          startTime: format(new Date(task.startTime || task.date), 'HH:mm'),
          duration: task.estimatedDuration || 60,
          priority: task.priority,
          status: task.status,
          location: task.location,
          notes: task.notes
        })
      })

    // Apply filters
    if (filter !== 'all') {
      items = items.filter(item => {
        switch (filter) {
          case 'pending':
            return item.status !== 'completed' && item.status !== 'cancelled'
          case 'completed':
            return item.status === 'completed'
          case 'high-priority':
            return item.priority === 'high' || item.priority === 'urgent'
          default:
            return true
        }
      })
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.clientName?.toLowerCase().includes(term) ||
        item.service?.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term)
      )
    }

    // Sort by date and time
    return items.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime()
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
  }

  const agendaItems = getAgendaItems()

  // Group items by date
  const groupedItems = agendaItems.reduce((groups, item) => {
    const dateKey = format(item.date, 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(item)
    return groups
  }, {} as Record<string, AgendaItem[]>)

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

  const getTypeIcon = (type: string) => {
    return type === 'service' ? Calendar : Clock
  }

  return (
    <div className="space-y-6">
      {/* Agenda Header */}
      <Card>
        <CardHeader className="bg-off-white border-b-2 border-gold">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-2">
                Agenda View
              </h2>
              <p className="text-medium-grey font-medium font-space-grotesk uppercase tracking-wider text-sm">
                {viewRange === 'day' ? format(selectedDate, 'EEEE, MMMM do, yyyy') :
                 viewRange === 'week' ? `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(endOfWeek(selectedDate), 'MMM d, yyyy')}` :
                 format(selectedDate, 'MMMM yyyy')}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                <input
                  type="text"
                  placeholder="Search agenda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-light-grey rounded-md focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold text-sm"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-medium-grey" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-light-grey rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                >
                  <option value="all">All Items</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="high-priority">High Priority</option>
                </select>
              </div>

              {/* Stats */}
              <div className="text-center">
                <div className="text-lg font-bold text-gold font-space-grotesk">
                  {agendaItems.length}
                </div>
                <div className="text-xs uppercase tracking-wider text-medium-grey font-space-grotesk">
                  Items
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Agenda Items */}
      <div className="space-y-6">
        {Object.keys(groupedItems).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-medium-grey" />
              <p className="text-lg font-medium uppercase tracking-wide text-medium-grey">
                No Items Found
              </p>
              <p className="text-sm mt-2 text-medium-grey">
                {filter !== 'all' || searchTerm ? 'Try adjusting your filters or search term' : 'No events scheduled for this period'}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedItems).map(([dateKey, items]) => {
            const date = new Date(dateKey)
            const isCurrentDay = isToday(date)

            return (
              <Card key={dateKey} className={isCurrentDay ? 'ring-2 ring-gold' : ''}>
                <CardHeader className={`${isCurrentDay ? 'bg-gold-light' : 'bg-light-grey'} border-b border-light-grey`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                      {format(date, 'EEEE, MMMM do')}
                      {isCurrentDay && (
                        <Badge className="ml-3 bg-gold text-dark-grey">TODAY</Badge>
                      )}
                    </h3>
                    <div className="flex items-center space-x-4">
                      {/* Quick Add Event for this day */}
                      {onAddEvent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddEvent()
                          }}
                          className="border-gold text-gold hover:bg-gold hover:text-dark-grey text-xs"
                          title="Add event for this day"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Event
                        </Button>
                      )}
                      <Badge variant="outline" className="bg-white">
                        {items.length} items
                      </Badge>
                      <Badge variant="outline" className="bg-white">
                        {Math.round(items.reduce((sum, item) => sum + item.duration, 0) / 60 * 10) / 10}h total
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="divide-y divide-light-grey">
                    {items.map((item, index) => {
                      const TypeIcon = getTypeIcon(item.type)
                      
                      return (
                        <div
                          key={item.id}
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-gold"
                          onClick={() => onItemClick?.(item)}
                        >
                          <div className="flex items-start space-x-4">
                            {/* Time */}
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-bold text-dark-grey font-space-grotesk">
                                {item.startTime}
                              </div>
                              <div className="text-xs text-medium-grey font-space-grotesk">
                                {item.duration}min
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <TypeIcon className="h-4 w-4 text-gold" />
                                    <h4 className="font-bold text-dark-grey font-space-grotesk">
                                      {item.title}
                                    </h4>
                                    <Badge className={`px-2 py-1 text-xs font-bold uppercase ${getPriorityColor(item.priority)}`}>
                                      {item.priority?.toUpperCase() || 'MEDIUM'}
                                    </Badge>
                                    {item.type === 'service' && (
                                      <Badge variant="outline" className="text-xs text-medium-grey uppercase">
                                        {item.service?.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-4 text-sm text-medium-grey font-space-grotesk mb-2">
                                    {item.clientName && (
                                      <span className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {item.clientName}
                                      </span>
                                    )}
                                    {item.location && (
                                      <span className="flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {item.location}
                                      </span>
                                    )}
                                  </div>

                                  {item.notes && (
                                    <p className="text-sm text-medium-grey font-space-grotesk mt-2">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                  <div 
                                    className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}
                                    title={item.status}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="px-3 py-1 text-xs font-bold uppercase border-gold text-gold hover:bg-gold hover:text-dark-grey"
                                  >
                                    View
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AgendaView