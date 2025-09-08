"use client"

import React, { useState, useEffect } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Calendar, Clock, MapPin, User, Target, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

// Types for the unified event system
export type EventType = 'event' | 'task' | 'goal' | 'milestone'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface UnifiedEvent {
  id: string
  type: EventType
  title: string
  description?: string
  startDateTime: string
  endDateTime?: string
  duration: number // minutes
  priority: Priority
  clientId?: string
  clientName?: string
  location?: string
  notes?: string
  
  // Goal-specific fields
  goalTimeframe?: GoalTimeframe
  progressTarget?: number
  currentProgress?: number
  
  // Milestone-specific fields
  deadline?: string
  dependencies?: string[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

interface EventCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: UnifiedEvent) => void
  initialDate?: Date
  initialTime?: string
  editingEvent?: UnifiedEvent
}

interface FormData {
  type: EventType
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  duration: number
  priority: Priority
  clientId: string
  clientName: string
  location: string
  notes: string
  goalTimeframe: GoalTimeframe
  progressTarget: number
  deadline: string
}

interface FormErrors {
  title?: string
  date?: string
  startTime?: string
  duration?: string
  general?: string
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-light-grey text-dark-grey' },
  { value: 'medium', label: 'Medium', color: 'bg-gold text-dark-grey' },
  { value: 'high', label: 'High', color: 'bg-dark-grey text-white' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-600 text-white' }
]

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: React.ReactNode; defaultDuration: number }[] = [
  { value: 'event', label: 'Event/Appointment', icon: <Calendar className="w-4 h-4" />, defaultDuration: 60 },
  { value: 'task', label: 'Task', icon: <CheckCircle className="w-4 h-4" />, defaultDuration: 30 },
  { value: 'goal', label: 'Goal', icon: <Target className="w-4 h-4" />, defaultDuration: 0 },
  { value: 'milestone', label: 'Milestone', icon: <AlertTriangle className="w-4 h-4" />, defaultDuration: 0 }
]

const GOAL_TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: 'daily', label: 'Daily Goal' },
  { value: 'weekly', label: 'Weekly Goal' },
  { value: 'monthly', label: 'Monthly Goal' },
  { value: 'quarterly', label: 'Quarterly Goal' },
  { value: 'yearly', label: 'Yearly Goal' },
  { value: 'custom', label: 'Custom Timeframe' }
]

// Time generation utilities
const generateTimeOptions = () => {
  const times = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const period = hour < 12 ? 'AM' : 'PM'
      const time12Format = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
      times.push({ value: time24, label: time12Format })
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialTime,
  editingEvent
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: 'event',
    title: '',
    description: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: initialTime || '09:00',
    endTime: '10:00',
    duration: 60,
    priority: 'medium',
    clientId: '',
    clientName: '',
    location: '',
    notes: '',
    goalTimeframe: 'monthly',
    progressTarget: 100,
    deadline: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])

  // Load clients from localStorage
  useEffect(() => {
    try {
      const storedClients = JSON.parse(localStorage.getItem('clients') || '[]')
      setClients(storedClients.map((client: any) => ({ 
        id: client.id, 
        name: client.name || 'Unnamed Client' 
      })))
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }, [])

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      const startDate = parseISO(editingEvent.startDateTime)
      const endDate = editingEvent.endDateTime ? parseISO(editingEvent.endDateTime) : null
      
      setFormData({
        type: editingEvent.type,
        title: editingEvent.title,
        description: editingEvent.description || '',
        date: format(startDate, 'yyyy-MM-dd'),
        startTime: format(startDate, 'HH:mm'),
        endTime: endDate ? format(endDate, 'HH:mm') : format(addMinutes(startDate, editingEvent.duration), 'HH:mm'),
        duration: editingEvent.duration,
        priority: editingEvent.priority,
        clientId: editingEvent.clientId || '',
        clientName: editingEvent.clientName || '',
        location: editingEvent.location || '',
        notes: editingEvent.notes || '',
        goalTimeframe: editingEvent.goalTimeframe || 'monthly',
        progressTarget: editingEvent.progressTarget || 100,
        deadline: editingEvent.deadline || ''
      })
    }
  }, [editingEvent])

  // Update end time and duration when type or start time changes
  useEffect(() => {
    const selectedEventType = EVENT_TYPE_OPTIONS.find(option => option.value === formData.type)
    if (selectedEventType && !editingEvent) {
      const defaultDuration = selectedEventType.defaultDuration
      setFormData(prev => ({
        ...prev,
        duration: defaultDuration,
        endTime: defaultDuration > 0 ? format(addMinutes(parseISO(`${prev.date}T${prev.startTime}`), defaultDuration), 'HH:mm') : prev.endTime
      }))
    }
  }, [formData.type, formData.startTime, editingEvent])

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear specific field errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Calculate duration if both times are set
      if (field === 'startTime' || field === 'endTime') {
        const startDateTime = parseISO(`${prev.date}T${field === 'startTime' ? value : prev.startTime}`)
        const endDateTime = parseISO(`${prev.date}T${field === 'endTime' ? value : prev.endTime}`)
        
        if (endDateTime > startDateTime) {
          newData.duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        }
      }
      
      return newData
    })
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDurationChange = (minutes: number) => {
    setFormData(prev => {
      const startDateTime = parseISO(`${prev.date}T${prev.startTime}`)
      const endDateTime = addMinutes(startDateTime, minutes)
      
      return {
        ...prev,
        duration: minutes,
        endTime: format(endDateTime, 'HH:mm')
      }
    })
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }
    
    if (formData.type !== 'goal' && formData.type !== 'milestone' && formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0'
    }
    
    const startDateTime = parseISO(`${formData.date}T${formData.startTime}`)
    if (formData.endTime) {
      const endDateTime = parseISO(`${formData.date}T${formData.endTime}`)
      if (endDateTime <= startDateTime) {
        newErrors.general = 'End time must be after start time'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const startDateTime = parseISO(`${formData.date}T${formData.startTime}`)
      const endDateTime = formData.endTime ? parseISO(`${formData.date}T${formData.endTime}`) : addMinutes(startDateTime, formData.duration)
      
      const newEvent: UnifiedEvent = {
        id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startDateTime: startDateTime.toISOString(),
        endDateTime: formData.type === 'goal' ? undefined : endDateTime.toISOString(),
        duration: formData.duration,
        priority: formData.priority,
        clientId: formData.clientId || undefined,
        clientName: formData.clientName || undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        goalTimeframe: formData.type === 'goal' ? formData.goalTimeframe : undefined,
        progressTarget: formData.type === 'goal' ? formData.progressTarget : undefined,
        currentProgress: formData.type === 'goal' ? 0 : undefined,
        deadline: formData.type === 'milestone' && formData.deadline ? formData.deadline : undefined,
        createdAt: editingEvent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await onSave(newEvent)
      onClose()
      
      // Reset form for next use
      if (!editingEvent) {
        setFormData({
          type: 'event',
          title: '',
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          priority: 'medium',
          clientId: '',
          clientName: '',
          location: '',
          notes: '',
          goalTimeframe: 'monthly',
          progressTarget: 100,
          deadline: ''
        })
      }
      
    } catch (error) {
      console.error('Error saving event:', error)
      setErrors({ general: 'Failed to save event. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-light-grey"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="border-b border-light-grey pb-4">
          <DialogTitle className="text-xl font-space-grotesk font-semibold uppercase tracking-wide text-dark-grey">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Event Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Event Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('type', option.value)}
                  className={`flex items-center gap-3 p-3 border-2 transition-colors font-space-grotesk ${
                    formData.type === option.value
                      ? 'border-gold bg-gold-light text-dark-grey'
                      : 'border-light-grey bg-white text-medium-grey hover:border-gold'
                  }`}
                >
                  {option.icon}
                  <span className="font-medium uppercase text-xs tracking-wide">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full p-3 border-2 font-space-grotesk ${
                errors.title ? 'border-red-500' : 'border-light-grey focus:border-gold'
              } bg-white`}
              placeholder="Enter event title"
            />
            {errors.title && (
              <p className="text-sm text-red-600 font-space-grotesk">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
              placeholder="Enter event description"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Date *
              </label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={`w-full p-3 border-2 font-space-grotesk ${
                  errors.date ? 'border-red-500' : 'border-light-grey focus:border-gold'
                } bg-white`}
              />
              {errors.date && (
                <p className="text-sm text-red-600 font-space-grotesk">{errors.date}</p>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                {formData.type === 'goal' ? 'Target Date' : 'Start Time'} *
              </label>
              <select
                id="startTime"
                value={formData.startTime}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                className={`w-full p-3 border-2 font-space-grotesk ${
                  errors.startTime ? 'border-red-500' : 'border-light-grey focus:border-gold'
                } bg-white`}
              >
                {TIME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.startTime && (
                <p className="text-sm text-red-600 font-space-grotesk">{errors.startTime}</p>
              )}
            </div>

            {/* End Time / Duration */}
            {formData.type !== 'goal' && formData.type !== 'milestone' && (
              <div className="space-y-2">
                <label htmlFor="endTime" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  End Time
                </label>
                <select
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
                >
                  {TIME_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Duration Display */}
          {formData.type !== 'goal' && formData.type !== 'milestone' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-medium-grey font-space-grotesk">
                <Clock className="w-4 h-4" />
                <span>Duration: {formData.duration} minutes ({Math.floor(formData.duration / 60)}h {formData.duration % 60}m)</span>
              </div>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map(minutes => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => handleDurationChange(minutes)}
                    className="px-3 py-1 text-xs border border-light-grey hover:border-gold text-medium-grey hover:text-dark-grey font-space-grotesk"
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Goal Timeframe (Goals only) */}
          {formData.type === 'goal' && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Goal Timeframe
              </label>
              <select
                value={formData.goalTimeframe}
                onChange={(e) => handleInputChange('goalTimeframe', e.target.value)}
                className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
              >
                {GOAL_TIMEFRAME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Milestone Deadline */}
          {formData.type === 'milestone' && (
            <div className="space-y-2">
              <label htmlFor="deadline" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Deadline
              </label>
              <input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
              />
            </div>
          )}

          {/* Priority and Client Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('priority', option.value)}
                    className={`p-2 text-xs font-space-grotesk font-semibold uppercase tracking-wide transition-colors ${
                      formData.priority === option.value
                        ? option.color
                        : 'bg-light-grey text-medium-grey hover:bg-gold hover:text-dark-grey'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Client (Optional)
              </label>
              {clients.length > 0 ? (
                <select
                  value={formData.clientId}
                  onChange={(e) => {
                    const selectedClient = clients.find(c => c.id === e.target.value)
                    handleInputChange('clientId', e.target.value)
                    handleInputChange('clientName', selectedClient?.name || '')
                  }}
                  className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
              placeholder="Enter location or address"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-semibold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full p-3 border-2 border-light-grey focus:border-gold bg-white font-space-grotesk"
              placeholder="Additional notes or details"
            />
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 font-space-grotesk text-sm">
              {errors.general}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-light-grey">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark-grey border-t-transparent" />
                  Saving...
                </div>
              ) : (
                editingEvent ? 'Update Event' : 'Create Event'
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="text-xs text-medium-grey font-space-grotesk text-center border-t border-light-grey pt-4">
            <span>Keyboard shortcuts: </span>
            <span className="font-semibold">Ctrl+Enter</span> to save, <span className="font-semibold">Esc</span> to cancel
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EventCreationModal