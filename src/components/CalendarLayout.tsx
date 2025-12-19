"use client"

import React from 'react'
import ActionSidebar from '@/components/ActionSidebar'
import { UnifiedEvent } from '@/components/EventCreationModal'

interface CalendarLayoutProps {
  children: React.ReactNode
  selectedDate: Date
  currentView: 'day' | 'week' | 'month'
  events: UnifiedEvent[]
  onDateSelect: (date: Date) => void
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onEventCreate?: (eventData: UnifiedEvent) => void
  onBatchEventCreate?: (events: UnifiedEvent[]) => Promise<void>
  onRefreshTrigger?: () => void
  isEventCreationMode?: boolean
  initialEventTime?: string
  initialEventDate?: Date
  initialEventDuration?: number // Duration in minutes (from placeholder drag)
  initialEventEndDate?: string // End date for multi-day events (from placeholder drag)
  initialEventEndHour?: number // End hour for multi-day events (from placeholder drag)
  initialEventEndMinutes?: number // End minutes for multi-day events (from placeholder drag, 0-59)
  onExitEventCreation?: () => void
  selectedEvent?: UnifiedEvent | null
  onEventEdit?: (event: UnifiedEvent) => void
  onEventDelete?: (eventId: string) => void
  onExitEventDetails?: () => void
  onFormChange?: (data: { title?: string; date?: string; startTime?: string; duration?: number }) => void
  conflictCount?: number
  onShowConflicts?: () => void
}

/**
 * CalendarLayout - Unified layout wrapper for all calendar views
 *
 * Provides a consistent layout with:
 * - Main calendar content area (left/center)
 * - ActionSidebar (right side on desktop, hidden on mobile)
 * - Responsive behavior with mobile-first approach
 *
 * The sidebar shows different content based on mode:
 * - Default: Mini calendar, mission objectives, upcoming events
 * - Event creation mode: Inline event creation form (to be added in future prompt)
 * - Event details mode: Shows detailed information about a selected event
 */
const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  children,
  selectedDate,
  currentView,
  events,
  onDateSelect,
  onViewChange,
  onEventCreate,
  onBatchEventCreate,
  onRefreshTrigger,
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
  return (
    <div className="flex h-full">
      {/* Main Calendar Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* ActionSidebar - Desktop only */}
      <aside className="hidden lg:block w-80 border-l border-border overflow-y-auto">
        <ActionSidebar
          selectedDate={selectedDate}
          currentView={currentView}
          onDateSelect={onDateSelect}
          onViewChange={onViewChange}
          onEventCreate={onEventCreate}
          onBatchEventCreate={onBatchEventCreate}
          events={events}
          isEventCreationMode={isEventCreationMode}
          initialEventTime={initialEventTime}
          initialEventDate={initialEventDate}
          initialEventDuration={initialEventDuration}
          initialEventEndDate={initialEventEndDate}
          initialEventEndHour={initialEventEndHour}
          initialEventEndMinutes={initialEventEndMinutes}
          onExitEventCreation={onExitEventCreation}
          selectedEvent={selectedEvent}
          onEventEdit={onEventEdit}
          onEventDelete={onEventDelete}
          onExitEventDetails={onExitEventDetails}
          onFormChange={onFormChange}
          conflictCount={conflictCount}
          onShowConflicts={onShowConflicts}
        />
      </aside>
    </div>
  )
}

export default CalendarLayout
