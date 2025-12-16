"use client"

import React, { useState, useEffect, useRef } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Calendar, Clock, MapPin, User, Target, CheckCircle, AlertTriangle, Bell, Plus, X, Repeat } from 'lucide-react'
import ClientSelector, { Client } from '@/components/ClientSelector'
import {
  UnifiedEvent,
  EventType,
  Priority,
  GoalTimeframe,
  NotificationRule,
  NotificationTrigger,
  RecurrenceFrequency,
  RecurrenceInterval,
  PRESET_NOTIFICATIONS
} from '@/components/EventCreationModal'

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
  notifications: NotificationRule[]
  isAllDay: boolean
  isMultiDay: boolean
  endDate: string
  isRecurring: boolean
  recurrenceFrequency: RecurrenceFrequency
  recurrenceInterval: number
  recurrenceIntervalType: RecurrenceInterval
  recurrenceEndDate: string
  recurrenceOccurrences: number
  participants: string[]
}

interface FormErrors {
  title?: string
  date?: string
  startTime?: string
  duration?: string
  clientName?: string
  general?: string
}

const PRIORITY_OPTIONS: { value: Priority; label: string; borderColor: string; hoverBorder: string; activeStyles: string }[] = [
  { value: 'low', label: 'Low', borderColor: 'border-green-500', hoverBorder: 'hover:border-green-500/50', activeStyles: 'neo-button-active !bg-green-500/90 !text-white !shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]' },
  { value: 'medium', label: 'Medium', borderColor: 'border-yellow-500', hoverBorder: 'hover:border-yellow-500/50', activeStyles: 'neo-button-active !bg-yellow-500/90 !text-white !shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]' },
  { value: 'high', label: 'High', borderColor: 'border-orange-500', hoverBorder: 'hover:border-orange-500/50', activeStyles: 'neo-button-active !bg-orange-500/90 !text-white !shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]' },
  { value: 'urgent', label: 'Urgent', borderColor: 'border-red-500', hoverBorder: 'hover:border-red-500/50', activeStyles: 'neo-button-active !bg-red-500/90 !text-white !shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.1)]' }
]

const EVENT_TYPE_OPTIONS: { value: EventType; label: string; icon: React.ReactNode; defaultDuration: number }[] = [
  { value: 'event', label: 'Event', icon: <Calendar className="w-4 h-4" />, defaultDuration: 15 },
  { value: 'task', label: 'Task', icon: <CheckCircle className="w-4 h-4" />, defaultDuration: 15 },
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

interface EventCreationFormProps {
  onSave: (event: UnifiedEvent) => void
  onCancel: () => void
  initialDate?: Date
  initialTime?: string
  initialDuration?: number // Initial duration in minutes (from placeholder drag)
  initialEndDate?: string // End date for multi-day events (from placeholder drag)
  initialEndHour?: number // End hour for multi-day events (from placeholder drag)
  editingEvent?: UnifiedEvent
  initialClientId?: string
  initialClientName?: string
  onFormChange?: (data: { title?: string; date?: string; startTime?: string; duration?: number }) => void
}

const EventCreationForm: React.FC<EventCreationFormProps> = ({
  onSave,
  onCancel,
  initialDate,
  initialTime,
  initialDuration,
  initialEndDate,
  initialEndHour,
  editingEvent,
  initialClientId,
  initialClientName,
  onFormChange
}) => {
  // Calculate initial values
  const effectiveStartTime = initialTime || '09:00'
  const effectiveDuration = initialDuration || 15 // Default 15 minutes for compact events
  const effectiveDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd')
  const effectiveEndTime = format(addMinutes(new Date(`${effectiveDate}T${effectiveStartTime}`), effectiveDuration), 'HH:mm')

  const [formData, setFormData] = useState<FormData>({
    type: 'event',
    title: '',
    description: '',
    date: effectiveDate,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    duration: effectiveDuration,
    priority: 'medium',
    clientId: '',
    clientName: '',
    location: '',
    notes: '',
    goalTimeframe: 'monthly',
    progressTarget: 100,
    deadline: '',
    notifications: [{ id: '1', value: 15, trigger: 'minutes', enabled: true }],
    isAllDay: false,
    isMultiDay: false,
    endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : format((() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(), 'yyyy-MM-dd'),
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceIntervalType: 'weeks',
    recurrenceEndDate: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    recurrenceOccurrences: 10,
    participants: []
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])

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

  // Track whether we've done the initial sync from props
  // Sync date/time/client on prop changes
  useEffect(() => {
    if (!editingEvent && (initialTime || initialDate || initialClientId)) {
      setFormData(prev => {
        const newDate = initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.date
        const newStartTime = initialTime || prev.startTime
        const newEndTime = format(addMinutes(new Date(`${newDate}T${newStartTime}`), prev.duration), 'HH:mm')

        return {
          ...prev,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          endDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.endDate,
          clientId: initialClientId || prev.clientId,
          clientName: initialClientName || prev.clientName,
        }
      })
    }
  }, [initialTime, initialDate, initialClientId, initialClientName, editingEvent])

  // Track the last initialDuration we processed to prevent infinite loops
  const lastInitialDurationRef = useRef<number | undefined>(initialDuration)
  // Flag to indicate we're syncing from props (should not trigger onFormChange)
  const isSyncingFromPropsRef = useRef(false)

  // Sync duration from placeholder drag (separate effect to avoid complex dependencies)
  // This allows the placeholder's duration to update the form during drag creation
  useEffect(() => {
    // Only process if initialDuration actually changed from the parent
    if (!editingEvent && initialDuration !== undefined && initialDuration !== lastInitialDurationRef.current) {
      lastInitialDurationRef.current = initialDuration

      // Mark that we're syncing from props - onFormChange should not fire
      isSyncingFromPropsRef.current = true

      setFormData(prev => {
        // Skip if form already has this duration (prevents loops)
        if (prev.duration === initialDuration) {
          return prev
        }
        const newEndTime = format(addMinutes(new Date(`${prev.date}T${prev.startTime}`), initialDuration), 'HH:mm')
        return {
          ...prev,
          duration: initialDuration,
          endTime: newEndTime
        }
      })

      // Reset flag after a microtask to allow the state update to complete
      Promise.resolve().then(() => {
        isSyncingFromPropsRef.current = false
      })
    }
  }, [initialDuration, editingEvent])

  // Sync multi-day state from placeholder drag
  // When the placeholder spans multiple days, update the form's isMultiDay and endDate
  useEffect(() => {
    if (!editingEvent && initialEndDate) {
      const startDateStr = initialDate ? format(initialDate, 'yyyy-MM-dd') : formData.date
      const isMultiDay = initialEndDate !== startDateStr

      if (isMultiDay) {
        setFormData(prev => {
          // Calculate end time from endHour if provided
          const newEndTime = initialEndHour !== undefined
            ? `${initialEndHour.toString().padStart(2, '0')}:00`
            : prev.endTime

          return {
            ...prev,
            isMultiDay: true,
            endDate: initialEndDate,
            endTime: newEndTime
          }
        })
      }
    }
  }, [initialEndDate, initialEndHour, initialDate, editingEvent]) // Don't include formData to avoid loops

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
        deadline: editingEvent.deadline || '',
        notifications: editingEvent.notifications || [{ id: '1', value: 15, trigger: 'minutes', enabled: true }],
        isAllDay: editingEvent.isAllDay || false,
        isMultiDay: editingEvent.isMultiDay || false,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd'),
        isRecurring: editingEvent.isRecurring || false,
        recurrenceFrequency: editingEvent.recurrence?.frequency || 'weekly',
        recurrenceInterval: editingEvent.recurrence?.interval || 1,
        recurrenceIntervalType: editingEvent.recurrence?.intervalType || 'weeks',
        recurrenceEndDate: editingEvent.recurrence?.endDate || format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        recurrenceOccurrences: editingEvent.recurrence?.occurrences || 10,
        participants: editingEvent.participants || []
      })
    }
  }, [editingEvent])

  // Track last emitted values to prevent unnecessary parent updates
  const lastEmittedRef = useRef<{ title?: string; date?: string; startTime?: string; duration?: number }>({})

  // Notify parent of form changes for placeholder updates
  useEffect(() => {
    // Skip if we're syncing from props (prevents circular updates)
    if (isSyncingFromPropsRef.current) {
      return
    }

    if (onFormChange) {
      const newData = {
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        duration: formData.duration
      }
      // Only call if values actually changed
      if (
        newData.title !== lastEmittedRef.current.title ||
        newData.date !== lastEmittedRef.current.date ||
        newData.startTime !== lastEmittedRef.current.startTime ||
        newData.duration !== lastEmittedRef.current.duration
      ) {
        lastEmittedRef.current = newData
        onFormChange(newData)
      }
    }
  }, [formData.title, formData.date, formData.startTime, formData.duration, onFormChange])

  // Track if we should use the event type's default duration
  // Skip if initialDuration was provided (from placeholder drag or double-click)
  const hasInitialDurationRef = useRef(!!initialDuration)

  useEffect(() => {
    const selectedEventType = EVENT_TYPE_OPTIONS.find(option => option.value === formData.type)
    if (selectedEventType && !editingEvent) {
      // Don't override if initialDuration was provided on mount
      if (hasInitialDurationRef.current) {
        hasInitialDurationRef.current = false // Only skip once
        return
      }
      const defaultDuration = selectedEventType.defaultDuration
      setFormData(prev => ({
        ...prev,
        duration: defaultDuration,
        endTime: defaultDuration > 0 ? format(addMinutes(new Date(`${prev.date}T${prev.startTime}`), defaultDuration), 'HH:mm') : prev.endTime
      }))
    }
  }, [formData.type, formData.startTime, editingEvent])

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      if (field === 'startTime' || field === 'endTime') {
        const startDateTime = new Date(`${prev.date}T${field === 'startTime' ? value : prev.startTime}`)
        const endDateTime = new Date(`${prev.date}T${field === 'endTime' ? value : prev.endTime}`)

        if (endDateTime > startDateTime) {
          newData.duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        }
      }

      return newData
    })

    if ((errors as any)[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDurationChange = (minutes: number) => {
    setFormData(prev => {
      const startDateTime = new Date(`${prev.date}T${prev.startTime}`)
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

    // Client is optional - events can be created without a client

    if (formData.type !== 'goal' && formData.type !== 'milestone' && formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0'
    }

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`)
    if (formData.endTime) {
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`)
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
      const startDateTime = formData.isAllDay
        ? new Date(`${formData.date}T00:00:00`)
        : new Date(`${formData.date}T${formData.startTime}`)

      let endDateTime: Date

      if (formData.isAllDay) {
        const endDateStr = formData.isMultiDay ? formData.endDate : formData.date
        endDateTime = new Date(`${endDateStr}T23:59:59`)
      } else if (formData.isMultiDay) {
        endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      } else {
        endDateTime = formData.endTime ? new Date(`${formData.date}T${formData.endTime}`) : addMinutes(startDateTime, formData.duration)
      }

      const filteredParticipants = formData.participants.filter(p => p.trim() !== '')

      const newEvent: UnifiedEvent = {
        id: editingEvent?.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startDateTime: `${formData.date}T${formData.startTime}:00`,
        endDateTime: formData.type === 'goal' ? undefined : (formData.isMultiDay ? `${formData.endDate}T${formData.endTime}:00` : `${formData.date}T${formData.endTime}:00`),
        duration: formData.duration,
        priority: formData.priority,
        clientId: formData.clientId || undefined,
        clientName: formData.clientName || undefined,
        participants: filteredParticipants.length > 0 ? filteredParticipants : undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        goalTimeframe: formData.type === 'goal' ? formData.goalTimeframe : undefined,
        progressTarget: formData.type === 'goal' ? formData.progressTarget : undefined,
        currentProgress: formData.type === 'goal' ? 0 : undefined,
        deadline: formData.type === 'milestone' && formData.deadline ? formData.deadline : undefined,
        notifications: formData.notifications.length > 0 ? formData.notifications : undefined,
        isAllDay: formData.isAllDay,
        isMultiDay: formData.isMultiDay,
        isRecurring: formData.isRecurring,
        recurrence: formData.isRecurring ? {
          frequency: formData.recurrenceFrequency,
          interval: formData.recurrenceInterval,
          intervalType: formData.recurrenceFrequency === 'custom' ? formData.recurrenceIntervalType : undefined,
          endDate: formData.recurrenceEndDate,
          occurrences: formData.recurrenceOccurrences
        } : undefined,
        createdAt: editingEvent?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await onSave(newEvent)
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
      onCancel()
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
      {/* Event Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Event Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('type', option.value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg font-primary text-sm transition-all ${
                formData.type === option.value
                  ? 'neo-button-active'
                  : 'neo-button'
              }`}
            >
              {option.icon}
              <span className="font-medium uppercase tracking-wide">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] ${
            errors.title ? 'ring-2 ring-red-500' : ''
          }`}
          placeholder="Enter event title"
        />
        {errors.title && (
          <p className="text-sm text-red-500 font-primary">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] resize-none"
          placeholder="Enter event description"
        />
      </div>

      {/* Date and Time Row */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            Date *
          </label>
          <input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className={`neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] ${
              errors.date ? 'ring-2 ring-red-500' : ''
            }`}
          />
          {errors.date && (
            <p className="text-sm text-red-500 font-primary">{errors.date}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="startTime" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            {formData.type === 'goal' ? 'Target Date' : 'Start Time'} *
          </label>
          <select
            id="startTime"
            value={formData.startTime}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className={`neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] ${
              errors.startTime ? 'ring-2 ring-red-500' : ''
            }`}
          >
            {TIME_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.startTime && (
            <p className="text-sm text-red-500 font-primary">{errors.startTime}</p>
          )}
        </div>

        {formData.type !== 'goal' && formData.type !== 'milestone' && (
          <div className="space-y-2">
            <label htmlFor="endTime" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              End Time
            </label>
            <select
              id="endTime"
              value={formData.endTime}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
              className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)]"
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--neomorphic-text)] opacity-70 font-primary">
            <Clock className="w-4 h-4" />
            <span>Duration: {formData.duration} minutes ({Math.floor(formData.duration / 60)}h {formData.duration % 60}m)</span>
          </div>
          <div className="flex gap-2">
            {[30, 60, 90, 120].map(minutes => (
              <button
                key={minutes}
                type="button"
                onClick={() => handleDurationChange(minutes)}
                className={`neo-button px-3 py-1 text-xs font-primary rounded-lg ${
                  formData.duration === minutes ? 'neo-button-active' : ''
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Priority
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleInputChange('priority', option.value)}
              className={`p-2 text-xs font-primary font-semibold uppercase tracking-wide rounded-lg transition-all border-2 ${
                formData.priority === option.value
                  ? `${option.activeStyles} ${option.borderColor}`
                  : `neo-button border-transparent ${option.hoverBorder}`
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Client (Optional)
        </label>
        <ClientSelector
          selectedClientId={formData.clientId}
          selectedClientName={formData.clientName}
          onClientSelect={(client, isNonClient) => {
            if (client) {
              handleInputChange('clientId', isNonClient ? '' : client.id)
              handleInputChange('clientName', client.name)
            } else {
              handleInputChange('clientId', '')
              handleInputChange('clientName', '')
            }
          }}
          onCreateClient={async (clientData) => {
            const newClient: Client = {
              ...clientData,
              id: `client-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

            try {
              const existingClients = JSON.parse(localStorage.getItem('clients') || '[]')
              const updatedClients = [...existingClients, newClient]
              localStorage.setItem('clients', JSON.stringify(updatedClients))
              setClients(updatedClients.map(c => ({ id: c.id, name: c.name })))
              return newClient
            } catch (error) {
              console.error('Error creating client:', error)
              throw new Error('Failed to create client')
            }
          }}
          placeholder="Search for a client or enter name"
          allowNonClient={true}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label htmlFor="location" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          <MapPin className="inline w-4 h-4 mr-1" />
          Location
        </label>
        <input
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)]"
          placeholder="Enter location or address"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] resize-none"
          placeholder="Additional notes or details"
        />
      </div>

      {/* Error Display */}
      {errors.general && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-600 font-primary text-sm">
          {errors.general}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--neomorphic-dark-shadow)]">
        <div className="text-xs text-[var(--neomorphic-text)] opacity-50 font-primary">
          <span className="font-semibold">Ctrl+Enter</span> to save, <span className="font-semibold">Esc</span> to cancel
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="neo-button flex-1 px-6 py-2 text-sm font-primary uppercase tracking-wide"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="neo-button-active flex-1 px-6 py-2 text-sm font-primary uppercase tracking-wide font-semibold"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Saving...
              </span>
            ) : (
              editingEvent ? 'Update Event' : 'Create Event'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default EventCreationForm
