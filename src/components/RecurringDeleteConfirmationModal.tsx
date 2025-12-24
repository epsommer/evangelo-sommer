"use client"

import React, { useState, useMemo } from 'react'
import { format, parseISO, isBefore, isAfter, isSameDay } from 'date-fns'
import {
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Repeat,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'

export type RecurringDeleteOption =
  | 'this_only'      // Delete only this event
  | 'all_previous'   // Delete all events before this one (exclusive)
  | 'this_and_following'  // Delete this event and all following
  | 'all'            // Delete all events in the series

interface RecurringDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (option: RecurringDeleteOption) => Promise<void>
  event: UnifiedEvent | null
  relatedEvents: UnifiedEvent[]  // All events in the recurrence group
}

const RecurringDeleteConfirmationModal: React.FC<RecurringDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  event,
  relatedEvents
}) => {
  const [selectedOption, setSelectedOption] = useState<RecurringDeleteOption>('this_only')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sort related events by date
  const sortedEvents = useMemo(() => {
    return [...relatedEvents].sort((a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    )
  }, [relatedEvents])

  // Find current event index in sorted list
  const currentIndex = useMemo(() => {
    if (!event) return -1
    return sortedEvents.findIndex(e => e.id === event.id)
  }, [sortedEvents, event])

  // Calculate counts for each option
  const counts = useMemo(() => {
    if (!event || currentIndex === -1) {
      return { previous: 0, following: 0, total: sortedEvents.length }
    }
    return {
      previous: currentIndex,
      following: sortedEvents.length - currentIndex - 1,
      total: sortedEvents.length
    }
  }, [sortedEvents, currentIndex, event])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault()
        handleClose()
      } else if (e.key === 'Enter' && !isDeleting) {
        e.preventDefault()
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isDeleting, selectedOption])

  if (!event) return null

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]'
      case 'high':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]'
      case 'medium':
        return 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--foreground))] border-[hsl(var(--accent))]'
      case 'low':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]'
      default:
        return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
    }
  }

  const handleConfirm = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm(selectedOption)
      onClose()
    } catch (err) {
      console.error('Delete failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete event(s)')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      setError(null)
      setSelectedOption('this_only')
      onClose()
    }
  }

  const formatEventDate = (dateTime: string) => {
    return format(parseISO(dateTime), 'EEE, MMM d, yyyy')
  }

  const formatEventTime = (dateTime: string) => {
    return format(parseISO(dateTime), 'h:mm a')
  }

  const getOptionDescription = (option: RecurringDeleteOption): string => {
    switch (option) {
      case 'this_only':
        return 'Only this occurrence will be deleted. Other events in the series will remain.'
      case 'all_previous':
        return `${counts.previous} event${counts.previous !== 1 ? 's' : ''} before this one will be deleted.`
      case 'this_and_following':
        return `This event and ${counts.following} following event${counts.following !== 1 ? 's' : ''} will be deleted.`
      case 'all':
        return `All ${counts.total} events in this recurring series will be permanently deleted.`
    }
  }

  const options: { value: RecurringDeleteOption; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      value: 'this_only',
      label: 'Delete this event only',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      value: 'all_previous',
      label: `Delete all previous (${counts.previous})`,
      icon: <ChevronLeft className="w-5 h-5" />,
      disabled: counts.previous === 0
    },
    {
      value: 'this_and_following',
      label: `Delete this and following (${counts.following + 1})`,
      icon: <ChevronRight className="w-5 h-5" />,
      disabled: false
    },
    {
      value: 'all',
      label: `Delete all events (${counts.total})`,
      icon: <Repeat className="w-5 h-5" />
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="window-container max-w-lg max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-primary font-semibold uppercase tracking-wide text-foreground">
            <Trash2 className="w-6 h-6 text-[var(--status-danger-icon)]" />
            Delete Recurring Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Info */}
          <Card className={`border-l-4 ${getPriorityColor(event.priority)}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground font-primary text-lg truncate">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-primary">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatEventDate(event.startDateTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatEventTime(event.startDateTime)}</span>
                    </div>
                  </div>
                </div>
                <Badge className={`${getPriorityColor(event.priority)} font-semibold uppercase text-xs flex-shrink-0`}>
                  {event.priority}
                </Badge>
              </div>

              {/* Series info */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-primary">
                  <Repeat className="w-4 h-4 text-accent" />
                  <span>
                    Part of a recurring series ({counts.total} event{counts.total !== 1 ? 's' : ''})
                  </span>
                </div>
                {currentIndex >= 0 && (
                  <div className="text-xs text-muted-foreground font-primary mt-1 ml-6">
                    This is event {currentIndex + 1} of {counts.total}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deletion Options */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground font-primary uppercase tracking-wide">
              Choose what to delete
            </label>

            <div className="space-y-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled || isDeleting}
                  onClick={() => setSelectedOption(option.value)}
                  className={`
                    w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all
                    ${selectedOption === option.value
                      ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]'
                      : 'border-border bg-muted hover:border-accent'
                    }
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`
                    flex-shrink-0 p-2 rounded-lg
                    ${selectedOption === option.value
                      ? 'bg-[var(--status-danger-border)] text-white'
                      : 'bg-background text-muted-foreground'
                    }
                  `}>
                    {option.icon}
                  </div>
                  <span className={`
                    font-primary font-medium text-left
                    ${selectedOption === option.value
                      ? 'text-[var(--status-danger-text)]'
                      : 'text-foreground'
                    }
                  `}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Description of selected option */}
            <div className="bg-muted border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground font-primary">
                {getOptionDescription(selectedOption)}
              </p>
            </div>
          </div>

          {/* Warning for destructive options */}
          {(selectedOption === 'all' || selectedOption === 'all_previous' || selectedOption === 'this_and_following') && (
            <Card className="border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--status-warning-icon)] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[var(--status-warning-text)] font-primary text-sm">
                      Warning
                    </div>
                    <div className="text-sm text-[var(--status-warning-icon)] font-primary mt-1">
                      This action cannot be undone. The selected event(s) will be permanently deleted.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-[var(--status-danger-icon)] flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-[var(--status-danger-text)] font-primary text-sm">
                      Error
                    </div>
                    <div className="text-sm text-[var(--status-danger-icon)] font-primary">
                      {error}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="px-6 bg-[var(--status-danger-bg)] hover:bg-[var(--status-danger-border)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </div>
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="text-xs text-muted-foreground font-primary text-center">
            <span>Keyboard shortcuts: </span>
            <span className="font-semibold">Enter</span> to confirm, <span className="font-semibold">Esc</span> to cancel
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RecurringDeleteConfirmationModal
