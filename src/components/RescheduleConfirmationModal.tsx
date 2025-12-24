"use client"

import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  User, 
  MapPin, 
  AlertTriangle, 
  Mail, 
  CheckCircle, 
  X,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'

interface TimeSlot {
  date: string
  hour: number
  minute?: number
}

interface RescheduleData {
  event: UnifiedEvent
  fromSlot: TimeSlot
  toSlot: TimeSlot
  reason?: string
}

interface RescheduleConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: RescheduleData, notifyParticipants: boolean) => Promise<void>
  rescheduleData: RescheduleData | null
}

const RescheduleConfirmationModal: React.FC<RescheduleConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  rescheduleData
}) => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [notifyParticipants, setNotifyParticipants] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)


  // Handle keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !isConfirming) {
        event.preventDefault()
        handleConfirm()
      } else if (event.key === 'Escape' && !isConfirming) {
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isConfirming])

  if (!rescheduleData) return null

  const { event, fromSlot, toSlot } = rescheduleData

  // Format date and time for display
  const formatDateTime = (date: string, hour: number, minute?: number) => {
    const dateObj = new Date(date + 'T00:00:00')
    dateObj.setHours(hour, minute || 0)
    return {
      date: format(dateObj, 'EEEE, MMMM do, yyyy'),
      time: format(dateObj, 'h:mm a'),
      dateShort: format(dateObj, 'MMM d'),
      timeShort: format(dateObj, 'h:mm a')
    }
  }

  const fromDateTime = formatDateTime(fromSlot.date, fromSlot.hour, fromSlot.minute)
  const toDateTime = formatDateTime(toSlot.date, toSlot.hour, toSlot.minute)

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]'
      case 'high':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]'
      case 'medium':
        return 'bg-accent/20 text-foreground border-accent'
      case 'low':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  // Check if this is a significant time change (more than 2 hours or different day)
  const isSignificantChange = () => {
    const timeDiff = Math.abs(toSlot.hour - fromSlot.hour)
    const isDifferentDay = fromSlot.date !== toSlot.date
    return isDifferentDay || timeDiff >= 2
  }

  // Get participants count (ONLY actual participants, not clients)
  const getParticipantsInfo = () => {
    return event.participants || []
  }

  const participants = getParticipantsInfo()
  const hasParticipants = participants.length > 0

  const handleConfirm = async () => {
    if (!onConfirm) {
      setError('onConfirm function is not available')
      return
    }

    if (!rescheduleData) {
      setError('Reschedule data is not available')
      return
    }

    setIsConfirming(true)
    setError(null)

    try {
      const dataWithReason = {
        ...rescheduleData,
        reason: reason.trim() || undefined
      }

      await onConfirm(dataWithReason, notifyParticipants)

      onClose()
      setReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule event')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleClose = () => {
    if (!isConfirming) {
      onClose()
      setReason('')
      setError(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-hud-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-primary font-semibold uppercase tracking-wide text-foreground">
            <Calendar className="w-6 h-6 text-accent" />
            Confirm Reschedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Info Card */}
          <Card className={`border-l-4 ${getPriorityColor(event.priority)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-primary flex items-center justify-between">
                <span>{event.title}</span>
                <Badge className={`${getPriorityColor(event.priority)} font-semibold uppercase text-xs`}>
                  {event.priority}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {event.description && (
                <p className="text-sm text-muted-foreground font-primary">
                  {event.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-primary">
                {event.clientName && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{event.clientName}</span>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{event.duration} minutes</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Change Display */}
          <Card className="border-hud-border">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground font-primary uppercase tracking-wide mb-4">
                Schedule Change
              </h3>
              
              <div className="space-y-4">
                {/* From Time */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide mb-1">
                      Current Time
                    </div>
                    <div className="bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--status-danger-icon)]" />
                        <div>
                          <div className="font-semibold text-[var(--status-danger-text)] font-primary">
                            {fromDateTime.date}
                          </div>
                          <div className="text-sm text-[var(--status-danger-icon)] font-primary">
                            {fromDateTime.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ArrowRight className="w-6 h-6 text-accent flex-shrink-0" />
                  
                  {/* To Time */}
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide mb-1">
                      New Time
                    </div>
                    <div className="bg-[var(--status-success-bg)] border border-[var(--status-success-border)] rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[var(--status-success-icon)]" />
                        <div>
                          <div className="font-semibold text-[var(--status-success-text)] font-primary">
                            {toDateTime.date}
                          </div>
                          <div className="text-sm text-[var(--status-success-icon)] font-primary">
                            {toDateTime.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="bg-hud-background-secondary border border-hud-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-foreground font-primary uppercase text-sm">
                      Change Summary
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-primary">
                    {fromSlot.date !== toSlot.date ? (
                      <span>Moving from {fromDateTime.dateShort} to {toDateTime.dateShort}</span>
                    ) : (
                      <span>Staying on {fromDateTime.dateShort}</span>
                    )}
                    {fromSlot.hour !== toSlot.hour && (
                      <span>
                        {fromSlot.date !== toSlot.date ? ', and ' : 'Moving '}
                        from {fromDateTime.timeShort} to {toDateTime.timeShort}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Significant Change Warning */}
          {isSignificantChange() && (
            <Card className="border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--status-warning-icon)] flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-[var(--status-warning-text)] font-primary text-sm">
                      Significant Schedule Change
                    </div>
                    <div className="text-sm text-[var(--status-warning-icon)] font-primary">
                      This is a major time change. Consider providing a reason for participants.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants Notification */}
          {hasParticipants && (
            <Card className="border-hud-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-foreground font-primary uppercase tracking-wide">
                      Participant Notifications
                    </h3>
                  </div>

                  <div className="bg-hud-background-secondary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground font-primary">
                        {participants.length} participant{participants.length !== 1 ? 's' : ''} will be notified:
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifyParticipants}
                          onChange={(e) => setNotifyParticipants(e.target.checked)}
                          className="w-4 h-4 border-2 border-hud-border"
                        />
                        <span className="text-sm font-medium text-foreground font-primary">
                          Send notifications
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      {participants.map((participant: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground font-primary">
                          <User className="w-3 h-3" />
                          <span>{participant}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reason for Change */}
          <Card className="border-hud-border">
            <CardContent className="p-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground font-primary uppercase tracking-wide">
                  Reason for Reschedule {isSignificantChange() ? '(Recommended)' : '(Optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for rescheduling (will be included in notifications)"
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-[var(--hud-background-primary)] font-primary resize-none"
                  rows={3}
                />
                <div className="text-xs text-muted-foreground font-primary">
                  {hasParticipants && notifyParticipants ?
                    'This reason will be included in participant notifications.' :
                    'This will be saved with the event for your records.'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[var(--status-danger-icon)] flex-shrink-0" />
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
          <div className="flex justify-end gap-3 pt-6 border-t border-hud-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isConfirming}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleConfirm()
              }}
              disabled={isConfirming}
              className="px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-foreground border-t-transparent" />
                  {notifyParticipants && hasParticipants ? 'Rescheduling & Notifying...' : 'Rescheduling...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Reschedule
                  {notifyParticipants && hasParticipants && (
                    <>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </div>
              )}
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="text-xs text-muted-foreground font-primary text-center border-t border-hud-border pt-4">
            <span>Keyboard shortcuts: </span>
            <span className="font-semibold">Enter</span> to confirm, <span className="font-semibold">Esc</span> to cancel
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RescheduleConfirmationModal