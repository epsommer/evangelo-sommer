"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarView } from '@/types/scheduling'

export type TimeManagerView = 'day' | 'week' | 'month' | 'year' | 'agenda' | 'integrations'

interface ViewManagerState {
  currentView: TimeManagerView
  selectedDate: Date
  workingHours: {
    start: string
    end: string
  }
  displaySettings: {
    showWeekends: boolean
    showAllDayEvents: boolean
    showCompletedTasks: boolean
    defaultEventDuration: number
  }
}

interface ViewManagerContextType {
  state: ViewManagerState
  setCurrentView: (view: TimeManagerView) => void
  setSelectedDate: (date: Date) => void
  navigateDate: (direction: 'previous' | 'next' | 'today') => void
  updateWorkingHours: (start: string, end: string) => void
  updateDisplaySettings: (settings: Partial<ViewManagerState['displaySettings']>) => void
  isLoading: boolean
}

const ViewManagerContext = createContext<ViewManagerContextType | undefined>(undefined)

const defaultState: ViewManagerState = {
  currentView: 'day',
  selectedDate: new Date(),
  workingHours: {
    start: '07:00',
    end: '19:00'
  },
  displaySettings: {
    showWeekends: true,
    showAllDayEvents: true,
    showCompletedTasks: true,
    defaultEventDuration: 60
  }
}

interface ViewManagerProviderProps {
  children: ReactNode
}

export const ViewManagerProvider: React.FC<ViewManagerProviderProps> = ({ children }) => {
  const [state, setState] = useState<ViewManagerState>(defaultState)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params and localStorage
  useEffect(() => {
    try {
      let initialState = { ...defaultState }
      
      // Load from localStorage first
      const savedState = localStorage.getItem('time-manager-view-state')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        initialState = {
          ...initialState,
          ...parsedState,
          selectedDate: new Date(parsedState.selectedDate || new Date())
        }
      }
      
      // Override with URL params if present
      const urlView = searchParams.get('view') as TimeManagerView
      const urlDate = searchParams.get('date')
      
      if (urlView && ['day', 'week', 'month', 'year', 'agenda', 'integrations'].includes(urlView)) {
        initialState.currentView = urlView
      }
      
      if (urlDate && !isNaN(new Date(urlDate).getTime())) {
        initialState.selectedDate = new Date(urlDate)
      }
      
      setState(initialState)
    } catch (error) {
      console.error('Error loading view manager state:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  // Save to localStorage and update URL when state changes
  useEffect(() => {
    if (!isLoading) {
      try {
        // Save to localStorage
        localStorage.setItem('time-manager-view-state', JSON.stringify({
          ...state,
          selectedDate: state.selectedDate.toISOString()
        }))
        
        // Update URL parameters without triggering navigation
        const params = new URLSearchParams()
        params.set('view', state.currentView)
        params.set('date', state.selectedDate.toISOString().split('T')[0])
        
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState(null, '', newUrl)
      } catch (error) {
        console.error('Error saving view manager state:', error)
      }
    }
  }, [state, isLoading])

  const setCurrentView = (view: TimeManagerView) => {
    setState(prev => ({ ...prev, currentView: view }))
    
    // Update URL immediately for better UX
    const params = new URLSearchParams(window.location.search)
    params.set('view', view)
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }

  const setSelectedDate = (date: Date) => {
    setState(prev => ({ ...prev, selectedDate: date }))
    
    // Update URL immediately for better UX
    const params = new URLSearchParams(window.location.search)
    params.set('date', date.toISOString().split('T')[0])
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }

  const navigateDate = (direction: 'previous' | 'next' | 'today') => {
    setState(prev => {
      let newDate = new Date(prev.selectedDate)
      
      if (direction === 'today') {
        newDate = new Date()
      } else {
        const currentView = prev.currentView
        const multiplier = direction === 'next' ? 1 : -1
        
        switch (currentView) {
          case 'day':
          case 'agenda':
            newDate.setDate(newDate.getDate() + multiplier)
            break
          case 'week':
            newDate.setDate(newDate.getDate() + (7 * multiplier))
            break
          case 'month':
            newDate.setMonth(newDate.getMonth() + multiplier)
            break
          case 'year':
            newDate.setFullYear(newDate.getFullYear() + multiplier)
            break
        }
      }
      
      return { ...prev, selectedDate: newDate }
    })
  }

  const updateWorkingHours = (start: string, end: string) => {
    setState(prev => ({
      ...prev,
      workingHours: { start, end }
    }))
  }

  const updateDisplaySettings = (settings: Partial<ViewManagerState['displaySettings']>) => {
    setState(prev => ({
      ...prev,
      displaySettings: { ...prev.displaySettings, ...settings }
    }))
  }

  const contextValue: ViewManagerContextType = {
    state,
    setCurrentView,
    setSelectedDate,
    navigateDate,
    updateWorkingHours,
    updateDisplaySettings,
    isLoading
  }

  return (
    <ViewManagerContext.Provider value={contextValue}>
      {children}
    </ViewManagerContext.Provider>
  )
}

export const useViewManager = (): ViewManagerContextType => {
  const context = useContext(ViewManagerContext)
  if (context === undefined) {
    throw new Error('useViewManager must be used within a ViewManagerProvider')
  }
  return context
}