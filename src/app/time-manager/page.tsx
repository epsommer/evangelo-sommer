"use client"

import React, { useState, Suspense } from 'react'
import CRMLayout from '@/components/CRMLayout'
import DailyPlanner from '@/components/DailyPlanner'
import ScheduleCalendar from '@/components/ScheduleCalendar'
import CalendarIntegrationManager from '@/components/CalendarIntegrationManager'
import ViewSelector from '@/components/ViewSelector'
import WeekView from '@/components/WeekView'
import YearView from '@/components/YearView'
import AgendaView from '@/components/AgendaView'
import EventCreationModal, { UnifiedEvent } from '@/components/EventCreationModal'
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents'
import { ViewManagerProvider, useViewManager } from '@/contexts/ViewManagerContext'
import { CalendarEvent } from '@/types/scheduling'

const TimeManagerContent = () => {
  const { state } = useViewManager()
  const [syncedEvents, setSyncedEvents] = useState<CalendarEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date())
  const [modalInitialTime, setModalInitialTime] = useState<string>('09:00')
  const [editingEvent, setEditingEvent] = useState<UnifiedEvent | null>(null)
  
  // Use unified events hook for global event management
  const { createEvent, updateEvent, deleteEvent } = useUnifiedEvents()
  
  // Global event handlers for all calendar views
  const handleEventCreate = async (eventData: UnifiedEvent) => {
    try {
      await createEvent(eventData)
      setShowEventModal(false)
      console.log('✅ Event created:', eventData.title)
    } catch (error) {
      console.error('❌ Error creating event:', error)
    }
  }

  const handleEventEdit = (event: UnifiedEvent) => {
    setEditingEvent(event)
    setShowEventModal(true)
  }

  const handleTimeSlotClick = (date: Date, hour?: number) => {
    setModalInitialDate(date)
    setModalInitialTime(hour ? `${hour.toString().padStart(2, '0')}:00` : '09:00')
    setEditingEvent(null)
    setShowEventModal(true)
  }

  const handleDayClick = (date: Date) => {
    setModalInitialDate(date)
    setModalInitialTime('09:00')
    setEditingEvent(null)
    setShowEventModal(true)
  }

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'day':
        return <DailyPlanner date={state.selectedDate} />
      case 'week':
        return (
          <WeekView 
            onTaskClick={(task) => console.log('Task clicked:', task)}
            onTimeSlotClick={handleTimeSlotClick}
            enableEventCreation={true}
          />
        )
      case 'month':
        return (
          <ScheduleCalendar 
            selectedDate={state.selectedDate} 
            enableEditing={true}
            onDayClick={handleDayClick}
            onEventEdit={handleEventEdit}
          />
        )
      case 'year':
        return (
          <YearView 
            onMonthClick={(date) => console.log('Month clicked:', date)}
            onDayClick={handleDayClick}
            onEventCreate={handleDayClick}
          />
        )
      case 'agenda':
        return (
          <AgendaView 
            onItemClick={(item) => console.log('Agenda item clicked:', item)}
            onAddEvent={() => {
              setModalInitialDate(state.selectedDate)
              setModalInitialTime('09:00')
              setEditingEvent(null)
              setShowEventModal(true)
            }}
            viewRange="week"
          />
        )
      case 'integrations':
        return (
          <CalendarIntegrationManager 
            onEventsSync={setSyncedEvents}
            onIntegrationChange={(integrations) => {
              console.log('Integrations updated:', integrations)
            }}
            clientId="demo-client-123"
          />
        )
      default:
        return <DailyPlanner date={state.selectedDate} />
    }
  }

  return (
    <CRMLayout>
      <div className="space-y-6">
        <ViewSelector showTitle={true} showNavigation={true} />
        {renderCurrentView()}
        
        {/* Global Event Creation Modal */}
        <EventCreationModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false)
            setEditingEvent(null)
          }}
          onSave={handleEventCreate}
          initialDate={modalInitialDate}
          initialTime={modalInitialTime}
          editingEvent={editingEvent || undefined}
        />
      </div>
    </CRMLayout>
  )
}

const TimeManagerPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">Loading Time Manager...</p>
          </div>
        </div>
      </CRMLayout>
    }>
      <ViewManagerProvider>
        <TimeManagerContent />
      </ViewManagerProvider>
    </Suspense>
  )
}

export default TimeManagerPage
