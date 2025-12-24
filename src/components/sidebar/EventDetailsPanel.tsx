"use client"

import React from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Target,
  FileText,
  Bell,
  Repeat,
  X,
  Edit,
  Trash2,
  ChevronDown
} from 'lucide-react'
import { UnifiedEvent, Priority, EventType } from '@/components/EventCreationModal'

interface EventDetailsPanelProps {
  event: UnifiedEvent
  onClose: () => void
  onEdit?: (event: UnifiedEvent) => void
  onDelete?: (eventId: string) => void
}

const EventDetailsPanel: React.FC<EventDetailsPanelProps> = ({
  event,
  onClose,
  onEdit,
  onDelete
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['schedule', 'details'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const formatDateTime = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'EEEE, MMMM do, yyyy \'at\' h:mm a')
    } catch (error) {
      return dateTime
    }
  }

  const formatTime = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'h:mm a')
    } catch (error) {
      return dateTime
    }
  }

  const formatDate = (dateTime: string) => {
    try {
      return format(parseISO(dateTime), 'EEEE, MMMM do, yyyy')
    } catch (error) {
      return dateTime
    }
  }

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-600'
      case 'high': return 'bg-orange-500/20 text-orange-600'
      case 'medium': return 'bg-yellow-500/20 text-yellow-700'
      case 'low': return 'bg-green-500/20 text-green-600'
      default: return 'bg-[var(--neomorphic-bg)] text-[var(--neomorphic-text)]'
    }
  }

  const getEventTypeColor = (type: EventType): string => {
    switch (type) {
      case 'event': return 'bg-blue-500/20 text-blue-600'
      case 'task': return 'bg-purple-500/20 text-purple-600'
      case 'goal': return 'bg-green-500/20 text-green-600'
      case 'milestone': return 'bg-amber-500/20 text-amber-600'
      default: return 'bg-[var(--neomorphic-bg)] text-[var(--neomorphic-text)]'
    }
  }

  const getDurationText = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  const handleDeleteClick = () => {
    // Don't show generic confirmation modal
    // Instead, directly call onDelete which will handle routing to appropriate modal
    // (recurring modal, multiday modal, or direct deletion for single events)
    if (onDelete) {
      onDelete(event.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="p-3 border-b border-[var(--neomorphic-dark-shadow)]">
        <h2 className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide mb-2">
          Event Details
        </h2>

        {/* Title and Badges */}
        <h3 className="text-base font-bold text-[var(--neomorphic-text)] font-primary mb-2">
          {event.title}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`neo-badge px-3 py-1 text-xs font-semibold font-primary uppercase tracking-wide rounded-lg ${getEventTypeColor(event.type)}`}>
            {event.type}
          </span>
          <span className={`neo-badge px-3 py-1 text-xs font-semibold font-primary uppercase tracking-wide rounded-lg ${getPriorityColor(event.priority)}`}>
            {event.priority} priority
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Description */}
        {event.description && (
          <div>
            <p className="text-[var(--neomorphic-text)] opacity-70 font-primary leading-relaxed text-sm">
              {event.description}
            </p>
          </div>
        )}

        {/* Schedule Section */}
        <div>
          <button
            onClick={() => toggleSection('schedule')}
            className="flex items-center justify-between w-full text-left mb-1"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--neomorphic-accent)]" />
              <span className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Schedule
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                expandedSections.has('schedule') ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedSections.has('schedule') && (
            <div className="neo-inset rounded-lg p-2 space-y-1">
              {event.isAllDay ? (
                <div className="flex items-center gap-3 text-[var(--neomorphic-text)] opacity-80">
                  <Clock className="h-4 w-4" />
                  <span className="font-primary text-sm">All day on {formatDate(event.startDateTime)}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[var(--neomorphic-text)] opacity-80">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-primary text-xs">Start: {formatDateTime(event.startDateTime)}</span>
                  </div>
                  {event.endDateTime && (
                    <div className="flex items-center gap-2 text-[var(--neomorphic-text)] opacity-80">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-primary text-xs">End: {formatDateTime(event.endDateTime)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[var(--neomorphic-text)] opacity-80">
                    <Target className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-primary text-xs">Duration: {getDurationText(event.duration)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Details Section (Location, Client, Participants) */}
        {(event.location || event.clientId || event.clientName || (event.participants && event.participants.length > 0)) && (
          <div>
            <button
              onClick={() => toggleSection('details')}
              className="flex items-center justify-between w-full text-left mb-1"
            >
              <span className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Details
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.has('details') ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.has('details') && (
              <div className="space-y-1.5">
                {/* Location */}
                {event.location && (
                  <div className="neo-inset rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                          Location
                        </span>
                        <p className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Information */}
                {(event.clientId || event.clientName) && (
                  <div className="neo-inset rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                          Client
                        </span>
                        <p className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs">
                          {event.clientName || `Client ID: ${event.clientId}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants */}
                {event.participants && event.participants.length > 0 && (
                  <div className="neo-inset rounded-lg p-2">
                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-[10px] font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                          Participants
                        </span>
                        <div className="space-y-0.5 mt-1">
                          {event.participants.map((participant, index) => (
                            <p key={index} className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              {participant}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div>
            <button
              onClick={() => toggleSection('notes')}
              className="flex items-center justify-between w-full text-left mb-1"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--neomorphic-accent)]" />
                <span className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Notes
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.has('notes') ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.has('notes') && (
              <div className="neo-inset rounded-lg p-2">
                <p className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs whitespace-pre-wrap leading-relaxed">
                  {event.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {event.notifications && event.notifications.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('notifications')}
              className="flex items-center justify-between w-full text-left mb-1"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--neomorphic-accent)]" />
                <span className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Notifications
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.has('notifications') ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.has('notifications') && (
              <div className="neo-inset rounded-lg p-2">
                <div className="space-y-0.5">
                  {event.notifications && Array.isArray(event.notifications) ? (
                    event.notifications.map((notification) => (
                      <p key={notification.id} className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs">
                        {notification.enabled ? '🔔' : '🔕'} {notification.value} {notification.trigger} before
                      </p>
                    ))
                  ) : (
                    <p className="text-[var(--neomorphic-text)] opacity-50 font-primary text-xs">No notifications set</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recurring Information */}
        {event.isRecurring && event.recurrence && (
          <div>
            <button
              onClick={() => toggleSection('recurrence')}
              className="flex items-center justify-between w-full text-left mb-1"
            >
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-[var(--neomorphic-accent)]" />
                <span className="text-xs font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Recurring Event
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedSections.has('recurrence') ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.has('recurrence') && (
              <div className="neo-inset rounded-lg p-2">
                <p className="text-[var(--neomorphic-text)] opacity-80 font-primary text-xs">
                  Repeats every {event.recurrence.interval} {event.recurrence.intervalType || event.recurrence.frequency}
                  {event.recurrence.endDate && ` until ${formatDate(event.recurrence.endDate)}`}
                  {event.recurrence.occurrences && ` for ${event.recurrence.occurrences} occurrences`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="flex items-center justify-end gap-2 p-3 border-t border-[var(--neomorphic-dark-shadow)]">
        {onEdit && (
          <button
            onClick={() => onEdit(event)}
            className="neo-button px-3 py-1.5 flex items-center gap-1.5 text-xs font-primary uppercase tracking-wide"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="neo-button px-3 py-1.5 flex items-center gap-1.5 text-xs font-primary uppercase tracking-wide text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default EventDetailsPanel
