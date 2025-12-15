"use client"

import React from 'react'
import ActionSidebar from '@/components/ActionSidebar'
import { UnifiedEvent } from '@/components/EventCreationModal'

interface CalendarLayoutProps {
  children: React.ReactNode
  selectedDate: Date
  currentView: 'day' | 'week' | 'month' | 'year'
  events: UnifiedEvent[]
  onDateSelect: (date: Date) => void
  onViewChange: (view: 'day' | 'week' | 'month' | 'year') => void
  onEventCreate?: (eventData: UnifiedEvent) => void
  onRefreshTrigger?: () => void
  isEventCreationMode?: boolean
  initialEventTime?: string
  onExitEventCreation?: () => void
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
 */
const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  children,
  selectedDate,
  currentView,
  events,
  onDateSelect,
  onViewChange,
  onEventCreate,
  onRefreshTrigger,
  isEventCreationMode = false,
  initialEventTime,
  onExitEventCreation
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
          events={events}
          isEventCreationMode={isEventCreationMode}
          initialEventTime={initialEventTime}
          onExitEventCreation={onExitEventCreation}
        />
      </aside>
    </div>
  )
}

export default CalendarLayout
