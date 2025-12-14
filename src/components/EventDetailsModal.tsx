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
  Trash2
} from 'lucide-react'
import { UnifiedEvent, Priority, EventType } from '@/components/EventCreationModal'

interface EventDetailsModalProps {
  event: UnifiedEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (event: UnifiedEvent) => void
  onDelete?: (eventId: string) => void
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!event || !isOpen) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="neo-card relative w-full max-w-2xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--neomorphic-dark-shadow)]">
          <h2 className="text-xl font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
            Event Details
          </h2>
          <button
            onClick={onClose}
            className="neo-button-sm p-2 rounded-full"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-[var(--neomorphic-text)]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6 space-y-6">
          {/* Title and Badges */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-[var(--neomorphic-text)] font-primary">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`neo-badge px-3 py-1 text-xs font-semibold font-primary uppercase tracking-wide rounded-lg ${getEventTypeColor(event.type)}`}>
                {event.type}
              </span>
              <span className={`neo-badge px-3 py-1 text-xs font-semibold font-primary uppercase tracking-wide rounded-lg ${getPriorityColor(event.priority)}`}>
                {event.priority} priority
              </span>
            </div>

            {event.description && (
              <p className="text-[var(--neomorphic-text)] opacity-70 font-primary leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Schedule Section */}
          <div className="neo-inset rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-[var(--neomorphic-accent)]" />
              <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Schedule
              </span>
            </div>

            {event.isAllDay ? (
              <div className="flex items-center gap-3 text-[var(--neomorphic-text)] opacity-80">
                <Clock className="h-4 w-4" />
                <span className="font-primary">All day on {formatDate(event.startDateTime)}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[var(--neomorphic-text)] opacity-80">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="font-primary text-sm">Start: {formatDateTime(event.startDateTime)}</span>
                </div>
                {event.endDateTime && (
                  <div className="flex items-center gap-3 text-[var(--neomorphic-text)] opacity-80">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="font-primary text-sm">End: {formatDateTime(event.endDateTime)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-[var(--neomorphic-text)] opacity-80">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="font-primary text-sm">Duration: {getDurationText(event.duration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Location
                  </span>
                  <p className="text-[var(--neomorphic-text)] opacity-80 font-primary mt-1">
                    {event.location}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Client Information */}
          {(event.clientId || event.clientName) && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Client (Who it's for)
                  </span>
                  <p className="text-[var(--neomorphic-text)] opacity-80 font-primary mt-1">
                    {event.clientName || `Client ID: ${event.clientId}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Participants (Attending)
                  </span>
                  <div className="space-y-1 mt-2">
                    {event.participants.map((participant, index) => (
                      <p key={index} className="text-[var(--neomorphic-text)] opacity-80 font-primary text-sm flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {participant}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Notes
                  </span>
                  <p className="text-[var(--neomorphic-text)] opacity-80 font-primary mt-2 whitespace-pre-wrap leading-relaxed">
                    {event.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {event.notifications && event.notifications.length > 0 && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Notifications
                  </span>
                  <div className="space-y-1 mt-2">
                    {event.notifications && Array.isArray(event.notifications) ? (
                      event.notifications.map((notification) => (
                        <p key={notification.id} className="text-[var(--neomorphic-text)] opacity-80 font-primary text-sm">
                          {notification.enabled ? '🔔' : '🔕'} {notification.value} {notification.trigger} before
                        </p>
                      ))
                    ) : (
                      <p className="text-[var(--neomorphic-text)] opacity-50 font-primary text-sm">No notifications set</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recurring Information */}
          {event.isRecurring && event.recurrence && (
            <div className="neo-inset rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Repeat className="h-5 w-5 text-[var(--neomorphic-accent)] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                    Recurring Event
                  </span>
                  <p className="text-[var(--neomorphic-text)] opacity-80 font-primary mt-1">
                    Repeats every {event.recurrence.interval} {event.recurrence.intervalType || event.recurrence.frequency}
                    {event.recurrence.endDate && ` until ${formatDate(event.recurrence.endDate)}`}
                    {event.recurrence.occurrences && ` for ${event.recurrence.occurrences} occurrences`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 p-6 border-t border-[var(--neomorphic-dark-shadow)]">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="neo-button px-4 py-2 flex items-center gap-2 text-sm font-primary uppercase tracking-wide"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(event.id)}
              className="neo-button px-4 py-2 flex items-center gap-2 text-sm font-primary uppercase tracking-wide text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="neo-button-active px-6 py-2 text-sm font-primary uppercase tracking-wide font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventDetailsModal
