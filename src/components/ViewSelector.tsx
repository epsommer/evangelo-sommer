"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, CalendarDays, Grid3x3, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useViewManager, TimeManagerView } from '@/contexts/ViewManagerContext'
import { format } from 'date-fns'

const VIEW_CONFIGS = {
  day: {
    label: 'Day',
    icon: Clock,
    description: 'Daily planner with timeline, agenda & objectives',
    category: 'calendar'
  },
  week: {
    label: 'Week',
    icon: CalendarDays,
    description: '7-day week view',
    category: 'calendar'
  },
  month: {
    label: 'Month',
    icon: Calendar,
    description: 'Monthly calendar',
    category: 'calendar'
  },
  year: {
    label: 'Year',
    icon: Grid3x3,
    description: 'Year overview',
    category: 'calendar'
  },
} as const

const CALENDAR_VIEWS: TimeManagerView[] = ['day', 'week', 'month', 'year']

interface ViewSelectorProps {
  showTitle?: boolean
  showNavigation?: boolean
  variant?: 'full' | 'compact'
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ 
  showTitle = true, 
  showNavigation = true, 
  variant = 'full' 
}) => {
  const { state, setCurrentView, navigateDate } = useViewManager()
  const { currentView, selectedDate } = state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDateForView = (date: Date, view: TimeManagerView) => {
    switch (view) {
      case 'day':
        return format(date, 'EEEE, MMMM do, yyyy')
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy')
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, 'MMMM yyyy')
    }
  }

  const handleViewChange = (view: TimeManagerView) => {
    setCurrentView(view)
    setIsDropdownOpen(false)
  }

  const CalendarViewDropdown = () => {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="neo-button px-3 py-2 rounded-lg flex items-center space-x-1 font-primary text-sm text-[var(--neomorphic-text)]"
          title="Calendar View"
        >
          <Calendar className="h-4 w-4" />
          <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-56 neo-card rounded-xl z-50 overflow-hidden">
            <div className="py-1">
              {CALENDAR_VIEWS.map((view) => {
                const config = VIEW_CONFIGS[view as keyof typeof VIEW_CONFIGS]
                const Icon = config.icon
                const isActive = currentView === view

                return (
                  <button
                    key={view}
                    onClick={() => handleViewChange(view)}
                    className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors font-primary ${
                      isActive
                        ? 'bg-[var(--neomorphic-accent)]/20 text-[var(--neomorphic-accent)]'
                        : 'text-[var(--neomorphic-text)] hover:bg-[var(--neomorphic-bg)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-sm uppercase tracking-wide">{config.label}</div>
                      <div className="text-xs opacity-60">{config.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const getContextualButtonLabel = (view: TimeManagerView): string => {
    switch (view) {
      case 'day':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      default:
        return 'Today'
    }
  }

  const getQuickNavigationLabels = (view: TimeManagerView): { previous: string; next: string } => {
    switch (view) {
      case 'day':
        return { previous: 'Yesterday', next: 'Tomorrow' }
      case 'week':
        return { previous: 'Last Week', next: 'Next Week' }
      case 'month':
        return { previous: 'Last Month', next: 'Next Month' }
      case 'year':
        return { previous: 'Last Year', next: 'Next Year' }
      default:
        return { previous: 'Previous', next: 'Next' }
    }
  }

  const navigateToCurrentPeriod = () => {
    navigateDate('today')
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-col space-y-2">
        {/* View selector - Calendar dropdown */}
        <div className="flex items-center space-x-2">
          <CalendarViewDropdown />
        </div>

        {/* Compact navigation */}
        {showNavigation && CALENDAR_VIEWS.includes(currentView) && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateDate('previous')}
              className="neo-button px-2 py-1 rounded-lg text-[var(--neomorphic-text)]"
              title={getQuickNavigationLabels(currentView).previous}
              aria-label={`Navigate to ${getQuickNavigationLabels(currentView).previous.toLowerCase()}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={navigateToCurrentPeriod}
              className="neo-button px-3 py-1 rounded-lg text-xs font-primary font-medium uppercase tracking-wide text-[var(--neomorphic-text)]"
              title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
              aria-label={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
            >
              {getContextualButtonLabel(currentView).replace('This ', '').replace('Today', 'Now')}
            </button>

            <button
              onClick={() => navigateDate('next')}
              className="neo-button px-2 py-1 rounded-lg text-[var(--neomorphic-text)]"
              title={getQuickNavigationLabels(currentView).next}
              aria-label={`Navigate to ${getQuickNavigationLabels(currentView).next.toLowerCase()}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="neo-card rounded-none border-x-0 border-t-0 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex-1">
          {showTitle && (
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-primary font-bold text-[var(--neomorphic-text)] uppercase tracking-wide">
                Time Manager
              </h1>
              <p className="text-sm font-primary font-light text-[var(--neomorphic-text)] opacity-60 uppercase tracking-wider">
                {formatDateForView(selectedDate, currentView)}
              </p>
            </div>
          )}

          {showNavigation && CALENDAR_VIEWS.includes(currentView) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Quick navigation with contextual labels */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate('previous')}
                  className="neo-button px-3 py-2 rounded-lg text-[var(--neomorphic-text)]"
                  title={getQuickNavigationLabels(currentView).previous}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).previous.toLowerCase()}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={navigateToCurrentPeriod}
                  className="neo-button px-4 py-2 rounded-lg font-primary font-medium text-sm uppercase tracking-wide text-[var(--neomorphic-text)]"
                  title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                  aria-label={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                >
                  {getContextualButtonLabel(currentView)}
                </button>

                <button
                  onClick={() => navigateDate('next')}
                  className="neo-button px-3 py-2 rounded-lg text-[var(--neomorphic-text)]"
                  title={getQuickNavigationLabels(currentView).next}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).next.toLowerCase()}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile view - Calendar dropdown */}
          <div className="flex md:hidden space-x-1">
            <CalendarViewDropdown />
          </div>

          {/* Desktop view - Calendar dropdown */}
          <div className="hidden md:flex items-center space-x-2">
            <CalendarViewDropdown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSelector