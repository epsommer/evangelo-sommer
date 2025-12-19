"use client"

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  X,
  PlusCircle,
  AlertTriangle,
  GripHorizontal
} from 'lucide-react'
import { UnifiedEvent } from '@/components/EventCreationModal'
import EventDetailsPanel from '@/components/sidebar/EventDetailsPanel'
import EventCreationForm from '@/components/sidebar/EventCreationForm'
import BatchAddPanel from '@/components/sidebar/BatchAddPanel'
import { useResizableDrawer } from '@/hooks/useResizableDrawer'

interface CalendarBottomActionBarProps {
  selectedDate: Date
  currentView: 'day' | 'week' | 'month'
  onDateSelect: (date: Date) => void
  onViewChange?: (view: 'day' | 'week') => void
  onEventCreate?: (eventData: UnifiedEvent) => void
  onBatchEventCreate?: (events: UnifiedEvent[]) => Promise<void>
  events: UnifiedEvent[]
  isEventCreationMode?: boolean
  initialEventTime?: string
  initialEventDate?: Date
  initialEventDuration?: number
  initialEventEndDate?: string
  initialEventEndHour?: number
  initialEventEndMinutes?: number
  onExitEventCreation?: () => void
  selectedEvent?: UnifiedEvent | null
  onEventEdit?: (event: UnifiedEvent) => void
  onEventDelete?: (eventId: string) => void
  onExitEventDetails?: () => void
  onFormChange?: (data: { title?: string; date?: string; startTime?: string; duration?: number }) => void
  conflictCount?: number
  onShowConflicts?: () => void
}

const CalendarBottomActionBar: React.FC<CalendarBottomActionBarProps> = ({
  selectedDate,
  onEventCreate,
  onBatchEventCreate,
  events,
  isEventCreationMode = false,
  initialEventTime,
  initialEventDate,
  initialEventDuration,
  initialEventEndDate,
  initialEventEndHour,
  initialEventEndMinutes,
  onExitEventCreation,
  selectedEvent = null,
  onEventEdit,
  onEventDelete,
  onExitEventDetails,
  onFormChange,
  conflictCount = 0,
  onShowConflicts
}) => {
  const [isBatchAddMode, setIsBatchAddMode] = React.useState(false)

  // Calculate viewport-aware heights
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const minCollapsedHeight = 80 // Quick actions bar
  const maxExpandedHeight = Math.floor(viewportHeight * 0.7) // 70% of viewport

  const {
    height,
    isExpanded,
    isDragging,
    handlePointerDown,
    toggleExpanded,
    setHeight
  } = useResizableDrawer({
    minHeight: minCollapsedHeight,
    maxHeight: maxExpandedHeight,
    defaultHeight: minCollapsedHeight,
    snapThreshold: 50
  })

  // Auto-expand when entering event creation or details mode
  useEffect(() => {
    if (isEventCreationMode || selectedEvent || isBatchAddMode) {
      setHeight(maxExpandedHeight)
    }
  }, [isEventCreationMode, selectedEvent, isBatchAddMode, setHeight, maxExpandedHeight])

  const handleBatchEventSave = async (batchEvents: UnifiedEvent[]) => {
    if (onBatchEventCreate) {
      await onBatchEventCreate(batchEvents)
    }
    setIsBatchAddMode(false)
  }

  // Determine current mode
  const showEventDetails = selectedEvent !== null
  const showEventCreation = isEventCreationMode && !selectedEvent
  const showBatchAdd = isBatchAddMode
  const showQuickActions = !showEventDetails && !showEventCreation && !showBatchAdd

  return (
    <>
      {/* Spacer to prevent calendar content from being hidden behind the bar */}
      <div style={{ height: minCollapsedHeight }} className="w-full" />

      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-[var(--neomorphic-bg)] border-t-2 border-[var(--neomorphic-dark-shadow)] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-50"
        style={{ height }}
        animate={{ height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
      {/* Pull Tab / Drag Handle */}
      <div
        className={`w-full flex items-center justify-center py-2 cursor-grab active:cursor-grabbing ${
          isDragging ? 'bg-accent/10' : 'hover:bg-accent/5'
        } transition-colors`}
        onPointerDown={handlePointerDown}
        onClick={toggleExpanded}
      >
        <div className="flex flex-col items-center gap-1">
          <GripHorizontal className="h-5 w-5 text-[var(--neomorphic-text)] opacity-40" />
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--neomorphic-text)] opacity-60" />
            ) : (
              <ChevronUp className="h-4 w-4 text-[var(--neomorphic-text)] opacity-60" />
            )}
            <span className="text-xs font-primary uppercase tracking-wide text-[var(--neomorphic-text)] opacity-60">
              {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--neomorphic-text)] opacity-60" />
            ) : (
              <ChevronUp className="h-4 w-4 text-[var(--neomorphic-text)] opacity-60" />
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-[calc(100%-3rem)] overflow-hidden">
        {/* Event Details Mode */}
        {showEventDetails && (
          <div className="h-full overflow-y-auto" data-sidebar="action">
            <EventDetailsPanel
              event={selectedEvent}
              onClose={onExitEventDetails || (() => {})}
              onEdit={onEventEdit}
              onDelete={onEventDelete}
            />
          </div>
        )}

        {/* Batch Add Mode */}
        {showBatchAdd && (
          <div className="h-full overflow-hidden" data-sidebar="action">
            <BatchAddPanel
              onClose={() => setIsBatchAddMode(false)}
              onSave={handleBatchEventSave}
              initialDate={selectedDate}
            />
          </div>
        )}

        {/* Event Creation Mode */}
        {showEventCreation && (
          <div className="h-full overflow-y-auto" data-sidebar="action">
            <div className="p-4 border-b border-[var(--neomorphic-dark-shadow)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Create Event
                </h2>
                <button
                  onClick={onExitEventCreation}
                  className="neo-button p-2"
                  aria-label="Back to quick actions"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4" data-event-form>
              <EventCreationForm
                onSave={(eventData) => {
                  if (onEventCreate) {
                    onEventCreate(eventData)
                  }
                  if (onExitEventCreation) {
                    onExitEventCreation()
                  }
                }}
                onCancel={() => {
                  if (onExitEventCreation) {
                    onExitEventCreation()
                  }
                }}
                initialDate={initialEventDate || selectedDate}
                initialTime={initialEventTime}
                initialDuration={initialEventDuration}
                initialEndDate={initialEventEndDate}
                initialEndHour={initialEventEndHour}
                initialEndMinutes={initialEventEndMinutes}
                onFormChange={onFormChange}
              />
            </div>
          </div>
        )}

        {/* Quick Actions Mode (Collapsed Default) */}
        {showQuickActions && (
          <div className="h-full flex items-center justify-center px-4">
            <div className="flex items-center gap-3 w-full max-w-md">
              {/* Create Event Button */}
              <button
                onClick={() => {
                  if (onExitEventDetails) onExitEventDetails()
                  setIsBatchAddMode(false)
                  setHeight(maxExpandedHeight)
                }}
                className="flex-1 neo-button p-4 flex items-center justify-center gap-2 hover:neo-button-active transition-all"
              >
                <PlusCircle className="h-5 w-5 text-accent" />
                <span className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Create Event
                </span>
              </button>

              {/* Batch Add Button */}
              <button
                onClick={() => {
                  setIsBatchAddMode(true)
                  setHeight(maxExpandedHeight)
                }}
                className="flex-1 neo-button p-4 flex items-center justify-center gap-2 hover:neo-button-active transition-all"
              >
                <PlusCircle className="h-5 w-5 text-accent" />
                <span className="text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                  Batch Add
                </span>
              </button>

              {/* Conflict Indicator */}
              {conflictCount > 0 && (
                <button
                  onClick={onShowConflicts}
                  className="neo-button p-4 relative hover:neo-button-active transition-all"
                  title={`${conflictCount} scheduling conflict${conflictCount > 1 ? 's' : ''}`}
                >
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold">
                    {conflictCount > 9 ? '9+' : conflictCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      </motion.div>
    </>
  )
}

export default CalendarBottomActionBar
