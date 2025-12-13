"use client"

import React, { useState, useCallback } from 'react'
import { format, addMinutes, parse, setHours, setMinutes } from 'date-fns'
import {
  X, Plus, Trash2, Clock, MapPin, User, Calendar,
  ChevronDown, ChevronUp, Copy, Sparkles, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent } from '@/components/EventCreationModal'

interface EventDraft {
  id: string
  title: string
  startTime: string
  duration: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  type: string
  clientName?: string
  location?: string
  description?: string
  isExpanded: boolean
  errors: string[]
}

interface MultiEventCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (events: UnifiedEvent[]) => Promise<void>
  initialDate?: Date
}

const PRIORITY_COLORS = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
}

const EVENT_TYPES = ['task', 'event', 'appointment', 'meeting', 'reminder']

const DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120]

const MultiEventCreationModal: React.FC<MultiEventCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate = new Date()
}) => {
  const [events, setEvents] = useState<EventDraft[]>([createEmptyEvent()])
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function createEmptyEvent(startTime?: string): EventDraft {
    return {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      startTime: startTime || '09:00',
      duration: 60,
      priority: 'medium',
      type: 'event',
      isExpanded: true,
      errors: []
    }
  }

  // Add new event
  const addEvent = () => {
    const lastEvent = events[events.length - 1]
    let nextTime = '09:00'

    if (lastEvent) {
      // Calculate next available time slot
      const [hours, minutes] = lastEvent.startTime.split(':').map(Number)
      const lastEnd = addMinutes(setMinutes(setHours(new Date(), hours), minutes), lastEvent.duration)
      nextTime = format(lastEnd, 'HH:mm')
    }

    setEvents([...events, createEmptyEvent(nextTime)])
  }

  // Remove event
  const removeEvent = (id: string) => {
    if (events.length > 1) {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  // Duplicate event
  const duplicateEvent = (event: EventDraft) => {
    const [hours, minutes] = event.startTime.split(':').map(Number)
    const nextTime = addMinutes(setMinutes(setHours(new Date(), hours), minutes), event.duration)

    const duplicated: EventDraft = {
      ...event,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: format(nextTime, 'HH:mm'),
      isExpanded: false
    }

    const index = events.findIndex(e => e.id === event.id)
    const newEvents = [...events]
    newEvents.splice(index + 1, 0, duplicated)
    setEvents(newEvents)
  }

  // Update event field
  const updateEvent = (id: string, field: keyof EventDraft, value: any) => {
    setEvents(events.map(e =>
      e.id === id ? { ...e, [field]: value, errors: [] } : e
    ))
  }

  // Toggle event expansion
  const toggleExpanded = (id: string) => {
    setEvents(events.map(e =>
      e.id === id ? { ...e, isExpanded: !e.isExpanded } : e
    ))
  }

  // Parse bulk text input
  const parseBulkText = () => {
    const lines = bulkText.split('\n').filter(line => line.trim())
    const parsedEvents: EventDraft[] = []
    let currentTime = '09:00'

    for (const line of lines) {
      const parsed = parseEventLine(line, currentTime)
      parsedEvents.push(parsed)

      // Calculate next time slot
      const [hours, minutes] = parsed.startTime.split(':').map(Number)
      const nextTime = addMinutes(setMinutes(setHours(new Date(), hours), minutes), parsed.duration)
      currentTime = format(nextTime, 'HH:mm')
    }

    if (parsedEvents.length > 0) {
      setEvents(parsedEvents)
      setBulkText('')
      setShowBulkInput(false)
    }
  }

  // Parse a single line of text into an event
  const parseEventLine = (text: string, defaultTime: string): EventDraft => {
    const event = createEmptyEvent(defaultTime)
    let remaining = text.trim()

    // Time detection: "9:00", "9am", "14:30", etc.
    const timeMatch = remaining.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3]?.toLowerCase()

      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0

      event.startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      remaining = remaining.replace(timeMatch[0], '').trim()
    }

    // Duration detection: "30min", "1h", "1.5hr", etc.
    const durationMatch = remaining.match(/(\d+(?:\.\d+)?)\s*(min|m|hour|hr|h)/i)
    if (durationMatch) {
      const value = parseFloat(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      event.duration = unit.startsWith('h') ? Math.round(value * 60) : Math.round(value)
      remaining = remaining.replace(durationMatch[0], '').trim()
    }

    // Priority detection
    if (/urgent|asap|critical/i.test(remaining)) {
      event.priority = 'urgent'
      remaining = remaining.replace(/\s*(urgent|asap|critical):?\s*/gi, '')
    } else if (/high|important|!/i.test(remaining)) {
      event.priority = 'high'
      remaining = remaining.replace(/\s*(high|important|!):?\s*/gi, '')
    } else if (/low/i.test(remaining)) {
      event.priority = 'low'
      remaining = remaining.replace(/\s*low:?\s*/gi, '')
    }

    // Client detection: @clientname
    const clientMatch = remaining.match(/@(\w+)/)
    if (clientMatch) {
      event.clientName = clientMatch[1]
      remaining = remaining.replace(clientMatch[0], '').trim()
    }

    // Location detection: #location or [location]
    const locationMatch = remaining.match(/#(\w+)|\[([^\]]+)\]/)
    if (locationMatch) {
      event.location = locationMatch[1] || locationMatch[2]
      remaining = remaining.replace(locationMatch[0], '').trim()
    }

    // Type detection
    for (const type of EVENT_TYPES) {
      if (remaining.toLowerCase().includes(type)) {
        event.type = type
        remaining = remaining.replace(new RegExp(type, 'gi'), '').trim()
        break
      }
    }

    // Remaining text is the title
    event.title = remaining.replace(/\s+/g, ' ').trim() || 'Untitled Event'

    return event
  }

  // Validate events
  const validateEvents = (): boolean => {
    let isValid = true
    const validated = events.map(event => {
      const errors: string[] = []

      if (!event.title.trim()) {
        errors.push('Title is required')
        isValid = false
      }

      if (!event.startTime) {
        errors.push('Start time is required')
        isValid = false
      }

      if (event.duration < 5) {
        errors.push('Duration must be at least 5 minutes')
        isValid = false
      }

      return { ...event, errors }
    })

    setEvents(validated)
    return isValid
  }

  // Convert drafts to UnifiedEvents and save
  const handleSave = async () => {
    if (!validateEvents()) return

    setIsSaving(true)
    try {
      const unifiedEvents: UnifiedEvent[] = events.map(draft => {
        const [hours, minutes] = draft.startTime.split(':').map(Number)
        const startDateTime = setMinutes(setHours(new Date(initialDate), hours), minutes)
        const endDateTime = addMinutes(startDateTime, draft.duration)

        return {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: draft.type as any,
          title: draft.title,
          description: draft.description || '',
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          duration: draft.duration,
          priority: draft.priority,
          clientName: draft.clientName,
          location: draft.location,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      await onSave(unifiedEvents)
      setEvents([createEmptyEvent()])
      onClose()
    } catch (error) {
      console.error('Error saving events:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate total time
  const totalMinutes = events.reduce((sum, e) => sum + e.duration, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Batch Add Events</h2>
            <p className="text-sm text-muted-foreground">
              {format(initialDate, 'EEEE, MMMM d, yyyy')} · {events.length} event{events.length !== 1 ? 's' : ''} · {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMinutes}m total
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Bulk Input Toggle */}
        <div className="px-4 py-2 border-b bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {showBulkInput ? 'Hide' : 'Show'} Quick Paste
            {showBulkInput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showBulkInput && (
            <div className="mt-2 space-y-2">
              <textarea
                placeholder={`Paste multiple events, one per line. Examples:
9:00 Team standup meeting 30min
10am Client call @John high 1h
2:30pm Review documents 45min #office`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full h-32 p-2 text-sm border rounded-md resize-none"
              />
              <Button size="sm" onClick={parseBulkText} disabled={!bulkText.trim()}>
                Parse Events
              </Button>
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`border rounded-lg overflow-hidden ${event.errors.length > 0 ? 'border-red-300' : ''}`}
            >
              {/* Compact Header */}
              <div
                className="flex items-center gap-2 p-2 bg-muted/30 cursor-pointer"
                onClick={() => toggleExpanded(event.id)}
              >
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[event.priority]}`} />
                <Input
                  value={event.title}
                  onChange={(e) => updateEvent(event.id, 'title', e.target.value)}
                  placeholder="Event title"
                  className="flex-1 h-7 text-sm border-0 bg-transparent focus-visible:ring-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <Input
                  type="time"
                  value={event.startTime}
                  onChange={(e) => updateEvent(event.id, 'startTime', e.target.value)}
                  className="w-24 h-7 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <select
                  value={event.duration}
                  onChange={(e) => updateEvent(event.id, 'duration', parseInt(e.target.value))}
                  className="h-7 px-2 text-sm border rounded bg-background"
                  onClick={(e) => e.stopPropagation()}
                >
                  {DEFAULT_DURATIONS.map(d => (
                    <option key={d} value={d}>{d}min</option>
                  ))}
                  <option value={180}>3hr</option>
                  <option value={240}>4hr</option>
                </select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateEvent(event)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeEvent(event.id)
                    }}
                    disabled={events.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {event.isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Errors */}
              {event.errors.length > 0 && (
                <div className="px-3 py-1 bg-red-50 text-red-600 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {event.errors.join(', ')}
                </div>
              )}

              {/* Expanded Details */}
              {event.isExpanded && (
                <div className="p-3 space-y-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Type */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                      <select
                        value={event.type}
                        onChange={(e) => updateEvent(event.id, 'type', e.target.value)}
                        className="w-full h-8 px-2 text-sm border rounded bg-background"
                      >
                        {EVENT_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                      <div className="flex gap-1">
                        {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => updateEvent(event.id, 'priority', p)}
                            className={`flex-1 h-8 text-xs rounded border ${
                              event.priority === p
                                ? `${PRIORITY_COLORS[p]} text-white`
                                : 'bg-background hover:bg-muted'
                            }`}
                          >
                            {p.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Client */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                        <User className="h-3 w-3" /> Client
                      </label>
                      <Input
                        value={event.clientName || ''}
                        onChange={(e) => updateEvent(event.id, 'clientName', e.target.value)}
                        placeholder="Client name"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location
                      </label>
                      <Input
                        value={event.location || ''}
                        onChange={(e) => updateEvent(event.id, 'location', e.target.value)}
                        placeholder="Location"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <textarea
                      value={event.description || ''}
                      onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                      placeholder="Add notes or description..."
                      className="w-full h-16 p-2 text-sm border rounded resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Event Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={addEvent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Event
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {events.filter(e => e.title.trim()).length} of {events.length} events ready
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : `Create ${events.length} Event${events.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiEventCreationModal
